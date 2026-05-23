// ingestion-processor — downloads and ingests sanctions lists into screening_list_entries.
//
// Accepts POST with { list_source: "OFAC_SDN" | "OFAC_CONSOLIDATED" | "UN_CONSOLIDATED" | "EU_CONSOLIDATED" | "UK_HMT_OFSI" }
// Protected by CRON_SECRET (Authorization: Bearer <secret>) so it can be called
// from cron jobs or the ManageListsPanel "Refresh" button (which is admin-only).
//
// Supported sources:
//   OFAC_SDN            — US Treasury SDN XML
//   OFAC_CONSOLIDATED   — US Treasury Consolidated XML (aliases SDN for now)
//   UN_CONSOLIDATED     — UN Security Council XML
//   EU_CONSOLIDATED     — EU Financial Sanctions XML
//   UK_HMT_OFSI         — UK OFSI Consolidated XML

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
interface ListEntry {
  external_id: string;
  primary_name: string;
  entry_type: "individual" | "entity" | "vessel" | "aircraft";
  aliases_jsonb: Array<{ name: string; normalized_name: string; type?: string }>;
  date_of_birth: string | null;
  dob_text: string | null;
  place_of_birth: string | null;
  nationalities: string[] | null;
  identifications: Array<{ type: string; number: string; country?: string | null }>;
  addresses: Array<Record<string, string | null>>;
  program: string | null;
  remarks: string | null;
  raw_data: unknown;
  is_pep: boolean;
  pep_position: string | null;
  pep_country: string | null;
  source_updated_at: string | null;
}

// ---------------------------------------------------------------------------
// Name normalization (mirrors SQL normalize_screening_name)
// ---------------------------------------------------------------------------
const HONORIFIC_RE = /\b(mr|mrs|ms|miss|dr|prof|hon|sheikh|sir|madam|hajji|hajj|alhaji|sayyid|imam|rev|reverend|fr|father|sr|jr)\.?\b/gi;

function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(HONORIFIC_RE, "")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Supabase service-role client
// ---------------------------------------------------------------------------
function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// ---------------------------------------------------------------------------
// Helpers: arr(), buildName()
// ---------------------------------------------------------------------------
function arr<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function buildName(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).map((s) => String(s!).trim()).filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Ingestion log helpers
// ---------------------------------------------------------------------------
async function getListId(supabase: SupabaseClient, listSource: string): Promise<string> {
  const { data, error } = await supabase
    .from("screening_lists")
    .select("id")
    .eq("list_source", listSource)
    .eq("is_global", true)
    .maybeSingle();
  if (error || !data) throw new Error(`Global list not found for source ${listSource}: ${error?.message}`);
  return data.id;
}

