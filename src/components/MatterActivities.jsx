import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MatterActivities({ matterId, organizationId, onActivityAdded, isReadOnly = false }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    activity_type: 'client_instruction',
    summary: '',
    risk_relevant: false,
    compliance_relevant: false,
    aml_relevant: false,
    risk_level_change: '',
    priority: 'normal',
    requires_follow_up: false,
    follow_up_date: '',
    notes: ''
  });

  const activityTypes = [
    { value: 'client_instruction', label: 'Client Instruction' },
    { value: 'risk_update', label: 'Risk Update' },
    { value: 'compliance_review', label: 'Compliance Review' },
    { value: 'status_change', label: 'Status Change' },
    { value: 'document_received', label: 'Document Received' },
    { value: 'document_sent', label: 'Document Sent' },
    { value: 'internal_review', label: 'Internal Review' },
    { value: 'external_communication', label: 'External Communication' },
    { value: 'research_completed', label: 'Research Completed' },
    { value: 'deadline_met', label: 'Deadline Met' },
    { value: 'payment_received', label: 'Payment Received' },
    { value: 'cost_incurred', label: 'Cost Incurred' }
  ];

  useEffect(() => {
    if (matterId) {
      fetchActivities();
    }
  }, [matterId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('matter_activities')
        .select('*')
        .eq('matter_id', matterId)
        .order('activity_date', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.summary.trim()) {
      alert('Please enter an activity summary');
      return;
    }

    if (formData.summary.length > 500) {
      alert('Summary must be 500 characters or less');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const activityData = {
        organization_id: organizationId,
        matter_id: matterId,
        activity_type: formData.activity_type,
        summary: formData.summary.trim(),
        risk_relevant: formData.risk_relevant,
        compliance_relevant: formData.compliance_relevant,
        aml_relevant: formData.aml_relevant,
        risk_level_change: formData.risk_level_change || null,
        priority: formData.priority,
        requires_follow_up: formData.requires_follow_up,
        follow_up_date: formData.follow_up_date || null,
        notes: formData.notes.trim() || null,
        created_by: user.id
      };

      const { error } = await supabase
        .from('matter_activities')
        .insert([activityData]);

      if (error) throw error;

      setFormData({
        activity_type: 'client_instruction',
        summary: '',
        risk_relevant: false,
        compliance_relevant: false,
        aml_relevant: false,
        risk_level_change: '',
        priority: 'normal',
        requires_follow_up: false,
        follow_up_date: '',
        notes: ''
      });
      setShowForm(false);
      fetchActivities();
      if (onActivityAdded) onActivityAdded();
    } catch (error) {
      console.error('Error adding activity:', error);
      alert('Failed to add activity');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading activities...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerSection}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <span style={styles.icon}>📋</span>
          </div>
          <div>
            <h3 style={styles.headerTitle}>Matter Activities</h3>
            <p style={styles.headerSubtitle}>Track all activities and updates related to this matter</p>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={showForm ? styles.cancelButton : styles.addButton}
          >
            {showForm ? '✕ Cancel' : '+ Add Activity'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          <div style={styles.formGrid}>
            {/* Basic Information Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>📋</span>
                Basic Information
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Activity Type <span style={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.activity_type}
                      onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                      style={styles.input}
                      required
                    >
                      {activityTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      style={styles.input}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formFieldFull}>
                  <label style={styles.label}>
                    Activity Summary <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    rows="3"
                    maxLength="500"
                    style={styles.textarea}
                    placeholder="Brief structured summary of the activity..."
                    required
                  />
                  <div style={styles.charCount}>
                    {formData.summary.length} / 500 characters
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Flags Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>⚠️</span>
                Compliance & Risk Flags
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.checkboxGrid}>
                  <div style={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.risk_relevant}
                      onChange={(e) => setFormData({ ...formData, risk_relevant: e.target.checked })}
                      style={styles.checkbox}
                      id="riskRelevant"
                    />
                    <label htmlFor="riskRelevant" style={styles.checkboxLabel}>
                      <strong>Risk Relevant</strong> - Impacts risk assessment
                    </label>
                  </div>

                  <div style={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.compliance_relevant}
                      onChange={(e) => setFormData({ ...formData, compliance_relevant: e.target.checked })}
                      style={styles.checkbox}
                      id="complianceRelevant"
                    />
                    <label htmlFor="complianceRelevant" style={styles.checkboxLabel}>
                      <strong>Compliance Relevant</strong> - Requires compliance review
                    </label>
                  </div>

                  <div style={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      checked={formData.aml_relevant}
                      onChange={(e) => setFormData({ ...formData, aml_relevant: e.target.checked })}
                      style={styles.checkbox}
                      id="amlRelevant"
                    />
                    <label htmlFor="amlRelevant" style={styles.checkboxLabel}>
                      <strong>AML Relevant</strong> - Related to AML obligations
                    </label>
                  </div>
                </div>

                {formData.risk_relevant && (
                  <div style={styles.formField}>
                    <label style={styles.label}>Risk Level Change</label>
                    <select
                      value={formData.risk_level_change}
                      onChange={(e) => setFormData({ ...formData, risk_level_change: e.target.value })}
                      style={styles.input}
                    >
                      <option value="">No change</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Very High">Very High</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>🔔</span>
                Follow-up & Tracking
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.checkboxWrapperSingle}>
                  <input
                    type="checkbox"
                    checked={formData.requires_follow_up}
                    onChange={(e) => setFormData({ ...formData, requires_follow_up: e.target.checked })}
                    style={styles.checkbox}
                    id="requiresFollowUp"
                  />
                  <label htmlFor="requiresFollowUp" style={styles.checkboxLabel}>
                    <strong>Requires Follow-up</strong> - This activity needs follow-up action
                  </label>
                </div>

                {formData.requires_follow_up && (
                  <div style={styles.formField}>
                    <label style={styles.label}>Follow-up Date</label>
                    <input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Additional Notes Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>📝</span>
                Additional Notes
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formFieldFull}>
                  <label style={styles.label}>Notes (max 1000 characters)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="4"
                    maxLength="1000"
                    style={styles.textarea}
                    placeholder="Optional additional context, instructions, or details..."
                  />
                  <div style={styles.charCount}>
                    {formData.notes.length} / 1000 characters
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={styles.cancelButtonAlt}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.submitButton}
              >
                <span style={styles.submitButtonIcon}>✓</span>
                Add Activity
              </button>
            </div>
          </div>
        </form>
      )}

      <div style={styles.contentSection}>
        {activities.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <p style={styles.emptyText}>No activities recorded</p>
            <p style={styles.emptySubtext}>Start tracking activities and updates for this matter</p>
          </div>
        ) : (
          <div style={styles.activitiesList}>
            {activities.map((activity) => (
              <div key={activity.id} style={styles.activityCard}>
                <div style={styles.activityHeader}>
                  <div style={styles.activityTitle}>
                    <span style={styles.activityName}>
                      {activityTypes.find(t => t.value === activity.activity_type)?.label || activity.activity_type}
                    </span>
                    <div style={styles.activityBadges}>
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(activity.priority)}`}>
                        {activity.priority?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                  </div>
                  <span style={styles.activityDate}>
                    {new Date(activity.activity_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div style={styles.activityBody}>
                  <div style={styles.activitySummarySection}>
                    <span style={styles.activityLabel}>Summary</span>
                    <p style={styles.activitySummaryText}>{activity.summary}</p>
                  </div>

                  {activity.notes && (
                    <div style={styles.activityNotesSection}>
                      <span style={styles.activityLabel}>Notes</span>
                      <p style={styles.activityNotesText}>{activity.notes}</p>
                    </div>
                  )}

                  {(activity.risk_relevant || activity.compliance_relevant || activity.aml_relevant || activity.requires_follow_up) && (
                    <div style={styles.activityFlags}>
                      <span style={styles.activityLabel}>Flags</span>
                      <div style={styles.activityFlagsList}>
                        {activity.risk_relevant && (
                          <span style={styles.riskFlag}>Risk Relevant</span>
                        )}
                        {activity.compliance_relevant && (
                          <span style={styles.complianceFlag}>Compliance</span>
                        )}
                        {activity.aml_relevant && (
                          <span style={styles.amlFlag}>AML</span>
                        )}
                        {activity.requires_follow_up && (
                          <span style={styles.followUpFlag}>
                            Follow-up: {activity.follow_up_date ? new Date(activity.follow_up_date).toLocaleDateString() : 'TBD'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {activity.risk_level_change && (
                    <div style={styles.activityRiskChange}>
                      <span style={styles.activityLabel}>Risk Level Change</span>
                      <span style={styles.riskLevelValue}>{activity.risk_level_change}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  headerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '2px solid #d4af37',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
  },
  icon: {
    fontSize: '24px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
  },
  headerSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  addButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
  },
  cancelButton: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#dc2626',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  formContainer: {
    padding: '32px',
    background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
    borderBottom: '2px solid #d4af37',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formSection: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  formSectionTitle: {
    margin: 0,
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    borderBottom: '2px solid #d4af37',
    fontSize: '15px',
    fontWeight: '700',
    color: '#0a1929',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  formSectionIcon: {
    fontSize: '18px',
  },
  formSectionContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formFieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    letterSpacing: '0.3px',
  },
  required: {
    color: '#dc2626',
    fontWeight: '700',
  },
  input: {
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1f2937',
    background: 'white',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  textarea: {
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1f2937',
    background: 'white',
    transition: 'all 0.3s ease',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(1, 1fr)',
    gap: '12px',
  },
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
  },
  checkboxWrapperSingle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.6',
    cursor: 'pointer',
  },
  charCount: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'right',
    fontWeight: '500',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '8px',
  },
  cancelButtonAlt: {
    padding: '12px 32px',
    background: 'white',
    color: '#6b7280',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  submitButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  submitButtonIcon: {
    fontSize: '16px',
  },
  contentSection: {
    padding: '24px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    background: 'linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '2px dashed #d1d5db',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  activitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  activityCard: {
    padding: '24px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #3b82f6',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f3f4f6',
  },
  activityTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  activityName: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0a1929',
    lineHeight: '1.4',
  },
  activityBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  activityDate: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    color: '#4b5563',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    whiteSpace: 'nowrap',
  },
  activityBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  activitySummarySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  activitySummaryText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    margin: 0,
  },
  activityNotesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
  },
  activityNotesText: {
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic',
  },
  activityFlags: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  activityFlagsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  activityLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  riskFlag: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    color: '#991b1b',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  complianceFlag: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    color: '#92400e',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  amlFlag: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
    color: '#7c2d12',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #fb923c',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  followUpFlag: {
    padding: '8px 14px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    color: '#1e40af',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
  },
  activityRiskChange: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
  },
  riskLevelValue: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#991b1b',
  },
};
