// screeningService.js
// Live implementation: invokes the screen-client Edge Function (which does
// the DB fuzzy match + optional OpenSanctions premium call) and exposes
// the review/clear/escalate workflow.
//
// Drop-in replacement for the manual-list version that came from Bolt.
// Function signatures kept compatible with existing UI calls where possible.

import { supabase } from "../lib/supabaseClient"; // adjust to your project

// ---------------------------------------------------------------------
// 1. Run a screening — calls the Edge Function
// ---------------------------------------------------------------------
export async function runScreening({
  clientId,
  fullName,
  dateOfBirth,
  nationality,
  idNumber,
  entityType = "individual",
  usePremium = false,
  threshold = 0.70,
}) {
  if (!fullName || fullName.trim().length < 2) {
    throw new Error("Full name is required (min 2 characters)");
  }

  const { data, error } = await supabase.functions.invoke("screen-client", {
    body: {
      client_id: clientId ?? null,
      full_name: fullName.trim(),
      date_of_birth: dateOfBirth || null,
      nationality: nationality || null,
      id_number: idNumber || null,
      entity_type: entityType,
      use_premium: usePremium,
      threshold,
    },
  });

  if (error) throw error;
  return data; // { screening_id, status, match_count, highest_score, overall_risk, matches }
}

// ---------------------------------------------------------------------
// 2. Re-screen an existing kyc_client by id
// ---------------------------------------------------------------------
export async function rescreenClient(clientId, options = {}) {
  const { data: client, error } = await supabase
    .from("kyc_clients")
    .select("id, full_name, date_of_birth, nationality, id_number, entity_type")
    .eq("id", clientId)
    .single();
  if (error) throw error;
  return runScreening({
    clientId: client.id,
    fullName: client.full_name,
    dateOfBirth: client.date_of_birth,
    nationality: client.nationality,
    idNumber: client.id_number,
    entityType: client.entity_type ?? "individual",
    usePremium: options.usePremium ?? false,
  });
}

