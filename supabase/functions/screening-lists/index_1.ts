// EU Consolidated Financial Sanctions List ingestion.
// Source: https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content
// NOTE: Some EU endpoints require token-based access; a token must be set
// in the EU_FSF_TOKEN env var. The format varies and you may need to register
// at https://webgate.ec.europa.eu/europeaid/online-services/index.cfm for production access.

import { parse as parseXML } from "https://deno.land/x/xml@2.1.3/mod.ts";
import {
  corsHeaders, finishIngestion, getListId, getServiceClient, jsonResponse,
  type ListEntry, normalizeName, removeStaleEntries, requireCronAuth,
  startIngestion, updateListMeta, upsertEntries,
} from "../_shared/ingestion.ts";

const EU_URL_BASE = "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content";

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function getEuUrl(): string {
  const token = Deno.env.get("EU_FSF_TOKEN");
  return token ? `${EU_URL_BASE}?token=${token}` : EU_URL_BASE;
}

function parseEuDob(birth: any): { dob: string | null; dobText: string | null } {
  if (!birth) return { dob: null, dobText: null };
  const date = birth["@birthdate"] ?? birth.birthdate ?? null;
  if (date) return { dob: String(date), dobText: String(date) };
  const year = birth["@year"] ?? birth.year;
  return { dob: null, dobText: year ? `c. ${year}` : null };
}

function extractEntity(entity: any): ListEntry | null {
  const logicalId = entity["@logicalId"] ?? entity.logicalId;
  if (!logicalId) return null;

  const subjectType = entity.subjectType?.["@code"] ?? entity.subjectType?.code;
  const entryType: ListEntry["entry_type"] = subjectType === "P" ? "individual" : "entity";

  const nameAliases = arr(entity.nameAlias);
  if (nameAliases.length === 0) return null;

  // Pick the first name as primary, rest as aliases
  const primaryAlias = nameAliases[0];
  const primaryName = primaryAlias["@wholeName"] ?? primaryAlias.wholeName ??
    [primaryAlias["@firstName"], primaryAlias["@middleName"], primaryAlias["@lastName"]]
      .filter(Boolean).join(" ") ||
    `EU Entry ${logicalId}`;

  const aliases = nameAliases.slice(1).map((a: any) => {
    const aname = a["@wholeName"] ?? a.wholeName ??
      [a["@firstName"], a["@middleName"], a["@lastName"]].filter(Boolean).join(" ");
    if (!aname) return null;
    return {
      name: String(aname),
      normalized_name: normalizeName(String(aname)),
    };
  }).filter((x: any) => x !== null);

  const births = arr(entity.birthdate);
  const { dob, dobText } = parseEuDob(births[0]);

  const pobs = arr(entity.birthdate)
    .map((b: any) => b["@city"] ?? b["@place"])
    .filter(Boolean)
    .join("; ");

  const nats = arr(entity.citizenship)
    .map((c: any) => c["@country"] ?? c.country)
    .filter(Boolean);

  const docs = arr(entity.identification).map((d: any) => ({
    type: d["@identificationTypeCode"] ?? "unknown",
    number: d["@number"] ?? "",
    country: d["@countryDescription"] ?? null,
  }));

  const addresses = arr(entity.address).map((a: any) => ({
    street: a["@street"] ?? null,
    city: a["@city"] ?? null,
    country: a["@countryDescription"] ?? null,
  }));

  const regulations = arr(entity.regulation);
  const program = regulations
    .map((r: any) => r["@programme"] ?? r["@regulationType"])
    .filter(Boolean)
    .join(", ");

  return {
    external_id: `EU-${logicalId}`,
    primary_name: primaryName,
    entry_type: entryType,
    aliases,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pobs || null,
    nationalities: nats,
    identifications: docs,
    addresses,
    program: program || null,
    remarks: entity.remark ?? null,
    raw_data: entity,
  };
}

async function runIngestion() {
  const started = Date.now();
  const supabase = getServiceClient();
  const listId = await getListId(supabase, "EU_CONSOLIDATED");
  const url = getEuUrl();
  const logId = await startIngestion(supabase, listId, url);

  try {
    console.log("Fetching EU consolidated list...");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} — EU list may require token (set EU_FSF_TOKEN)`);
    const xml = await res.text();
    console.log(`Downloaded ${xml.length} bytes`);

    const parsed: any = parseXML(xml);
    const root = parsed?.export ?? parsed?.SANCTIONS ?? parsed;
    const entities = arr(root?.sanctionEntity ?? root?.entity);
    console.log(`Parsed ${entities.length} EU sanction entities`);

    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const e of entities) {
      const ext = extractEntity(e);
      if (ext) { entries.push(ext); keepIds.add(ext.external_id); }
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
    console.error("EU sync failed:", msg);
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
