// Shared utilities for sanctions list ingestion Edge Functions.
// Imported by sync-ofac, sync-un, sync-eu, sync-uk.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ListEntry {
  external_id: string;
  primary_name: string;
  entry_type: "individual" | "entity" | "vessel" | "aircraft";
  aliases: Array<{ name: string; normalized_name: string; type?: string }>;
  date_of_birth?: string | null;
  dob_text?: string | null;
  place_of_birth?: string | null;
  nationalities?: string[];
  identifications?: Array<{ type: string; number: string; country?: string }>;
  addresses?: Array<Record<string, string>>;
  program?: string | null;
  remarks?: string | null;
  source_updated_at?: string | null;
  raw_data: unknown;
  is_pep?: boolean;
  pep_position?: string | null;
  pep_country?: string | null;
}

// ---------------------------------------------------------------------
// Name normalization — must mirror the SQL normalize_screening_name()
// so JS-side and DB-side scoring stay consistent.
// ---------------------------------------------------------------------
const HONORIFIC_RE = /\b(mr|mrs|ms|miss|dr|prof|hon|sheikh|sir|madam|hajji|hajj|alhaji|sayyid|imam|rev|reverend|fr|father|sr|jr)\.?\b/gi;

export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(HONORIFIC_RE, "")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------
// Supabase service-role client (full DB access, server-side only)
// ---------------------------------------------------------------------
export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------
// Resolve the screening_lists row id for a given source slug.
// ---------------------------------------------------------------------
export async function getListId(
  supabase: SupabaseClient,
  list_source: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("screening_lists")
    .select("id")
    .eq("list_source", list_source)
    .eq("is_global", true)
    .single();
  if (error || !data) {
    throw new Error(`Global list not found for source ${list_source}: ${error?.message}`);
  }
  return data.id;
}

// ---------------------------------------------------------------------
// Ingestion log helpers
// ---------------------------------------------------------------------
export async function startIngestion(
  supabase: SupabaseClient,
  listId: string,
  sourceUrl: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("list_ingestion_log")
    .insert({ list_id: listId, source_url: sourceUrl, status: "running" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function finishIngestion(
  supabase: SupabaseClient,
  logId: string,
  result: {
    status: "success" | "failed";
    added?: number;
    updated?: number;
    removed?: number;
    total?: number;
    error?: string;
    started_at: number;
  },
) {
  await supabase
    .from("list_ingestion_log")
    .update({
      status: result.status,
      completed_at: new Date().toISOString(),
      entries_added: result.added ?? 0,
      entries_updated: result.updated ?? 0,
      entries_removed: result.removed ?? 0,
      total_entries: result.total ?? 0,
      error_message: result.error ?? null,
      duration_ms: Date.now() - result.started_at,
    })
    .eq("id", logId);
}

// ---------------------------------------------------------------------
// Bulk upsert entries in batches (Supabase has a row limit per request)
// ---------------------------------------------------------------------
export async function upsertEntries(
  supabase: SupabaseClient,
  listId: string,
  entries: ListEntry[],
  batchSize = 500,
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

  // Get existing external_ids so we can count adds vs updates
  const { data: existing } = await supabase
    .from("screening_list_entries")
    .select("external_id")
    .eq("list_id", listId);
  const existingIds = new Set((existing ?? []).map((r: any) => r.external_id));

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize).map((e) => ({
      list_id: listId,
      external_id: e.external_id,
      primary_name: e.primary_name,
      entry_type: e.entry_type,
      aliases: e.aliases,
      date_of_birth: e.date_of_birth,
      dob_text: e.dob_text,
      place_of_birth: e.place_of_birth,
      nationalities: e.nationalities,
      identifications: e.identifications,
      addresses: e.addresses,
      program: e.program,
      remarks: e.remarks,
      raw_data: e.raw_data,
      source_updated_at: e.source_updated_at,
      is_pep: e.is_pep ?? false,
      pep_position: e.pep_position,
      pep_country: e.pep_country,
    }));

    const { error } = await supabase
      .from("screening_list_entries")
      .upsert(batch, { onConflict: "list_id,external_id" });

    if (error) {
      console.error(`Batch upsert failed at offset ${i}:`, error);
      throw error;
    }

    for (const e of batch) {
      if (existingIds.has(e.external_id)) updated++;
      else added++;
    }
  }

  return { added, updated };
}

// ---------------------------------------------------------------------
// Remove entries no longer present in the latest source (delisting).
// ---------------------------------------------------------------------
export async function removeStaleEntries(
  supabase: SupabaseClient,
  listId: string,
  keepExternalIds: Set<string>,
): Promise<number> {
  if (keepExternalIds.size === 0) return 0;

  // Fetch all current external_ids and figure out which to delete
  const { data: existing } = await supabase
    .from("screening_list_entries")
    .select("id, external_id")
    .eq("list_id", listId);

  const toDelete = (existing ?? [])
    .filter((r: any) => !keepExternalIds.has(r.external_id))
    .map((r: any) => r.id);

  if (toDelete.length === 0) return 0;

  // delete in chunks
  let removed = 0;
  for (let i = 0; i < toDelete.length; i += 200) {
    const chunk = toDelete.slice(i, i + 200);
    const { error, count } = await supabase
      .from("screening_list_entries")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (error) {
      console.error("Delete chunk failed:", error);
      continue;
    }
    removed += count ?? chunk.length;
  }
  return removed;
}

// ---------------------------------------------------------------------
// Update list metadata after a successful sync
// ---------------------------------------------------------------------
export async function updateListMeta(
  supabase: SupabaseClient,
  listId: string,
  entryCount: number,
  status: "success" | "failed",
  error?: string,
) {
  await supabase
    .from("screening_lists")
    .update({
      last_synced_at: new Date().toISOString(),
      sync_status: status,
      sync_error: error ?? null,
      entry_count: entryCount,
    })
    .eq("id", listId);
}

// ---------------------------------------------------------------------
// CORS response helper
// ---------------------------------------------------------------------
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------
// Auth gate for cron-triggered calls
// ---------------------------------------------------------------------
export function requireCronAuth(req: Request) {
  const expected = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("authorization") ?? "";
  if (!expected || !auth.endsWith(expected)) {
    throw new Error("Unauthorized");
  }
}
