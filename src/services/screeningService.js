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
      screened_at, screened_by, client_id
    `, { count: 'exact' })
    .order('screened_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status === 'matches') query = query.gt('match_count', 0);
  else if (status === 'pending') query = query.eq('status', 'pending_review');
  else if (status === 'cleared') query = query.eq('status', 'cleared');
  else if (status === 'high_risk') query = query.in('overall_risk', ['high', 'critical']);

  const { data, count, error } = await query;
  if (error) throw error;

  // Fetch decrypted client names separately (FK joins can't traverse views)
  const clientIds = [...new Set((data ?? []).map(r => r.client_id).filter(Boolean))];
  let clientNames = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from('kyc_clients_decrypted')
      .select('id, client_name')
      .in('id', clientIds);
    clientNames = Object.fromEntries((clients ?? []).map(c => [c.id, c.client_name]));
  }

  const rows = (data ?? []).map(r => ({
    ...r,
    kyc_clients: r.client_id ? { id: r.client_id, client_name: clientNames[r.client_id] ?? null } : null
  }));
  return { rows, total: count ?? 0 };
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
  const { data: screeningRaw, error: e1 } = await supabase
    .from('screening_results')
    .select('*')
    .eq('id', screeningId)
    .single();
  if (e1) throw e1;

  // Fetch decrypted client data separately (FK joins can't traverse views)
  let kyc_clients = null;
  if (screeningRaw?.client_id) {
    const { data: clientData } = await supabase
      .from('kyc_clients_decrypted')
      .select('*')
      .eq('id', screeningRaw.client_id)
      .maybeSingle();
    kyc_clients = clientData;
  }
  const screening = { ...screeningRaw, kyc_clients };

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
// Helper — invoke review-matches edge function (role-enforced server-side)
// ---------------------------------------------------------------------
async function invokeReviewMatches(body) {
  const { data, error } = await supabase.functions.invoke('review-matches', { body });
  if (error) {
    let msg = error.message;
    try {
      const parsed = await error.context?.json?.();
      if (parsed?.error) msg = parsed.error;
    } catch (_) { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---------------------------------------------------------------------
// 6. Clear a match as false positive
// ---------------------------------------------------------------------
export async function clearMatch(matchId, notes) {
  if (!notes || notes.trim().length < 10) {
    throw new Error('Notes required (min 10 chars) — regulators expect a reason.');
  }
  return invokeReviewMatches({ action: 'clear', match_id: matchId, notes });
}

// ---------------------------------------------------------------------
// 7. Confirm a match
// ---------------------------------------------------------------------
export async function confirmMatch(matchId, notes) {
  if (!notes || notes.trim().length < 10) {
    throw new Error('Notes required to confirm a sanctions match.');
  }
  return invokeReviewMatches({ action: 'confirm', match_id: matchId, notes });
}

// ---------------------------------------------------------------------
// 8. Escalate a match — requires escalation_justification (FIX 3)
// When the CO is also the MLRO, this sets pending_second_review and
// requires a separate written justification distinct from the review notes.
// Both the escalation event and any subsequent re-confirmation are logged
// as separate audit entries with distinct timestamps.
// ---------------------------------------------------------------------
export async function escalateMatch(matchId, escalatedToUserId, notes, escalationJustification) {
  if (!escalationJustification || escalationJustification.trim().length < 10) {
    throw new Error('Escalation justification required (min 10 chars) — document why this needs further review.');
  }
  return invokeReviewMatches({
    action: 'escalate',
    match_id: matchId,
    notes: notes || 'Escalated for second review.',
    escalation_justification: escalationJustification,
  });
}

// ---------------------------------------------------------------------
// 9a. File an STR with the FIU — records reference number + timestamps
// ---------------------------------------------------------------------
export async function fileSTR(screeningResultId, strReferenceNumber) {
  if (!strReferenceNumber || strReferenceNumber.trim().length < 3) {
    throw new Error('A valid FIU STR reference number is required.');
  }
  return invokeReviewMatches({
    action: 'file_str',
    screening_result_id: screeningResultId,
    notes: '',
    str_reference_number: strReferenceNumber,
  });
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

  if (error) {
    // Extract the real error message from the response body when available
    let msg = error.message;
    try {
      const body = await error.context?.json?.();
      if (body?.error) msg = body.error;
    } catch (_) { /* ignore parse failure */ }
    throw new Error(msg);
  }

  // Per-list errors are returned as HTTP 200 with embedded result objects.
  // Surface them so the UI shows the real cause instead of silent success.
  if (data?.results) {
    const keyMap = {
      OFAC_SDN: 'ofac_sdn',
      OFAC_CONSOLIDATED: 'ofac_sdn',
      UN_CONSOLIDATED: 'un',
      EU_CONSOLIDATED: 'eu',
      UK_HMT_OFSI: 'uk',
    };
    const resultKey = keyMap[listSource];
    const result = resultKey ? data.results[resultKey] : null;
    if (result?.error) throw new Error(result.error);
  }

  return data;
}

// ---------------------------------------------------------------------
// 11. Legacy compat — used by existing dashboard components
// ---------------------------------------------------------------------
export const screeningService = {
  async getClientScreeningResults(clientId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select('*')
      .eq('client_id', clientId)
      .order('screened_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) return data;
    const { data: clientData } = await supabase
      .from('kyc_clients_decrypted')
      .select('id, client_name, client_type')
      .eq('id', clientId)
      .maybeSingle();
    return data.map(r => ({ ...r, client: clientData ?? null }));
  },

  async getAllScreeningResults(organizationId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select('*')
      .eq('organization_id', organizationId)
      .order('screened_at', { ascending: false });
    if (error) throw error;
    const clientIds = [...new Set((data ?? []).map(r => r.client_id).filter(Boolean))];
    let clientMap = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('kyc_clients_decrypted')
        .select('id, client_name, client_type')
        .in('id', clientIds);
      clientMap = Object.fromEntries((clients ?? []).map(c => [c.id, c]));
    }
    return (data ?? []).map(r => ({ ...r, client: r.client_id ? (clientMap[r.client_id] ?? null) : null }));
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
      .select('*, screening_results (id, screened_name, overall_risk, client_id)')
      .eq('organization_id', organizationId)
      .eq('status', 'pending_review')
      .order('match_score', { ascending: false });
    if (error) throw error;
    // Fetch decrypted client names separately (FK joins can't traverse views)
    const clientIds = [...new Set(
      (data ?? []).map(r => r.screening_results?.client_id).filter(Boolean)
    )];
    let clientMap = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('kyc_clients_decrypted')
        .select('id, client_name, client_type')
        .in('id', clientIds);
      clientMap = Object.fromEntries((clients ?? []).map(c => [c.id, c]));
    }
    return (data ?? []).map(r => ({
      ...r,
      screening_results: r.screening_results ? {
        ...r.screening_results,
        kyc_clients: r.screening_results.client_id ? (clientMap[r.screening_results.client_id] ?? null) : null
      } : null
    }));
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

  async updateScreeningResult(screeningResultId, reviewAction) {
    throw new Error(
      'updateScreeningResult is no longer supported. Use ReviewMatchesPanel which routes through the review-matches edge function.'
    );
  },
};