async function startIngestion(supabase: SupabaseClient, listId: string, sourceUrl: string): Promise<string> {
  const { data, error } = await supabase
    .from("list_ingestion_log")
    .insert({ list_id: listId, source_url: sourceUrl, status: "running" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function finishIngestion(
  supabase: SupabaseClient,
  logId: string,
  result: { status: "success" | "failed"; added?: number; updated?: number; removed?: number; total?: number; error?: string; started_at: number },
) {
  await supabase.from("list_ingestion_log").update({
    status: result.status,
    completed_at: new Date().toISOString(),
    entries_added: result.added ?? 0,
    entries_updated: result.updated ?? 0,
    entries_removed: result.removed ?? 0,
    total_entries: result.total ?? 0,
    error_message: result.error ?? null,
    duration_ms: Date.now() - result.started_at,
  }).eq("id", logId);
}

async function upsertEntries(
  supabase: SupabaseClient,
  listId: string,
  entries: ListEntry[],
  batchSize = 500,
): Promise<{ added: number; updated: number }> {
  let added = 0, updated = 0;
  const { data: existing } = await supabase
    .from("screening_list_entries")
    .select("external_id")
    .eq("list_id", listId);
  const existingIds = new Set((existing ?? []).map((r: any) => r.external_id));

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize).map((e) => ({
      list_id: listId,
      full_name: e.primary_name,
      entry_type: e.entry_type,
      external_id: e.external_id,
      primary_name: e.primary_name,
      aliases_jsonb: e.aliases_jsonb,
      date_of_birth: e.date_of_birth,
      dob_text: e.dob_text,
      place_of_birth: e.place_of_birth,
      nationalities: e.nationalities,
      identifications: e.identifications,
      program: e.program,
      remarks: e.remarks,
      raw_data: e.raw_data,
      source_updated_at: e.source_updated_at,
      is_pep: e.is_pep,
      pep_position: e.pep_position,
      pep_country: e.pep_country,
    }));

    const { error } = await supabase
      .from("screening_list_entries")
      .upsert(batch, { onConflict: "list_id,external_id" });
    if (error) throw error;

    for (const e of batch) {
      if (existingIds.has(e.external_id)) updated++;
      else added++;
    }
  }
  return { added, updated };
}

async function removeStaleEntries(
  supabase: SupabaseClient,
  listId: string,
  keepExternalIds: Set<string>,
): Promise<number> {
  if (keepExternalIds.size === 0) return 0;
  const { data: existing } = await supabase
    .from("screening_list_entries")
    .select("id, external_id")
    .eq("list_id", listId);
  const toDelete = (existing ?? [])
    .filter((r: any) => !keepExternalIds.has(r.external_id))
    .map((r: any) => r.id);
  if (toDelete.length === 0) return 0;
  let removed = 0;
  for (let i = 0; i < toDelete.length; i += 200) {
    const chunk = toDelete.slice(i, i + 200);
    const { count } = await supabase.from("screening_list_entries").delete({ count: "exact" }).in("id", chunk);
    removed += count ?? chunk.length;
  }
  return removed;
}

async function updateListMeta(
  supabase: SupabaseClient,
  listId: string,
  entryCount: number,
  status: "success" | "failed",
  error?: string,
) {
  await supabase.from("screening_lists").update({
    last_synced_at: new Date().toISOString(),
    sync_status: status,
    sync_error: error ?? null,
    entry_count: entryCount,
  }).eq("id", listId);
}

// ---------------------------------------------------------------------------
// XML parser (shared instance)
// ---------------------------------------------------------------------------
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: () => false,
  parseAttributeValue: true,
});

// ---------------------------------------------------------------------------
// OFAC SDN ingestion
// ---------------------------------------------------------------------------
const OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml";
const SDN_TYPE_MAP: Record<string, ListEntry["entry_type"]> = {
  Individual: "individual", Entity: "entity", Vessel: "vessel", Aircraft: "aircraft",
};

function parseDobOfac(dobList: any): { dob: string | null; dobText: string | null } {
  const dobs = arr(dobList?.dateOfBirthItem);
  if (dobs.length === 0) return { dob: null, dobText: null };
  const text = String((dobs[0] as any)?.dateOfBirth ?? "");
  if (!text) return { dob: null, dobText: null };
  const parsed = new Date(text);
  return { dob: isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10), dobText: text };
}

function extractOfacEntry(sdn: any): ListEntry | null {
  if (!sdn?.uid) return null;
  const firstName = sdn.firstName ?? "";
  const lastName = sdn.lastName ?? "";
  const primaryName = [firstName, lastName].filter(Boolean).join(" ").trim() || (sdn.title ?? `OFAC-${sdn.uid}`);
  const akaList = arr(sdn.akaList?.aka);
  const aliases_jsonb = akaList
    .map((aka: any) => {
      const aname = [aka.firstName, aka.lastName].filter(Boolean).join(" ").trim();
      if (!aname) return null;
      return { name: aname, normalized_name: normalizeName(aname), type: aka.type };
    })
    .filter((x: any) => x !== null);
  const { dob, dobText } = parseDobOfac(sdn.dateOfBirthList);
  const nats = arr(sdn.nationalityList?.nationality).map((n: any) => n.country).filter(Boolean) as string[];
  const ids = arr(sdn.idList?.id).map((i: any) => ({ type: i.idType ?? "unknown", number: i.idNumber ?? "", country: i.idCountry ?? null }));
  const addresses = arr(sdn.addressList?.address).map((a: any) => ({ address1: a.address1 ?? null, city: a.city ?? null, country: a.country ?? null }));
  const programs = arr(sdn.programList?.program).join(", ");
  const pob = arr(sdn.placeOfBirthList?.placeOfBirthItem).map((p: any) => p.placeOfBirth).filter(Boolean).join("; ");
  return {
    external_id: `OFAC-SDN-${sdn.uid}`,
    primary_name: primaryName,
    entry_type: SDN_TYPE_MAP[sdn.sdnType] ?? "entity",
    aliases_jsonb,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pob || null,
    nationalities: nats.length ? nats : null,
    identifications: ids,
    addresses,
    program: programs || null,
    remarks: sdn.remarks ?? null,
    raw_data: sdn,
    is_pep: false,
    pep_position: null,
    pep_country: null,
    source_updated_at: null,
  };
}

