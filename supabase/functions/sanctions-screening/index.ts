// OFAC SDN List ingestion.
// Source: https://www.treasury.gov/ofac/downloads/sdn.xml
// Updated multiple times per week by US Treasury.
//
// We use the simpler "advanced format" SDN.XML rather than the newer
// SDN_ADVANCED.XML because it covers what we need for name screening
// without requiring full graph traversal of the OFAC schema.

import { parse as parseXML } from "https://deno.land/x/xml@2.1.3/mod.ts";
import {
  corsHeaders, finishIngestion, getListId, getServiceClient, jsonResponse,
  type ListEntry, normalizeName, removeStaleEntries, requireCronAuth,
  startIngestion, updateListMeta, upsertEntries,
} from "../_shared/ingestion.ts";

const OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml";

// OFAC SDN type codes
const SDN_TYPE_MAP: Record<string, ListEntry["entry_type"]> = {
  "Individual": "individual",
  "Entity": "entity",
  "Vessel": "vessel",
  "Aircraft": "aircraft",
};

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseDob(dobList: any): { dob: string | null; dobText: string | null } {
  const dobs = arr(dobList?.dateOfBirthItem);
  if (dobs.length === 0) return { dob: null, dobText: null };
  const first = dobs[0]?.dateOfBirth;
  if (!first) return { dob: null, dobText: null };
  // Try to parse "01 Jan 1970" or similar
  const text = String(first);
  const parsed = new Date(text);
  return {
    dob: isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10),
    dobText: text,
  };
}

function extractSdnEntry(sdn: any): ListEntry | null {
  if (!sdn?.uid) return null;
  const externalId = `OFAC-SDN-${sdn.uid}`;

  const firstName = sdn.firstName ?? "";
  const lastName = sdn.lastName ?? "";
  const primaryName = [firstName, lastName].filter(Boolean).join(" ").trim() ||
    sdn.title ?? `Unknown ${sdn.uid}`;

  // Aliases (a.k.a.s)
  const akaList = arr(sdn.akaList?.aka);
  const aliases = akaList
    .map((aka: any) => {
      const aname = [aka.firstName, aka.lastName].filter(Boolean).join(" ").trim();
      if (!aname) return null;
      return {
        name: aname,
        normalized_name: normalizeName(aname),
        type: aka.type,
      };
    })
    .filter((x: any) => x !== null);

  const { dob, dobText } = parseDob(sdn.dateOfBirthList);

  const nats = arr(sdn.nationalityList?.nationality)
    .map((n: any) => n.country)
    .filter(Boolean);

  const ids = arr(sdn.idList?.id).map((i: any) => ({
    type: i.idType ?? "unknown",
    number: i.idNumber ?? "",
    country: i.idCountry ?? null,
  }));

  const addresses = arr(sdn.addressList?.address).map((a: any) => ({
    address1: a.address1 ?? null,
    city: a.city ?? null,
    country: a.country ?? null,
    postal: a.postalCode ?? null,
  }));

  const programs = arr(sdn.programList?.program).join(", ");

  const pob = arr(sdn.placeOfBirthList?.placeOfBirthItem)
    .map((p: any) => p.placeOfBirth)
    .filter(Boolean)
    .join("; ");

  return {
    external_id: externalId,
    primary_name: primaryName,
    entry_type: SDN_TYPE_MAP[sdn.sdnType] ?? "entity",
    aliases,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pob || null,
    nationalities: nats,
    identifications: ids,
    addresses,
    program: programs || null,
    remarks: sdn.remarks ?? null,
    raw_data: sdn,
  };
}

async function runIngestion() {
  const started = Date.now();
  const supabase = getServiceClient();
  const listId = await getListId(supabase, "OFAC_SDN");
  const logId = await startIngestion(supabase, listId, OFAC_SDN_URL);

  try {
    console.log("Fetching OFAC SDN XML...");
    const res = await fetch(OFAC_SDN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    console.log(`Downloaded ${xml.length} bytes`);

    const parsed: any = parseXML(xml);
    const sdnEntries = arr(parsed?.sdnList?.sdnEntry);
    console.log(`Parsed ${sdnEntries.length} SDN entries`);

    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const sdn of sdnEntries) {
      const entry = extractSdnEntry(sdn);
      if (entry) {
        entries.push(entry);
        keepIds.add(entry.external_id);
      }
    }

    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);

    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, {
      status: "success",
      added, updated, removed,
      total: entries.length,
      started_at: started,
    });

    return { ok: true, added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OFAC SDN sync failed:", msg);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, {
      status: "failed", error: msg, started_at: started,
    });
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
    const status = msg === "Unauthorized" ? 401 : 500;
    return jsonResponse({ ok: false, error: msg }, status);
  }
});
