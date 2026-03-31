import { supabase } from '../supabaseClient';

class AuditService {
  async logEvent(eventData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, organization_id, role, full_name')
        .eq('id', user?.id)
        .maybeSingle();

      const auditEntry = {
        user_id: user?.id || null,
        organization_id: profile?.organization_id || null,
        event_type: eventData.event_type,
        event_category: eventData.event_category || 'general',
        action_description: eventData.action_description,
        resource_type: eventData.resource_type || null,
        resource_id: eventData.resource_id || null,
        ip_address: eventData.ip_address || null,
        user_agent: navigator.userAgent,
        severity: eventData.severity || 'info',
        metadata: eventData.metadata || null
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert([auditEntry]);

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  async logAssessmentAction(action, assessmentId, details = {}) {
    await this.logEvent({
      event_type: `assessment_${action}`,
      event_category: 'aml_compliance',
      action_description: `${action.charAt(0).toUpperCase() + action.slice(1)} assessment`,
      resource_type: 'assessment',
      resource_id: assessmentId,
      severity: 'info',
      metadata: details
    });
  }

  async logClientAction(action, clientId, details = {}) {
    await this.logEvent({
      event_type: `client_${action}`,
      event_category: 'kyc_management',
      action_description: `${action.charAt(0).toUpperCase() + action.slice(1)} client`,
      resource_type: 'kyc_client',
      resource_id: clientId,
      severity: 'info',
      metadata: details
    });
  }

  async logMatterAction(action, matterId, details = {}) {
    await this.logEvent({
      event_type: `matter_${action}`,
      event_category: 'case_management',
      action_description: `${action.charAt(0).toUpperCase() + action.slice(1)} matter`,
      resource_type: 'matter',
      resource_id: matterId,
      severity: 'info',
      metadata: details
    });
  }

  async logDocumentAction(action, documentId, details = {}) {
    await this.logEvent({
      event_type: `document_${action}`,
      event_category: 'document_management',
      action_description: `${action.charAt(0).toUpperCase() + action.slice(1)} document`,
      resource_type: 'document',
      resource_id: documentId,
      severity: action === 'deleted' ? 'warning' : 'info',
      metadata: details
    });
  }

  async logUserAction(action, targetUserId, details = {}) {
    await this.logEvent({
      event_type: `user_${action}`,
      event_category: 'user_management',
      action_description: `${action.charAt(0).toUpperCase() + action.slice(1)} user`,
      resource_type: 'user',
      resource_id: targetUserId,
      severity: ['deleted', 'suspended'].includes(action) ? 'warning' : 'info',
      metadata: details
    });
  }

  async logSecurityEvent(eventType, severity = 'warning', description, metadata = {}) {
    await this.logEvent({
      event_type: eventType,
      event_category: 'security',
      action_description: description,
      severity: severity,
      metadata: metadata
    });
  }

  async getRecentLogs(limit = 50, filters = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filters.event_category) {
        query = query.eq('event_category', filters.event_category);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }
}

export const auditService = new AuditService();
