// UN Security Council Consolidated Sanctions List ingestion.
// Source: https://scsanctions.un.org/resources/xml/en/consolidated.xml
// Contains individuals and entities sanctioned by the UN.

import { parse as parseXML } from "https://deno.land/x/xml@2.1.3/mod.ts";
import {
  corsHeaders, finishIngestion, getListId, getServiceClient, jsonResponse,
  type ListEntry, normalizeName, removeStaleEntries, requireCronAuth,
  startIngestion, updateListMeta, upsertEntries,
} from "../_shared/ingestion.ts";

const UN_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml";

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function buildName(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).map((s) => String(s).trim()).filter(Boolean).join(" ");
}

function parseUnDob(dobs: any[]): { dob: string | null; dobText: string | null } {
  if (dobs.length === 0) return { dob: null, dobText: null };
  const first = dobs[0];
  if (!first) return { dob: null, dobText: null };
  const year = first.YEAR ?? first.FROM_YEAR;
  const day = first.DAY;
  const month = first.MONTH;
  if (year && month && day) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { dob: iso, dobText: iso };
  }
  return { dob: null, dobText: year ? `c. ${year}` : null };
}

function extractIndividual(ind: any): ListEntry | null {
  const dataid = ind?.DATAID;
  if (!dataid) return null;

  const primaryName = buildName([
    ind.FIRST_NAME, ind.SECOND_NAME, ind.THIRD_NAME, ind.FOURTH_NAME,
  ]) || `UN Individual ${dataid}`;

  const aliasList = arr(ind.INDIVIDUAL_ALIAS);
  const aliases = aliasList
    .map((a: any) => {
      const aname = a.ALIAS_NAME;
      if (!aname) return null;
      return {
        name: String(aname),
        normalized_name: normalizeName(String(aname)),
        type: a.QUALITY,
      };
    })
    .filter((x: any) => x !== null);

  const dobs = arr(ind.INDIVIDUAL_DATE_OF_BIRTH);
  const { dob, dobText } = parseUnDob(dobs);

  const pobs = arr(ind.INDIVIDUAL_PLACE_OF_BIRTH)
    .map((p: any) => buildName([p.CITY, p.STATE_PROVINCE, p.COUNTRY]))
    .filter(Boolean)
    .join("; ");

  const nats = arr(ind.NATIONALITY?.VALUE)
    .map((v: any) => String(v))
    .filter(Boolean);

  const docs = arr(ind.INDIVIDUAL_DOCUMENT).map((d: any) => ({
    type: d.TYPE_OF_DOCUMENT ?? "unknown",
    number: d.NUMBER ?? "",
    country: d.COUNTRY_OF_ISSUE ?? d.ISSUING_COUNTRY ?? null,
  }));

  const addresses = arr(ind.INDIVIDUAL_ADDRESS).map((a: any) => ({
    street: a.STREET ?? null,
    city: a.CITY ?? null,
    country: a.COUNTRY ?? null,
    state: a.STATE_PROVINCE ?? null,
  }));

  return {
    external_id: `UN-IND-${dataid}`,
    primary_name: primaryName,
    entry_type: "individual",
    aliases,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pobs || null,
    nationalities: nats,
    identifications: docs,
    addresses,
    program: ind.UN_LIST_TYPE ?? null,
    remarks: ind.COMMENTS1 ?? null,
    source_updated_at: ind.LISTED_ON ?? null,
    raw_data: ind,
  };
}

function extractEntity(ent: any): ListEntry | null {
  const dataid = ent?.DATAID;
  if (!dataid) return null;

  const primaryName = ent.FIRST_NAME ?? `UN Entity ${dataid}`;

  const aliasList = arr(ent.ENTITY_ALIAS);
  const aliases = aliasList
    .map((a: any) => {
      const aname = a.ALIAS_NAME;
      if (!aname) return null;
      return {
        name: String(aname),
        normalized_name: normalizeName(String(aname)),
        type: a.QUALITY,
      };
    })
    .filter((x: any) => x !== null);

  const addresses = arr(ent.ENTITY_ADDRESS).map((a: any) => ({
    street: a.STREET ?? null,
    city: a.CITY ?? null,
    country: a.COUNTRY ?? null,
  }));

  return {
    external_id: `UN-ENT-${dataid}`,
    primary_name: primaryName,
    entry_type: "entity",
    aliases,
    addresses,
    program: ent.UN_LIST_TYPE ?? null,
    remarks: ent.COMMENTS1 ?? null,
    source_updated_at: ent.LISTED_ON ?? null,
    raw_data: ent,
  };
}

async function runIngestion() {
  const started = Date.now();
  const supabase = getServiceClient();
  const listId = await getListId(supabase, "UN_CONSOLIDATED");
  const logId = await startIngestion(supabase, listId, UN_URL);

  try {
    console.log("Fetching UN consolidated list...");
    const res = await fetch(UN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    console.log(`Downloaded ${xml.length} bytes`);

    const parsed: any = parseXML(xml);
    const root = parsed?.CONSOLIDATED_LIST ?? parsed;

    const individuals = arr(root?.INDIVIDUALS?.INDIVIDUAL);
    const entities = arr(root?.ENTITIES?.ENTITY);
    console.log(`Parsed ${individuals.length} individuals, ${entities.length} entities`);

    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();

    for (const i of individuals) {
      const e = extractIndividual(i);
      if (e) { entries.push(e); keepIds.add(e.external_id); }
    }
    for (const e of entities) {
      const ent = extractEntity(e);
      if (ent) { entries.push(ent); keepIds.add(ent.external_id); }
    }

    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);

    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, {
      status: "success", added, updated, removed,
      total: entries.length, started_at: started,
    });
    return { ok: true, added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("UN sync failed:", msg);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, { status: "failed", error: msg, started_at: started });
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    requireCronAuth(req);
    const result = await runIngestion();
    return jsonResponse(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: msg }, msg === "Unauthorized" ? 401 : 500);
  }
});
