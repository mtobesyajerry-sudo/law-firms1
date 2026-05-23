import { supabase } from '../supabaseClient';

// Maps free-form event_type strings to the constrained action_type values
// the audit_logs table accepts.
function mapToActionType(eventType) {
  if (!eventType) return 'system_event';
  const t = eventType.toLowerCase();
  if (t.includes('create') || t.includes('add') || t.includes('insert')) return 'create';
  if (t.includes('update') || t.includes('edit') || t.includes('change')) return 'update';
  if (t.includes('delete') || t.includes('remove')) return 'delete';
  if (t.includes('view') || t.includes('read') || t.includes('fetch')) return 'view';
  if (t.includes('approve') || t.includes('accept')) return 'approve';
  if (t.includes('reject') || t.includes('deny') || t.includes('decline')) return 'reject';
  if (t.includes('submit') || t.includes('complete')) return 'submit';
  if (t.includes('login') || t.includes('signin') || t.includes('sign_in')) return 'login';
  if (t.includes('logout') || t.includes('signout') || t.includes('sign_out')) return 'logout';
  if (t.includes('upload')) return 'document_upload';
  if (t.includes('download')) return 'document_download';
  if (t.includes('screening')) return 'screening_run';
  if (t.includes('security') || t.includes('suspicious')) return 'security_alert';
  if (t.includes('password')) return 'password_change';
  if (t.includes('role')) return 'role_change';
  if (t.includes('export')) return 'data_export';
  return 'system_event';
}

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
        action_type: mapToActionType(eventData.event_type),
        event_category: eventData.event_category || 'general',
        entity_type: eventData.resource_type || null,
        entity_id: eventData.resource_id || null,
        action_description: eventData.action_description,
        severity: eventData.severity || 'info',
        ip_address: eventData.ip_address || null,
        user_agent: navigator.userAgent,
        changes: eventData.metadata ? { metadata: eventData.metadata } : null
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