// ---------------------------------------------------------------------
// 3. Fetch screening history with counts (used by the dashboard tabs)
// ---------------------------------------------------------------------
export async function getScreeningHistory({ status, page = 1, pageSize = 25 } = {}) {
  let query = supabase
    .from("screening_results")
    .select(`
      id, screened_name, screened_dob, screened_nationality,
      match_count, highest_score, overall_risk, status, opensanctions_used,
      screened_at, screened_by,
      client_id,
      kyc_clients (id, full_name)
    `, { count: "exact" })
    .order("screened_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status === "matches") query = query.gt("match_count", 0);
  else if (status === "pending") query = query.eq("status", "pending_review");
  else if (status === "cleared") query = query.eq("status", "cleared");
  else if (status === "high_risk") query = query.in("overall_risk", ["high", "critical"]);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

// ---------------------------------------------------------------------
// 4. Dashboard summary counters
// ---------------------------------------------------------------------
export async function getDashboardCounters() {
  const { count: total } = await supabase
    .from("screening_results").select("id", { count: "exact", head: true });

  const { count: matches } = await supabase
    .from("screening_results").select("id", { count: "exact", head: true })
    .gt("match_count", 0);

  const { count: pending } = await supabase
    .from("screening_matches").select("id", { count: "exact", head: true })
    .eq("status", "pending_review");

  const { count: cleared } = await supabase
    .from("screening_results").select("id", { count: "exact", head: true })
    .eq("status", "cleared");

  const { count: highRisk } = await supabase
    .from("screening_results").select("id", { count: "exact", head: true })
    .in("overall_risk", ["high", "critical"]);

  return {
    total: total ?? 0,
    matches: matches ?? 0,
    pending: pending ?? 0,
    cleared: cleared ?? 0,
    high_risk: highRisk ?? 0,
  };
}

// ---------------------------------------------------------------------
// 5. Fetch matches for a screening + full details
// ---------------------------------------------------------------------
export async function getScreeningDetail(screeningId) {
  const { data: screening, error: e1 } = await supabase
    .from("screening_results")
    .select("*, kyc_clients(*)")
    .eq("id", screeningId)
    .single();
  if (e1) throw e1;

  const { data: matches, error: e2 } = await supabase
    .from("screening_matches")
    .select(`
      *,
      screening_list_entries (
        id, primary_name, aliases, date_of_birth, dob_text,
        nationalities, place_of_birth, identifications, addresses,
        program, remarks, is_pep, pep_position, pep_country
      )
    `)
    .eq("screening_result_id", screeningId)
    .order("match_score", { ascending: false });
  if (e2) throw e2;

  return { screening, matches: matches ?? [] };
}

// ---------------------------------------------------------------------
// 6. Review workflow — clear false positive
// ---------------------------------------------------------------------
export async function clearMatch(matchId, notes) {
  if (!notes || notes.trim().length < 10) {
    throw new Error("Notes required (min 10 chars) — regulators expect a reason.");
  }
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("screening_matches")
    .update({
      status: "cleared_false_positive",
      reviewer_id: user.id,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("screening_audit_log").insert({
    organization_id: data.organization_id,
    screening_result_id: data.screening_result_id,
    match_id: matchId,
    action: "match_cleared",
    actor_id: user.id,
    actor_email: user.email,
    details: { notes, list_source: data.list_source },
  });

  await maybeCloseScreening(data.screening_result_id);
  return data;
}

// ---------------------------------------------------------------------
// 7. Review workflow — confirm or escalate
// ---------------------------------------------------------------------
export async function confirmMatch(matchId, notes) {
  if (!notes || notes.trim().length < 10) {
    throw new Error("Notes required to confirm a sanctions match.");
  }
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("screening_matches")
    .update({
      status: "confirmed_match",
      reviewer_id: user.id,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select()
    .single();
  if (error) throw error;

  // Confirmed match — escalate the whole screening to high risk
  await supabase
    .from("screening_results")
    .update({ overall_risk: "critical", status: "match_confirmed" })
    .eq("id", data.screening_result_id);

  await supabase.from("screening_audit_log").insert({
    organization_id: data.organization_id,
    screening_result_id: data.screening_result_id,
    match_id: matchId,
    action: "match_confirmed",
    actor_id: user.id,
    actor_email: user.email,
    details: { notes, list_source: data.list_source },
  });

  return data;
}

export async function escalateMatch(matchId, escalatedToUserId, notes) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("screening_matches")
    .update({
      status: "escalated_to_mlro",
      escalated_to: escalatedToUserId,
      escalated_at: new Date().toISOString(),
      review_notes: notes,
      reviewer_id: user.id,
    })
    .eq("id", matchId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from("screening_audit_log").insert({
    organization_id: data.organization_id,
    screening_result_id: data.screening_result_id,
    match_id: matchId,
    action: "match_escalated",
    actor_id: user.id,
    actor_email: user.email,
    details: { escalated_to: escalatedToUserId, notes },
  });

  return data;
}

// Internal: if all matches resolved, mark screening as cleared
async function maybeCloseScreening(screeningId) {
  const { data: open } = await supabase
    .from("screening_matches")
    .select("id")
    .eq("screening_result_id", screeningId)
    .eq("status", "pending_review");

  if (!open || open.length === 0) {
    await supabase
      .from("screening_results")
      .update({ status: "cleared" })
      .eq("id", screeningId)
      .neq("status", "match_confirmed"); // don't override confirmed matches
  }
}

// ---------------------------------------------------------------------
// 8. Lists & ingestion status (read-only for the Manage Lists screen)
// ---------------------------------------------------------------------
export async function getLists() {
  const { data, error } = await supabase
    .from("screening_lists")
    .select("*")
    .order("is_global", { ascending: false })
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getRecentIngestionLogs(limit = 20) {
  const { data, error } = await supabase
    .from("list_ingestion_log")
    .select("*, screening_lists(name, list_source)")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------
// 9. Trigger a manual list refresh (admin only — handled by RLS / role check)
// ---------------------------------------------------------------------
export async function triggerListSync(listSource) {
  const fnMap = {
    OFAC_SDN: "sync-ofac",
    UN_CONSOLIDATED: "sync-un",
    EU_CONSOLIDATED: "sync-eu",
    UK_HMT_OFSI: "sync-uk",
  };
  const fnName = fnMap[listSource];
  if (!fnName) throw new Error(`Unknown list source: ${listSource}`);
  const { data, error } = await supabase.functions.invoke(fnName);
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// 10. Continuous screening queue
// ---------------------------------------------------------------------
export async function enqueueAllClientsForRescreening() {
  // Used after a major list refresh — flag every active client to re-screen.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("user_profiles").select("organization_id").eq("user_id", user.id).single();

  const { data: clients } = await supabase
    .from("kyc_clients")
    .select("id")
    .eq("organization_id", profile.organization_id);

  if (!clients || clients.length === 0) return { enqueued: 0 };

  const rows = clients.map((c) => ({
    client_id: c.id,
    organization_id: profile.organization_id,
    scheduled_for: new Date().toISOString(),
    reason: "list_refresh",
  }));

  const { error } = await supabase
    .from("continuous_screening_queue")
    .upsert(rows, { onConflict: "client_id,scheduled_for" });
  if (error) throw error;
  return { enqueued: rows.length };
}
