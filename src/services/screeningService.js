import { supabase } from '../supabaseClient';

// ---------------------------------------------------------------------
// 1. Run a screening — calls the screen-client Edge Function
// ---------------------------------------------------------------------
export async function runScreening({
  clientId,
  fullName,
  dateOfBirth,
  nationality,
  idNumber,
  entityType = 'individual',
  usePremium = false,
  threshold = 0.70,
}) {
  if (!fullName || fullName.trim().length < 2) {
    throw new Error('Full name is required (min 2 characters)');
  }

  const { data, error } = await supabase.functions.invoke('sanctions-screening', {
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
  return data;
}

// ---------------------------------------------------------------------
// 2. Re-screen an existing kyc_client by id
// ---------------------------------------------------------------------
export async function rescreenClient(clientId, options = {}) {
  const { data: client, error } = await supabase
    .from('kyc_clients_decrypted')
    .select('id, client_name, date_of_birth, nationality, national_id')
    .eq('id', clientId)
    .maybeSingle();
  if (error) throw error;
  return runScreening({
    clientId: client.id,
    fullName: client.client_name,
    dateOfBirth: client.date_of_birth,
    nationality: client.nationality,
    idNumber: client.national_id,
    usePremium: options.usePremium ?? false,
  });
}

// ---------------------------------------------------------------------
// 3. Fetch screening history
// ---------------------------------------------------------------------
export async function getScreeningHistory({ status, page = 1, pageSize = 25 } = {}) {
  let query = supabase
    .from('screening_results')
    .select(`
      id, screened_name, screened_dob, screened_nationality,
      match_count, highest_score, overall_risk, status, opensanctions_used,
      screened_at, screened_by, client_id,
      kyc_clients (id, client_name)
    `, { count: 'exact' })
    .order('screened_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status === 'matches') query = query.gt('match_count', 0);
  else if (status === 'pending') query = query.eq('status', 'pending_review');
  else if (status === 'cleared') query = query.eq('status', 'cleared');
  else if (status === 'high_risk') query = query.in('overall_risk', ['high', 'critical']);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0 };
}

// ---------------------------------------------------------------------
// 4. Dashboard summary counters
// ---------------------------------------------------------------------
export async function getDashboardCounters() {
  const [total, matches, pending, cleared, highRisk] = await Promise.all([
    supabase.from('screening_results').select('id', { count: 'exact', head: true }),
    supabase.from('screening_results').select('id', { count: 'exact', head: true }).gt('match_count', 0),
    supabase.from('screening_matches').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('screening_results').select('id', { count: 'exact', head: true }).eq('status', 'cleared'),
    supabase.from('screening_results').select('id', { count: 'exact', head: true }).in('overall_risk', ['high', 'critical']),
  ]);
  return {
    total: total.count ?? 0,
    matches: matches.count ?? 0,
    pending: pending.count ?? 0,
    cleared: cleared.count ?? 0,
    high_risk: highRisk.count ?? 0,
  };
}

// ---------------------------------------------------------------------
// 5. Fetch full screening detail + matches
// ---------------------------------------------------------------------
export async function getScreeningDetail(screeningId) {
  const { data: screening, error: e1 } = await supabase
    .from('screening_results')
    .select('*, kyc_clients(*)')
    .eq('id', screeningId)
    .single();
  if (e1) throw e1;

  const { data: matches, error: e2 } = await supabase
    .from('screening_matches')
    .select(`
      *,
      screening_list_entries (
        id, primary_name, aliases_jsonb, date_of_birth, dob_text,
        nationalities, place_of_birth, identifications, addresses,
        program, remarks, is_pep, pep_position, pep_country
      )
    `)
    .eq('screening_result_id', screeningId)
    .order('match_score', { ascending: false });
  if (e2) throw e2;

  return { screening, matches: matches ?? [] };
}

// ---------------------------------------------------------------------
// 6. Clear a match as false positive
// ---------------------------------------------------------------------
export async function clearMatch(matchId, notes) {
  if (!notes || notes.trim().length < 10) {
    throw new Error('Notes required (min 10 chars) — regulators expect a reason.');
  }
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('screening_matches')
    .update({
      status: 'cleared_false_positive',
      reviewer_id: user.id,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('screening_audit_log').insert({
    organization_id: data.organization_id,
    screening_result_id: data.screening_result_id,
    match_id: matchId,
    action: 'match_cleared',
    actor_id: user.id,
    actor_email: user.email,
    details: { notes, list_source: data.list_source },
  });

  await maybeCloseScreening(data.screening_result_id);
  return data;
}

// ---------------------------------------------------------------------
// 7. Confirm a match
// ---------------------------------------------------------------------
export async function confirmMatch(matchId, notes) {
  if (!notes || notes.trim().length < 10) {
    throw new Error('Notes required to confirm a sanctions match.');
  }
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('screening_matches')
    .update({
      status: 'confirmed_match',
      reviewer_id: user.id,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from('screening_results')
    .update({ overall_risk: 'critical', status: 'match_confirmed' })
    .eq('id', data.screening_result_id);

  await supabase.from('screening_audit_log').insert({
    organization_id: data.organization_id,
    screening_result_id: data.screening_result_id,
    match_id: matchId,
    action: 'match_confirmed',
    actor_id: user.id,
    actor_email: user.email,
    details: { notes, list_source: data.list_source },
  });

  return data;
}

// ---------------------------------------------------------------------
// 8. Escalate a match to MLRO
// ---------------------------------------------------------------------
export async function escalateMatch(matchId, escalatedToUserId, notes) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('screening_matches')
    .update({
      status: 'escalated_to_mlro',
      escalated_to: escalatedToUserId,
      escalated_at: new Date().toISOString(),
      review_notes: notes,
      reviewer_id: user.id,
    })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw error;

  await supabase.from('screening_audit_log').insert({
    organization_id: data.organization_id,
    screening_result_id: data.screening_result_id,
    match_id: matchId,
    action: 'match_escalated',
    actor_id: user.id,
    actor_email: user.email,
    details: { escalated_to: escalatedToUserId, notes },
  });

  return data;
}

async function maybeCloseScreening(screeningId) {
  const { data: open } = await supabase
    .from('screening_matches')
    .select('id')
    .eq('screening_result_id', screeningId)
    .eq('status', 'pending_review');

  if (!open || open.length === 0) {
    await supabase
      .from('screening_results')
      .update({ status: 'cleared' })
      .eq('id', screeningId)
      .neq('status', 'match_confirmed');
  }
}

// ---------------------------------------------------------------------
// 9. Lists & ingestion status
// ---------------------------------------------------------------------
export async function getLists() {
  const { data, error } = await supabase
    .from('screening_lists')
    .select('*')
    .order('is_global', { ascending: false })
    .order('list_name');
  if (error) throw error;
  return data ?? [];
}

export async function getRecentIngestionLogs(limit = 20) {
  const { data, error } = await supabase
    .from('list_ingestion_log')
    .select('*, screening_lists(list_name, list_source)')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------
// 10. Trigger manual list refresh (admin only)
// ---------------------------------------------------------------------
export async function triggerListSync(listSource) {
  const fnMap = {
    OFAC_SDN: 'ingestion-processor',
    OFAC_CONSOLIDATED: 'ingestion-processor',
    UN_CONSOLIDATED: 'ingestion-processor',
    EU_CONSOLIDATED: 'ingestion-processor',
    UK_HMT_OFSI: 'ingestion-processor',
  };
  const fnName = fnMap[listSource];
  if (!fnName) throw new Error(`Unknown list source: ${listSource}`);
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: { list_source: listSource },
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// 11. Legacy compat — used by existing dashboard components
// ---------------------------------------------------------------------
export const screeningService = {
  async getClientScreeningResults(clientId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select('*, client:kyc_clients(id, client_name, client_type)')
      .eq('client_id', clientId)
      .order('screened_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getAllScreeningResults(organizationId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select('*, client:kyc_clients(id, client_name, client_type)')
      .eq('organization_id', organizationId)
      .order('screened_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getScreeningStatistics(organizationId) {
    const counters = await getDashboardCounters();
    return {
      total: counters.total,
      pending: counters.pending,
      underReview: 0,
      cleared: counters.cleared,
      escalated: 0,
      matchesFound: counters.matches,
      highRisk: counters.high_risk,
    };
  },

  async getScreeningLists() {
    return getLists();
  },

  async getPendingScreeningReviews(organizationId) {
    const { data, error } = await supabase
      .from('screening_matches')
      .select(`
        *, screening_results (id, screened_name, overall_risk, client_id,
          kyc_clients (id, client_name, client_type, risk_level))
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending_review')
      .order('match_score', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addToContinuousScreening(clientId, frequency = 'monthly') {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const nextDate = new Date();
    if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (frequency === 'annually') nextDate.setFullYear(nextDate.getFullYear() + 1);

    const { data, error } = await supabase
      .from('continuous_screening_queue')
      .insert({
        organization_id: profile.organization_id,
        client_id: clientId,
        last_screened: new Date().toISOString(),
        next_screening_due: nextDate.toISOString(),
        screening_frequency: frequency,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