async function ingestOfacSdn(supabase: SupabaseClient): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const listId = await getListId(supabase, "OFAC_SDN");
  const started = Date.now();
  const logId = await startIngestion(supabase, listId, OFAC_SDN_URL);
  try {
    console.log("Fetching OFAC SDN XML...");
    const res = await fetch(OFAC_SDN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const sdnEntries = arr(parsed?.sdnList?.sdnEntry);
    console.log(`Parsed ${sdnEntries.length} OFAC SDN entries`);
    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const sdn of sdnEntries) {
      const e = extractOfacEntry(sdn);
      if (e) { entries.push(e); keepIds.add(e.external_id); }
    }
    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, { status: "success", added, updated, removed, total: entries.length, started_at: started });
    return { added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, { status: "failed", error: msg, started_at: started });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// UN Consolidated ingestion
// ---------------------------------------------------------------------------
const UN_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml";

function parseUnDob(dobs: any[]): { dob: string | null; dobText: string | null } {
  if (dobs.length === 0) return { dob: null, dobText: null };
  const first = dobs[0] as any;
  const year = first?.YEAR ?? first?.FROM_YEAR;
  const day = first?.DAY;
  const month = first?.MONTH;
  if (year && month && day) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { dob: iso, dobText: iso };
  }
  return { dob: null, dobText: year ? `c. ${year}` : null };
}

function extractUnIndividual(ind: any): ListEntry | null {
  const dataid = ind?.DATAID;
  if (!dataid) return null;
  const primaryName = buildName([ind.FIRST_NAME, ind.SECOND_NAME, ind.THIRD_NAME, ind.FOURTH_NAME]) || `UN Individual ${dataid}`;
  const aliasList = arr(ind.INDIVIDUAL_ALIAS);
  const aliases_jsonb = aliasList
    .map((a: any) => { const aname = a.ALIAS_NAME; if (!aname) return null; return { name: String(aname), normalized_name: normalizeName(String(aname)), type: a.QUALITY }; })
    .filter((x: any) => x !== null);
  const dobs = arr(ind.INDIVIDUAL_DATE_OF_BIRTH);
  const { dob, dobText } = parseUnDob(dobs as any[]);
  const pobs = arr(ind.INDIVIDUAL_PLACE_OF_BIRTH).map((p: any) => buildName([p.CITY, p.STATE_PROVINCE, p.COUNTRY])).filter(Boolean).join("; ");
  const nats = arr((ind.NATIONALITY as any)?.VALUE).map((v: any) => String(v)).filter(Boolean) as string[];
  const docs = arr(ind.INDIVIDUAL_DOCUMENT).map((d: any) => ({ type: d.TYPE_OF_DOCUMENT ?? "unknown", number: d.NUMBER ?? "", country: d.COUNTRY_OF_ISSUE ?? null }));
  const addresses = arr(ind.INDIVIDUAL_ADDRESS).map((a: any) => ({ street: a.STREET ?? null, city: a.CITY ?? null, country: a.COUNTRY ?? null }));
  return {
    external_id: `UN-IND-${dataid}`,
    primary_name: primaryName,
    entry_type: "individual",
    aliases_jsonb,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pobs || null,
    nationalities: nats.length ? nats : null,
    identifications: docs,
    addresses,
    program: ind.UN_LIST_TYPE ?? null,
    remarks: ind.COMMENTS1 ?? null,
    raw_data: ind,
    is_pep: false,
    pep_position: null,
    pep_country: null,
    source_updated_at: ind.LISTED_ON ? String(ind.LISTED_ON) : null,
  };
}

