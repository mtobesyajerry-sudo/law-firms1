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

// Sanitize potentially malformed timestamps (e.g. "2015-07-01-04:00") to ISO or null
function sanitizeTimestamp(s: string | null | undefined): string | null {
  if (!s) return null;
  // Already valid ISO-like date — reject year 0000 or 00 month/day
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, mo, d] = isoMatch;
    if (y === "0000" || mo === "00" || d === "00") return null;
    return `${y}-${mo}-${d}`;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  if (year <= 0 || year > 9999) return null;
  return d.toISOString().slice(0, 10);
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

async function upsertBatch(
  supabase: SupabaseClient,
  listId: string,
  entries: ListEntry[],
): Promise<number> {
  const batch = entries.map((e) => ({
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
    // raw_data intentionally omitted — too large, causes memory limit
    source_updated_at: e.source_updated_at,
    is_pep: e.is_pep,
    pep_position: e.pep_position,
    pep_country: e.pep_country,
  }));
  const { error } = await supabase
    .from("screening_list_entries")
    .upsert(batch, { onConflict: "list_id,external_id" });
  if (error) throw error;
  return batch.length;
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
// OFAC SDN ingestion — uses the SDN CSV (smaller than XML, ~2MB vs ~20MB)
// ---------------------------------------------------------------------------
const OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";
const SDN_TYPE_MAP: Record<string, ListEntry["entry_type"]> = {
  Individual: "individual", Entity: "entity", Vessel: "vessel", Aircraft: "aircraft",
};

// OFAC SDN CSV columns (0-indexed):
// 0: ent_num, 1: SDN_Name, 2: SDN_Type, 3: Program, 4: Title, 5: Call_Sign,
// 6: Vess_type, 7: Tonnage, 8: GRT, 9: Vess_flag, 10: Vess_owner, 11: Remarks
function parseOfacCsvLine(line: string): string[] {
  const cols: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
    else { cur += c; }
  }
  cols.push(cur.trim());
  return cols;
}

