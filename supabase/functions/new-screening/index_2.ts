// UK HMT / OFSI Consolidated Sanctions List ingestion.
// Source: https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.xml
// Updated regularly by the Office of Financial Sanctions Implementation.

import { parse as parseXML } from "https://deno.land/x/xml@2.1.3/mod.ts";
import {
  corsHeaders, finishIngestion, getListId, getServiceClient, jsonResponse,
  type ListEntry, normalizeName, removeStaleEntries, requireCronAuth,
  startIngestion, updateListMeta, upsertEntries,
} from "../_shared/ingestion.ts";

const UK_URL = "https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.xml";

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function buildName(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).map((s) => String(s).trim()).filter(Boolean).join(" ");
}

function parseUkDob(dobs: any[]): { dob: string | null; dobText: string | null } {
  if (dobs.length === 0) return { dob: null, dobText: null };
  const first = dobs[0];
  const text = first?.DOB ?? first?.dateOfBirth ?? first;
  if (!text) return { dob: null, dobText: null };
  const str = String(text);
  // UK uses DD/MM/YYYY
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return { dob: `${m[3]}-${m[2]}-${m[1]}`, dobText: str };
  const parsed = new Date(str);
  return {
    dob: isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10),
    dobText: str,
  };
}

function extractDesignation(d: any): ListEntry | null {
  const groupId = d?.GroupID ?? d?.groupId;
  if (!groupId) return null;

  // UK list has Names (one record per name variant of same designated person)
  const names = arr(d.Names?.Name ?? d.names?.name);
  if (names.length === 0) return null;

  // Find the primary name (NameType "Primary Name") if present, otherwise first
  const primaryRec = names.find((n: any) =>
    (n.NameType ?? n.nameType) === "Primary Name"
  ) ?? names[0];

  const primaryName = buildName([
    primaryRec.Name6 ?? primaryRec.title,
    primaryRec.Name1, primaryRec.Name2, primaryRec.Name3,
    primaryRec.Name4, primaryRec.Name5,
  ]) || `UK Designation ${groupId}`;

  const aliasRecords = names.filter((n: any) => n !== primaryRec);
  const aliases = aliasRecords.map((n: any) => {
    const aname = buildName([n.Name1, n.Name2, n.Name3, n.Name4, n.Name5]);
    if (!aname) return null;
    return {
      name: aname,
      normalized_name: normalizeName(aname),
      type: n.NameType ?? n.AKAType,
    };
  }).filter((x: any) => x !== null);

  const indivOrEntity = d.IndividualEntityShip ?? d.individualEntity;
  const entryType: ListEntry["entry_type"] =
    indivOrEntity === "Individual" ? "individual" : "entity";

  const indivs = arr(d.Individuals?.Individual ?? d.individuals?.individual);
  const dobsRaw = indivs.flatMap((i: any) => arr(i.DOBs?.DOB ?? i.dobs?.dob));
  const { dob, dobText } = parseUkDob(dobsRaw);

  const pobs = indivs
    .flatMap((i: any) => arr(i.BirthDetails?.Location ?? i.birthDetails?.location))
    .map((l: any) => buildName([l.TownCity, l.Country]))
    .filter(Boolean)
    .join("; ");

  const nats = indivs
    .flatMap((i: any) => arr(i.Nationalities?.Nationality ?? i.nationalities?.nationality))
    .map((n: any) => n.NationalityCountry ?? n.nationalityCountry ?? String(n))
    .filter(Boolean);

  const addresses = arr(d.Addresses?.Address ?? d.addresses?.address).map((a: any) => ({
    line1: a.AddressLine1 ?? null,
    city: a.TownCity ?? null,
    country: a.Country ?? null,
    postal: a.PostalCode ?? null,
  }));

  const regimes = arr(d.RegimeName ?? d.regimeName).join(", ");

  return {
    external_id: `UK-${groupId}`,
    primary_name: primaryName,
    entry_type: entryType,
    aliases,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pobs || null,
    nationalities: nats,
    identifications: [],
    addresses,
    program: regimes || null,
    remarks: d.OtherInformation ?? null,
    source_updated_at: d.LastUpdated ?? null,
    raw_data: d,
  };
}

async function runIngestion() {
  const started = Date.now();
  const supabase = getServiceClient();
  const listId = await getListId(supabase, "UK_HMT_OFSI");
  const logId = await startIngestion(supabase, listId, UK_URL);

  try {
    console.log("Fetching UK OFSI list...");
    const res = await fetch(UK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    console.log(`Downloaded ${xml.length} bytes`);

    const parsed: any = parseXML(xml);
    const root = parsed?.ConsolidatedList ?? parsed?.Designations ?? parsed;
    const designations = arr(root?.Designation ?? root?.designation);
    console.log(`Parsed ${designations.length} UK designations`);

    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const d of designations) {
      const e = extractDesignation(d);
      if (e) { entries.push(e); keepIds.add(e.external_id); }
    }

    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);

    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, {
      status: "success", added, updated, removed, total: entries.length, started_at: started,
    });
    return { ok: true, added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("UK sync failed:", msg);
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