function extractUnEntity(ent: any): ListEntry | null {
  const dataid = ent?.DATAID;
  if (!dataid) return null;
  const primaryName = ent.FIRST_NAME ?? `UN Entity ${dataid}`;
  const aliasList = arr(ent.ENTITY_ALIAS);
  const aliases_jsonb = aliasList
    .map((a: any) => { const aname = a.ALIAS_NAME; if (!aname) return null; return { name: String(aname), normalized_name: normalizeName(String(aname)), type: a.QUALITY }; })
    .filter((x: any) => x !== null);
  const addresses = arr(ent.ENTITY_ADDRESS).map((a: any) => ({ street: a.STREET ?? null, city: a.CITY ?? null, country: a.COUNTRY ?? null }));
  return {
    external_id: `UN-ENT-${dataid}`,
    primary_name: primaryName,
    entry_type: "entity",
    aliases_jsonb,
    date_of_birth: null,
    dob_text: null,
    place_of_birth: null,
    nationalities: null,
    identifications: [],
    addresses,
    program: ent.UN_LIST_TYPE ?? null,
    remarks: ent.COMMENTS1 ?? null,
    raw_data: ent,
    is_pep: false,
    pep_position: null,
    pep_country: null,
    source_updated_at: ent.LISTED_ON ? String(ent.LISTED_ON) : null,
  };
}

async function ingestUn(supabase: SupabaseClient): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const listId = await getListId(supabase, "UN_CONSOLIDATED");
  const started = Date.now();
  const logId = await startIngestion(supabase, listId, UN_URL);
  try {
    console.log("Fetching UN consolidated XML...");
    const res = await fetch(UN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const root = parsed?.CONSOLIDATED_LIST ?? parsed;
    const individuals = arr(root?.INDIVIDUALS?.INDIVIDUAL);
    const entities = arr(root?.ENTITIES?.ENTITY);
    console.log(`Parsed ${individuals.length} individuals, ${entities.length} entities`);
    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const i of individuals) { const e = extractUnIndividual(i); if (e) { entries.push(e); keepIds.add(e.external_id); } }
    for (const i of entities) { const e = extractUnEntity(i); if (e) { entries.push(e); keepIds.add(e.external_id); } }
    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, { status: "success", added, updated, removed, total: entries.length, started_at: started });
    return { added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, { status: "failed", error: msg, started_at: started });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// EU Consolidated ingestion
// ---------------------------------------------------------------------------
const EU_URL = "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content";

function parseEuDob(birth: any): { dob: string | null; dobText: string | null } {
  if (!birth) return { dob: null, dobText: null };
  const date = birth["@_birthdate"] ?? birth.birthdate ?? null;
  if (date) return { dob: String(date), dobText: String(date) };
  const year = birth["@_year"] ?? birth.year;
  return { dob: null, dobText: year ? `c. ${year}` : null };
}