async function ingestOfacSdn(supabase: SupabaseClient): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const listId = await getListId(supabase, "OFAC_SDN");
  const started = Date.now();
  const logId = await startIngestion(supabase, listId, OFAC_SDN_URL);
  try {
    console.log("Fetching OFAC SDN CSV...");
    const res = await fetch(OFAC_SDN_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const lines = csv.split("\n").filter((l) => l.trim());
    console.log(`Parsed ${lines.length} OFAC SDN lines`);
    let total = 0;
    const keepIds = new Set<string>();
    const BATCH = 50;
    let batch: ListEntry[] = [];
    for (const line of lines) {
      const cols = parseOfacCsvLine(line);
      const uid = cols[0]?.replace(/"/g, "").trim();
      if (!uid || isNaN(Number(uid))) continue; // skip header/non-numeric IDs
      const name = cols[1]?.replace(/"/g, "").trim() || `OFAC-${uid}`;
      const sdnType = cols[2]?.replace(/"/g, "").trim() || "Entity";
      const program = cols[3]?.replace(/"/g, "").trim() || null;
      const remarks = cols[11]?.replace(/"/g, "").trim() || null;
      const entry: ListEntry = {
        external_id: `OFAC-SDN-${uid}`,
        primary_name: name,
        entry_type: SDN_TYPE_MAP[sdnType] ?? "entity",
        aliases_jsonb: [],
        date_of_birth: null,
        dob_text: null,
        place_of_birth: null,
        nationalities: null,
        identifications: [],
        addresses: [],
        program,
        remarks,
        raw_data: null,
        is_pep: false,
        pep_position: null,
        pep_country: null,
        source_updated_at: null,
      };
      keepIds.add(entry.external_id);
      batch.push(entry);
      if (batch.length >= BATCH) {
        total += await upsertBatch(supabase, listId, batch);
        batch = [];
      }
    }
    if (batch.length > 0) total += await upsertBatch(supabase, listId, batch);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, total, "success");
    await finishIngestion(supabase, logId, { status: "success", added: total, updated: 0, removed, total, started_at: started });
    return { added: total, updated: 0, removed, total };
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
    source_updated_at: ind.LISTED_ON ? sanitizeTimestamp(String(ind.LISTED_ON)) : null,
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
    source_updated_at: ent.LISTED_ON ? sanitizeTimestamp(String(ent.LISTED_ON)) : null,
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
    let total = 0;
    const keepIds = new Set<string>();
    const BATCH = 50;
    let batch: ListEntry[] = [];
    for (const raw of [...individuals, ...entities]) {
      const e = individuals.includes(raw) ? extractUnIndividual(raw) : extractUnEntity(raw);
      if (!e) continue;
      keepIds.add(e.external_id);
      batch.push(e);
      if (batch.length >= BATCH) {
        total += await upsertBatch(supabase, listId, batch);
        batch = [];
      }
    }
    if (batch.length > 0) total += await upsertBatch(supabase, listId, batch);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, total, "success");
    await finishIngestion(supabase, logId, { status: "success", added: total, updated: 0, removed, total, started_at: started });
    return { added: total, updated: 0, removed, total };
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
// EU FSF consolidated list. Token passed as Authorization header (preferred) or query param.
const EU_URL = "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content";
const EU_URL_V2 = "https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList/content";

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
  const logId = await startIngestion(supabase, listId, EU_URL);
  try {
    console.log("Fetching EU consolidated XML...");
    const headers: Record<string, string> = { Accept: "application/xml,text/xml,*/*" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Try primary URL first; fall back to alternate path if it fails
    let res = await fetch(EU_URL, { headers });
    if (!res.ok && token) {
      // Some versions expect token as query param
      res = await fetch(`${EU_URL}?token=${token}`, { headers: { Accept: "application/xml,text/xml,*/*" } });
    }
    if (!res.ok) {
      // Try alternate v2 endpoint
      res = await fetch(EU_URL_V2, { headers });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} — EU FSF endpoint unavailable`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml);
    const root = parsed?.export ?? parsed?.SANCTIONS ?? parsed;
    const entities = arr(root?.sanctionEntity ?? root?.entity);
    console.log(`Parsed ${entities.length} EU entities`);
    let total = 0;
    const keepIds = new Set<string>();
    const BATCH = 50;
    let batch: ListEntry[] = [];
    for (const e of entities) {
      const ext = extractEuEntity(e);
      if (!ext) continue;
      keepIds.add(ext.external_id);
      batch.push(ext);
      if (batch.length >= BATCH) {
        total += await upsertBatch(supabase, listId, batch);
        batch = [];
      }
    }
    if (batch.length > 0) total += await upsertBatch(supabase, listId, batch);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, total, "success");
    await finishIngestion(supabase, logId, { status: "success", added: total, updated: 0, removed, total, started_at: started });
    return { added: total, updated: 0, removed, total };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateListMeta(supabase, listId, 0, "failed", msg);
    await finishIngestion(supabase, logId, { status: "failed", error: msg, started_at: started });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// UK HMT/OFSI ingestion — uses CSV format
// ---------------------------------------------------------------------------
// CSV column layout (actual header names, 0-indexed):
//   0:Name 6 (surname/entity name), 1:Name 1 (first name), 2:Name 2, 3:Name 3,
//   4:Name 4, 5:Name 5, 6:Title, 7:Name Non-Latin Script, 8:Non-Latin Script Type,
//   9:Non-Latin Script Language, 10:DOB, 11:Town of Birth, 12:Country of Birth,
//   13:Nationality, 14:Passport Number, 15:Passport Details,
//   16:National Identification Number, 17:National Identification Details,
//   18:Position, 19:Address 1, 20:Address 2, 21:Address 3, 22:Address 4,
//   23:Address 5, 24:Address 6, 25:Post/Zip Code, 26:Country,
//   27:Other Information, 28:Group Type, 29:Alias Type, 30:Alias Quality,
//   31:Regime, 32:Listed On, 33:UK Sanctions List Date Designated,
//   34:Last Updated, 35:Group ID
// Each designee has multiple rows (one per name/alias) sharing the same Group ID.
// The "Alias Type" column distinguishes "Primary name variation" from non-Latin aliases.
const UK_URL = "https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.csv";

// UK DOB is DD/MM/YYYY; unknown day/month/year are encoded as 00 or 0000
function parseUkDobText(text: string): { dob: string | null; dobText: string | null } {
  if (!text?.trim()) return { dob: null, dobText: null };
  const t = text.trim();
  // DD/MM/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    // Any zero component or year 0000 = partial/unknown — text only
    if (dd === "00" || mm === "00" || yyyy === "0000") {
      return { dob: null, dobText: t };
    }
    const iso = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    return { dob: iso, dobText: t };
  }
  // YYYY only or partial
  if (/^\d{4}$/.test(t)) return { dob: null, dobText: t };
  const d = new Date(t);
  if (isNaN(d.getTime())) return { dob: null, dobText: t };
  const year = d.getFullYear();
  if (year <= 0 || year > 9999) return { dob: null, dobText: t };
  return { dob: d.toISOString().slice(0, 10), dobText: t };
}

// Build a full name from UK CSV cols: Name 6 (surname) + Name 1..5 (given names)
// For individuals: "PUTIN, Vladimir Vladimirovich" style → store as "Vladimir Vladimirovich PUTIN"
// For entities: Name 6 contains the full entity name
function buildUkName(cols: string[], groupType: string): string {
  const surname = cols[0]?.trim() ?? "";
  const given = [cols[1], cols[2], cols[3], cols[4], cols[5]]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" ");
  if (groupType.toLowerCase() === "individual") {
    // Individual: given names first, then surname
    return given ? `${given} ${surname}` : surname;
  }
  // Entity: Name 6 is the full name
  return surname || given;
}

async function ingestUk(supabase: SupabaseClient): Promise<{ added: number; updated: number; removed: number; total: number }> {
  const listId = await getListId(supabase, "UK_HMT_OFSI");
  const started = Date.now();
  const logId = await startIngestion(supabase, listId, UK_URL);
  try {
    console.log("Fetching UK OFSI CSV...");
    const res = await fetch(UK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    const lines = csv.split("\n");

    // Line 0 is "Last Updated,<date>" — skip it.
    // Line 1 is the actual header row.
    // Column indices are fixed per the 2022format spec above.
    const COL_NAME6     = 0;   // surname / entity name
    const COL_NAME1     = 1;   // first given name
    const COL_NAME2     = 2;
    const COL_NAME3     = 3;
    const COL_NAME4     = 4;
    const COL_NAME5     = 5;
    const COL_NON_LATIN = 7;   // Name Non-Latin Script
    const COL_DOB       = 10;
    const COL_TOWN_BIRTH = 11;
    const COL_NATIONALITY = 13;
    const COL_PASSPORT_NO = 14;
    const COL_NATID_NO  = 16;
    const COL_POSITION  = 18;
    const COL_REMARKS   = 27;  // Other Information
    const COL_GROUP_TYPE = 28; // "Individual" or "Entity"
    const COL_ALIAS_TYPE = 29; // "Primary name variation", "Non-Latin Script", etc.
    const COL_REGIME    = 31;
    const COL_LISTED_ON = 32;
    const COL_GROUP_ID  = 35;  // unique designee ID

    // Group all rows by Group ID (skip first 2 lines: metadata + header)
    const groups = new Map<string, string[][]>();
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseOfacCsvLine(line);
      const gid = cols[COL_GROUP_ID]?.replace(/"/g, "").trim();
      if (!gid || isNaN(Number(gid))) continue;
      if (!groups.has(gid)) groups.set(gid, []);
      groups.get(gid)!.push(cols.map((c) => c.replace(/"/g, "").trim()));
    }

    let total = 0;
    const keepIds = new Set<string>();
    const BATCH = 50;
    let batch: ListEntry[] = [];

    for (const [gid, rows] of groups) {
      if (rows.length === 0) continue;

      // Use first row for all metadata (DOB, nationality, regime etc. repeat on every row)
      const meta = rows[0];
      const groupType = meta[COL_GROUP_TYPE] ?? "Entity";
      const entryType: ListEntry["entry_type"] =
        groupType.toLowerCase() === "individual" ? "individual" : "entity";

      // Primary name: find rows with alias type "Primary name variation" or take first row
      const primaryRows = rows.filter((r) =>
        r[COL_ALIAS_TYPE]?.toLowerCase().includes("primary")
      );
      const primaryRow = primaryRows[0] ?? rows[0];
      const primaryName = buildUkName(primaryRow, groupType) || `UK-${gid}`;

      // Aliases: all other rows with a Latin-script name (skip pure non-Latin rows if primary is Latin)
      const aliases_jsonb = rows
        .filter((r) => r !== primaryRow)
        .map((r) => {
          const nonLatin = r[COL_NON_LATIN];
          // Prefer Latin name; fall back to non-Latin if that's all there is
          const aname = buildUkName(r, groupType) || nonLatin || "";
          if (!aname || aname === primaryName) return null;
          const aliasType = r[COL_ALIAS_TYPE] ?? "";
          return { name: aname, normalized_name: normalizeName(aname), type: aliasType };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const { dob, dobText } = parseUkDobText(meta[COL_DOB]);
      const nationality = meta[COL_NATIONALITY];
      const placeOfBirth = [meta[COL_TOWN_BIRTH]].filter(Boolean).join(", ") || null;
      const position = meta[COL_POSITION];
      const regime = meta[COL_REGIME];
      const listedOn = meta[COL_LISTED_ON];

      // Identifications: passport + national ID
      const identifications: ListEntry["identifications"] = [];
      if (meta[COL_PASSPORT_NO]) {
        identifications.push({ type: "passport", number: meta[COL_PASSPORT_NO], country: null });
      }
      if (meta[COL_NATID_NO]) {
        identifications.push({ type: "national_id", number: meta[COL_NATID_NO], country: null });
      }

      const entry: ListEntry = {
        external_id: `UK-${gid}`,
        primary_name: primaryName,
        entry_type: entryType,
        aliases_jsonb,
        date_of_birth: dob,
        dob_text: dobText,
        place_of_birth: placeOfBirth,
        nationalities: nationality ? [nationality] : null,
        identifications,
        addresses: [],
        program: regime || null,
        remarks: meta[COL_REMARKS] || null,
        raw_data: null,
        is_pep: !!position,
        pep_position: position || null,
        pep_country: nationality || null,
        source_updated_at: listedOn ? sanitizeTimestamp(
          listedOn.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1")
        ) : null,
      };

      keepIds.add(entry.external_id);
      batch.push(entry);
      if (batch.length >= BATCH) {
        total += await upsertBatch(supabase, listId, batch);
        batch = [];
      }
    }

    if (batch.length > 0) total += await upsertBatch(supabase, listId, batch);
    const removed = await removeStaleEntries(supabase, listId, keepIds);
    await updateListMeta(supabase, listId, total, "success");
    await finishIngestion(supabase, logId, { status: "success", added: total, updated: 0, removed, total, started_at: started });
    return { added: total, updated: 0, removed, total };
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
    // Auth: accept CRON_SECRET env var, Vault-stored cron_secret, service role key,
    // or a valid admin JWT. verify_jwt=false at the gateway; we enforce auth here.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const cronSecretEnv = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Fast path: env var or service role key matches without a DB round-trip.
    let isTrusted = (cronSecretEnv && token === cronSecretEnv) ||
                    (serviceRoleKey && token === serviceRoleKey);

    // Slow path: if neither env secret matched, check the Vault-stored cron_secret
    // via the get_cron_secret() DB function. This is how pg_cron jobs authenticate.
    if (!isTrusted && token.length > 0) {
      const svc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data: vaultSecret } = await svc.rpc("get_cron_secret");
      if (vaultSecret && token === vaultSecret) isTrusted = true;
    }

    if (!isTrusted) {
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
      if (!["admin", "compliance_officer"].includes(profile?.role)) {
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
