import { supabase } from '../supabaseClient';

export const screeningService = {
  async getClientScreeningResults(clientId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select(`
        *,
        client:kyc_clients(id, client_name, client_type)
      `)
      .eq('client_id', clientId)
      .order('screening_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAllScreeningResults(organizationId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select(`
        *,
        client:kyc_clients(id, client_name, client_type)
      `)
      .eq('organization_id', organizationId)
      .order('screening_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createScreeningResult(screeningData) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single();

    const { data, error } = await supabase
      .from('screening_results')
      .insert({
        ...screeningData,
        organization_id: profile.organization_id,
        screened_by_id: (await supabase.auth.getUser()).data.user.id,
        screening_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateScreeningResult(id, updates) {
    const { data, error } = await supabase
      .from('screening_results')
      .update({
        ...updates,
        reviewed_by_id: (await supabase.auth.getUser()).data.user.id,
        review_date: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getScreeningLists() {
    const { data, error } = await supabase
      .from('screening_lists')
      .select('*')
      .eq('is_active', true)
      .order('list_name');

    if (error) throw error;
    return data;
  },

  async createScreeningList(listData) {
    const { data, error } = await supabase
      .from('screening_lists')
      .insert(listData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateScreeningList(id, updates) {
    const { data, error } = await supabase
      .from('screening_lists')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getScreeningListEntries(listId) {
    const { data, error } = await supabase
      .from('screening_list_entries')
      .select('*')
      .eq('list_id', listId)
      .order('full_name');

    if (error) throw error;
    return data;
  },

  async searchScreeningEntries(searchTerm, listType = null) {
    let query = supabase
      .from('screening_list_entries')
      .select(`
        *,
        list:screening_lists(list_name, list_type, source)
      `)
      .or(`full_name.ilike.%${searchTerm}%,aliases.cs.{"${searchTerm}"}`);

    if (listType) {
      query = query.eq('screening_lists.list_type', listType);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return data;
  },

  async createScreeningListEntry(entryData) {
    const { data, error } = await supabase
      .from('screening_list_entries')
      .insert(entryData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateScreeningListEntry(id, updates) {
    const { data, error } = await supabase
      .from('screening_list_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteScreeningListEntry(id) {
    const { error } = await supabase
      .from('screening_list_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getPendingScreeningReviews(organizationId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select(`
        *,
        client:kyc_clients(id, client_name, client_type, risk_level)
      `)
      .eq('organization_id', organizationId)
      .eq('match_found', true)
      .in('screening_status', ['pending', 'under_review'])
      .order('screening_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getScreeningStatistics(organizationId) {
    const { data, error } = await supabase
      .from('screening_results')
      .select('screening_status, match_found, risk_level')
      .eq('organization_id', organizationId);

    if (error) throw error;

    return {
      total: data.length,
      pending: data.filter(r => r.screening_status === 'pending').length,
      underReview: data.filter(r => r.screening_status === 'under_review').length,
      cleared: data.filter(r => r.screening_status === 'cleared').length,
      escalated: data.filter(r => r.screening_status === 'escalated').length,
      matchesFound: data.filter(r => r.match_found).length,
      highRisk: data.filter(r => r.risk_level === 'high' || r.risk_level === 'critical').length,
    };
  },

  async getContinuousScreeningQueue(organizationId) {
    const { data, error } = await supabase
      .from('continuous_screening_queue')
      .select(`
        *,
        client:kyc_clients(id, client_name, client_type, risk_level)
      `)
      .eq('organization_id', organizationId)
      .eq('queue_status', 'active')
      .lte('next_screening_due', new Date().toISOString())
      .order('next_screening_due');

    if (error) throw error;
    return data;
  },

  async addToContinuousScreening(clientId, frequency = 'monthly') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single();

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