function extractEuEntity(entity: any): ListEntry | null {
  const logicalId = entity["@_logicalId"] ?? entity.logicalId;
  if (!logicalId) return null;
  const subjectType = entity.subjectType?.["@_code"] ?? entity.subjectType?.code;
  const entryType: ListEntry["entry_type"] = subjectType === "P" ? "individual" : "entity";
  const nameAliases = arr(entity.nameAlias);
  if (nameAliases.length === 0) return null;
  const primaryAlias = nameAliases[0] as any;
  const primaryName = (primaryAlias["@_wholeName"] ?? primaryAlias.wholeName ??
    buildName([primaryAlias["@_firstName"], primaryAlias["@_middleName"], primaryAlias["@_lastName"]])) ||
    `EU Entry ${logicalId}`;
  const aliases_jsonb = (nameAliases.slice(1) as any[])
    .map((a: any) => {
      const aname = a["@_wholeName"] ?? a.wholeName ?? buildName([a["@_firstName"], a["@_middleName"], a["@_lastName"]]);
      if (!aname) return null;
      return { name: String(aname), normalized_name: normalizeName(String(aname)) };
    })
    .filter((x: any) => x !== null);
  const births = arr(entity.birthdate);
  const { dob, dobText } = parseEuDob((births as any[])[0]);
  const pobs = (births as any[]).map((b: any) => b["@_city"] ?? b["@_place"]).filter(Boolean).join("; ");
  const nats = arr(entity.citizenship).map((c: any) => c["@_country"] ?? c.country).filter(Boolean) as string[];
  const docs = arr(entity.identification).map((d: any) => ({ type: d["@_identificationTypeCode"] ?? "unknown", number: d["@_number"] ?? "", country: d["@_countryDescription"] ?? null }));
  const addresses = arr(entity.address).map((a: any) => ({ street: a["@_street"] ?? null, city: a["@_city"] ?? null, country: a["@_countryDescription"] ?? null }));
  const regulations = arr(entity.regulation);
  const program = (regulations as any[]).map((r: any) => r["@_programme"] ?? r["@_regulationType"]).filter(Boolean).join(", ");
  return {
    external_id: `EU-${logicalId}`,
    primary_name: primaryName,
    entry_type: entryType,
    aliases_jsonb,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pobs || null,
    nationalities: nats.length ? nats : null,
    identifications: docs,
    addresses,
    program: program || null,
    remarks: entity.remark ?? null,
    raw_data: entity,
    is_pep: false,
    pep_position: null,
    pep_country: null,
    source_updated_at: null,
  };
}

async function ingestEu(supabase: SupabaseClient): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const listId = await getListId(supabase, "EU_CONSOLIDATED");
  const started = Date.now();
  const token = Deno.env.get("EU_FSF_TOKEN");
  const url = token ? `${EU_URL}?token=${token}` : EU_URL;
  const logId = await startIngestion(supabase, listId, url);
  try {
    console.log("Fetching EU consolidated XML...");
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} — EU list may require EU_FSF_TOKEN`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const root = parsed?.export ?? parsed?.SANCTIONS ?? parsed;
    const entities = arr(root?.sanctionEntity ?? root?.entity);
    console.log(`Parsed ${entities.length} EU entities`);
    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const e of entities) { const ext = extractEuEntity(e); if (ext) { entries.push(ext); keepIds.add(ext.external_id); } }
    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, { status: "success", added, updated, removed, total: entries.length, started_at: started });
    return { added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, { status: "failed", error: msg, started_at: started });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// UK HMT/OFSI ingestion
// ---------------------------------------------------------------------------
const UK_URL = "https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.xml";

function parseUkDob(dobs: any[]): { dob: string | null; dobText: string | null } {
  if (dobs.length === 0) return { dob: null, dobText: null };
  const text = String((dobs[0] as any)?.DOB ?? dobs[0] ?? "");
  if (!text) return { dob: null, dobText: null };
  // UK uses DD/MM/YYYY
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return { dob: `${m[3]}-${m[2]}-${m[1]}`, dobText: text };
  const parsed = new Date(text);
  return { dob: isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10), dobText: text };
}

function extractUkDesignation(d: any): ListEntry | null {
  const groupId = d?.GroupID ?? d?.groupId;
  if (!groupId) return null;
  const names = arr(d.Names?.Name ?? d.names?.name) as any[];
  if (names.length === 0) return null;
  const primaryRec = names.find((n: any) => (n.NameType ?? n.nameType) === "Primary Name") ?? names[0];
  const primaryName = buildName([
    primaryRec.Name6 ?? primaryRec.title,
    primaryRec.Name1, primaryRec.Name2, primaryRec.Name3, primaryRec.Name4, primaryRec.Name5,
  ]) || `UK Designation ${groupId}`;
  const aliases_jsonb = names
    .filter((n: any) => n !== primaryRec)
    .map((n: any) => {
      const aname = buildName([n.Name1, n.Name2, n.Name3, n.Name4, n.Name5]);
      if (!aname) return null;
      return { name: aname, normalized_name: normalizeName(aname), type: n.NameType ?? n.AKAType };
    })
    .filter((x: any) => x !== null);
  const entryType: ListEntry["entry_type"] = (d.IndividualEntityShip ?? d.individualEntity) === "Individual" ? "individual" : "entity";
  const indivs = arr(d.Individuals?.Individual ?? d.individuals?.individual) as any[];
  const dobsRaw = indivs.flatMap((i: any) => arr(i.DOBs?.DOB ?? i.dobs?.dob));
  const { dob, dobText } = parseUkDob(dobsRaw as any[]);
  const pobs = indivs
    .flatMap((i: any) => arr(i.BirthDetails?.Location ?? i.birthDetails?.location))
    .map((l: any) => buildName([l.TownCity, l.Country]))
    .filter(Boolean)
    .join("; ");
  const nats = indivs
    .flatMap((i: any) => arr(i.Nationalities?.Nationality ?? i.nationalities?.nationality))
    .map((n: any) => n.NationalityCountry ?? n.nationalityCountry ?? String(n))
    .filter(Boolean) as string[];
  const addresses = arr(d.Addresses?.Address ?? d.addresses?.address).map((a: any) => ({
    line1: a.AddressLine1 ?? null, city: a.TownCity ?? null, country: a.Country ?? null,
  }));
  const regimes = arr(d.RegimeName ?? d.regimeName).join(", ");
  return {
    external_id: `UK-${groupId}`,
    primary_name: primaryName,
    entry_type: entryType,
    aliases_jsonb,
    date_of_birth: dob,
    dob_text: dobText,
    place_of_birth: pobs || null,
    nationalities: nats.length ? nats : null,
    identifications: [],
    addresses,
    program: regimes || null,
    remarks: d.OtherInformation ?? null,
    raw_data: d,
    is_pep: false,
    pep_position: null,
    pep_country: null,
    source_updated_at: d.LastUpdated ? String(d.LastUpdated) : null,
  };
}

async function ingestUk(supabase: SupabaseClient): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const listId = await getListId(supabase, "UK_HMT_OFSI");
  const started = Date.now();
  const logId = await startIngestion(supabase, listId, UK_URL);
  try {
    console.log("Fetching UK OFSI XML...");
    const res = await fetch(UK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const root = parsed?.ConsolidatedList ?? parsed?.Designations ?? parsed;
    const designations = arr(root?.Designation ?? root?.designation);
    console.log(`Parsed ${designations.length} UK designations`);
    const entries: ListEntry[] = [];
    const keepIds = new Set<string>();
    for (const d of designations) { const e = extractUkDesignation(d); if (e) { entries.push(e); keepIds.add(e.external_id); } }
    const { added, updated } = await upsertEntries(supabase, listId, entries);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, entries.length, "success");
    await finishIngestion(supabase, logId, { status: "success", added, updated, removed, total: entries.length, started_at: started });
    return { added, updated, removed, total: entries.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, { status: "failed", error: msg, started_at: started });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: accept CRON_SECRET (from cron jobs) or a valid admin JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      // Fall back to checking user JWT for admin-triggered calls from the UI
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await anonClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await anonClient.from("user_profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const listSource: string = body.list_source ?? "ALL";

    const supabase = getServiceClient();

    const results: Record<string, unknown> = {};

    if (listSource === "OFAC_SDN" || listSource === "OFAC_CONSOLIDATED" || listSource === "ALL") {
      console.log("--- OFAC SDN ---");
      results.ofac_sdn = await ingestOfacSdn(supabase).catch((e) => ({ error: e.message }));
    }

    if (listSource === "UN_CONSOLIDATED" || listSource === "ALL") {
      console.log("--- UN ---");
      results.un = await ingestUn(supabase).catch((e) => ({ error: e.message }));
    }

    if (listSource === "EU_CONSOLIDATED" || listSource === "ALL") {
      console.log("--- EU ---");
      results.eu = await ingestEu(supabase).catch((e) => ({ error: e.message }));
    }

    if (listSource === "UK_HMT_OFSI" || listSource === "ALL") {
      console.log("--- UK ---");
      results.uk = await ingestUk(supabase).catch((e) => ({ error: e.message }));
    }

    if (Object.keys(results).length === 0) {
      return new Response(JSON.stringify({ error: `Unknown list_source: ${listSource}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("ingestion-processor error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
