import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MatterMilestones({ matterId, organizationId, onMilestoneAdded, isReadOnly = false }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    milestone_type: 'court_appearance',
    milestone_name: '',
    milestone_date: '',
    milestone_time: '',
    location: '',
    court_name: '',
    judge_name: '',
    outcome: '',
    outcome_summary: '',
    status: 'scheduled',
    compliance_relevant: false,
    notes: ''
  });

  const milestoneTypes = [
    { value: 'court_appearance', label: 'Court Appearance' },
    { value: 'hearing_scheduled', label: 'Hearing' },
    { value: 'filing_deadline', label: 'Filing Deadline' },
    { value: 'document_submission', label: 'Document Submission' },
    { value: 'client_meeting', label: 'Client Meeting' },
    { value: 'expert_consultation', label: 'Expert Consultation' },
    { value: 'mediation_session', label: 'Mediation Session' },
    { value: 'arbitration_hearing', label: 'Arbitration Hearing' },
    { value: 'trial_date', label: 'Trial Date' },
    { value: 'settlement_conference', label: 'Settlement Conference' },
    { value: 'status_conference', label: 'Status Conference' },
    { value: 'discovery_deadline', label: 'Discovery Deadline' },
    { value: 'motion_filing', label: 'Motion Filing' },
    { value: 'judgment_received', label: 'Judgment Received' },
    { value: 'appeal_filed', label: 'Appeal Filed' },
    { value: 'case_closed', label: 'Case Closed' }
  ];

  const outcomeOptions = [
    { value: '', label: 'Not Yet Determined' },
    { value: 'completed', label: 'Completed' },
    { value: 'continued', label: 'Continued' },
    { value: 'ruled_favorable', label: 'Ruled Favorable' },
    { value: 'ruled_unfavorable', label: 'Ruled Unfavorable' },
    { value: 'settled', label: 'Settled' },
    { value: 'dismissed', label: 'Dismissed' },
    { value: 'granted', label: 'Granted' },
    { value: 'denied', label: 'Denied' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' }
  ];

  useEffect(() => {
    if (matterId) {
      fetchMilestones();
    }
  }, [matterId]);

  const fetchMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('matter_milestones')
        .select('*')
        .eq('matter_id', matterId)
        .order('milestone_date', { ascending: true });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.milestone_name.trim() || !formData.milestone_date) {
      alert('Please enter milestone name and date');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const milestoneData = {
        organization_id: organizationId,
        matter_id: matterId,
        milestone_type: formData.milestone_type,
        milestone_name: formData.milestone_name.trim(),
        milestone_date: formData.milestone_date,
        milestone_time: formData.milestone_time || null,
        location: formData.location.trim() || null,
        court_name: formData.court_name.trim() || null,
        judge_name: formData.judge_name.trim() || null,
        outcome: formData.outcome || null,
        outcome_summary: formData.outcome_summary.trim() || null,
        status: formData.status,
        compliance_relevant: formData.compliance_relevant,
        notes: formData.notes.trim() || null,
        created_by: user.id
      };

      const { error } = await supabase
        .from('matter_milestones')
        .insert([milestoneData]);

      if (error) throw error;

      setFormData({
        milestone_type: 'court_appearance',
        milestone_name: '',
        milestone_date: '',
        milestone_time: '',
        location: '',
        court_name: '',
        judge_name: '',
        outcome: '',
        outcome_summary: '',
        status: 'scheduled',
        compliance_relevant: false,
        notes: ''
      });
      setShowForm(false);
      fetchMilestones();
      if (onMilestoneAdded) onMilestoneAdded();
    } catch (error) {
      console.error('Error adding milestone:', error);
      alert('Failed to add milestone');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rescheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyLevel = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const milestoneDate = new Date(date);
    milestoneDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.ceil((milestoneDate - today) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) return { level: 'overdue', color: 'border-l-4 border-l-red-500' };
    if (daysDiff === 0) return { level: 'today', color: 'border-l-4 border-l-red-400' };
    if (daysDiff <= 7) return { level: 'this_week', color: 'border-l-4 border-l-orange-500' };
    if (daysDiff <= 30) return { level: 'this_month', color: 'border-l-4 border-l-yellow-500' };
    return { level: 'upcoming', color: 'border-l-4 border-l-blue-500' };
  };

  if (loading) {
    return <div className="text-center py-4">Loading milestones...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerSection}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrapper}>
            <span style={styles.icon}>⚖️</span>
          </div>
          <div>
            <h3 style={styles.headerTitle}>Court Dates & Milestones</h3>
            <p style={styles.headerSubtitle}>Schedule and track important dates, hearings, and deadlines</p>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={showForm ? styles.cancelButton : styles.addButton}
          >
            {showForm ? '✕ Cancel' : '+ Add Milestone'}
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
                      Milestone Type <span style={styles.required}>*</span>
                    </label>
                    <select
                      value={formData.milestone_type}
                      onChange={(e) => setFormData({ ...formData, milestone_type: e.target.value })}
                      style={styles.input}
                      required
                    >
                      {milestoneTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Milestone Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.milestone_name}
                      onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., Pre-trial hearing"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>📅</span>
                Date & Time
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.label}>
                      Date <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.milestone_date}
                      onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Time</label>
                    <input
                      type="time"
                      value={formData.milestone_time}
                      onChange={(e) => setFormData({ ...formData, milestone_time: e.target.value })}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Court Details Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>⚖️</span>
                Court Details
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formRowThree}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., Courtroom 3"
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Court Name</label>
                    <input
                      type="text"
                      value={formData.court_name}
                      onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., High Court"
                    />
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Judge Name</label>
                    <input
                      type="text"
                      value={formData.judge_name}
                      onChange={(e) => setFormData({ ...formData, judge_name: e.target.value })}
                      style={styles.input}
                      placeholder="e.g., Hon. Judge Smith"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Outcome Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>✓</span>
                Status & Outcome
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.label}>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      style={styles.input}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formField}>
                    <label style={styles.label}>Outcome</label>
                    <select
                      value={formData.outcome}
                      onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                      style={styles.input}
                    >
                      {outcomeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.outcome && (
                  <div style={styles.formFieldFull}>
                    <label style={styles.label}>
                      Outcome Summary (max 500 characters)
                    </label>
                    <textarea
                      value={formData.outcome_summary}
                      onChange={(e) => setFormData({ ...formData, outcome_summary: e.target.value })}
                      rows="3"
                      maxLength="500"
                      style={styles.textarea}
                      placeholder="Brief summary of the outcome..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information Section */}
            <div style={styles.formSection}>
              <h4 style={styles.formSectionTitle}>
                <span style={styles.formSectionIcon}>📝</span>
                Additional Information
              </h4>
              <div style={styles.formSectionContent}>
                <div style={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    checked={formData.compliance_relevant}
                    onChange={(e) => setFormData({ ...formData, compliance_relevant: e.target.checked })}
                    style={styles.checkbox}
                    id="complianceRelevant"
                  />
                  <label htmlFor="complianceRelevant" style={styles.checkboxLabel}>
                    <strong>Compliance Relevant</strong> - This milestone requires AML/compliance oversight
                  </label>
                </div>

                <div style={styles.formFieldFull}>
                  <label style={styles.label}>Notes (max 1000 characters)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="4"
                    maxLength="1000"
                    style={styles.textarea}
                    placeholder="Any additional notes, instructions, or information about this milestone..."
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
                Add Milestone
              </button>
            </div>
          </div>
        </form>
      )}

      <div style={styles.contentSection}>
        {milestones.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📅</div>
            <p style={styles.emptyText}>No milestones scheduled yet</p>
            <p style={styles.emptySubtext}>Click "Add Milestone" to schedule your first court date or deadline</p>
          </div>
        ) : (
          <div style={styles.milestonesList}>
            {milestones.map((milestone) => {
              const urgency = getUrgencyLevel(milestone.milestone_date);
              return (
                <div
                  key={milestone.id}
                  style={{...styles.milestoneCard, ...getUrgencyStyle(urgency.level)}}
                >
                  <div style={styles.milestoneHeader}>
                    <div style={styles.milestoneTitle}>
                      <span style={styles.milestoneName}>{milestone.milestone_name}</span>
                      <div style={styles.milestoneBadges}>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(milestone.status)}`}>
                          {statusOptions.find(s => s.value === milestone.status)?.label}
                        </span>
                        {milestone.compliance_relevant && (
                          <span style={styles.complianceBadge}>
                            Compliance
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={styles.milestoneTypeBadge}>
                      {milestoneTypes.find(t => t.value === milestone.milestone_type)?.label}
                    </span>
                  </div>

                  <div style={styles.milestoneBody}>
                    <div style={styles.milestoneRow}>
                      <div style={styles.milestoneInfoItem}>
                        <span style={styles.milestoneLabel}>Date & Time</span>
                        <span style={styles.milestoneValue}>
                          {new Date(milestone.milestone_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          {milestone.milestone_time && ` at ${milestone.milestone_time}`}
                        </span>
                      </div>
                    </div>

                    {milestone.location && (
                      <div style={styles.milestoneRow}>
                        <div style={styles.milestoneInfoItem}>
                          <span style={styles.milestoneLabel}>Location</span>
                          <span style={styles.milestoneValue}>{milestone.location}</span>
                        </div>
                      </div>
                    )}

                    {milestone.court_name && (
                      <div style={styles.milestoneRow}>
                        <div style={styles.milestoneInfoItem}>
                          <span style={styles.milestoneLabel}>Court</span>
                          <span style={styles.milestoneValue}>{milestone.court_name}</span>
                        </div>
                      </div>
                    )}

                    {milestone.judge_name && (
                      <div style={styles.milestoneRow}>
                        <div style={styles.milestoneInfoItem}>
                          <span style={styles.milestoneLabel}>Judge</span>
                          <span style={styles.milestoneValue}>{milestone.judge_name}</span>
                        </div>
                      </div>
                    )}

                    {milestone.outcome && (
                      <div style={styles.milestoneRow}>
                        <div style={styles.milestoneInfoItem}>
                          <span style={styles.milestoneLabel}>Outcome</span>
                          <span style={styles.milestoneValue}>
                            {outcomeOptions.find(o => o.value === milestone.outcome)?.label}
                          </span>
                        </div>
                      </div>
                    )}

                    {milestone.outcome_summary && (
                      <div style={styles.milestoneSummary}>
                        <span style={styles.milestoneLabel}>Summary</span>
                        <p style={styles.milestoneSummaryText}>{milestone.outcome_summary}</p>
                      </div>
                    )}

                    {milestone.notes && (
                      <div style={styles.milestoneNotes}>
                        <span style={styles.milestoneLabel}>Notes</span>
                        <p style={styles.milestoneNotesText}>{milestone.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const getUrgencyStyle = (level) => {
  const styles = {
    overdue: { borderLeftColor: '#dc2626', borderLeftWidth: '4px' },
    today: { borderLeftColor: '#ea580c', borderLeftWidth: '4px' },
    this_week: { borderLeftColor: '#f97316', borderLeftWidth: '4px' },
    this_month: { borderLeftColor: '#f59e0b', borderLeftWidth: '4px' },
    upcoming: { borderLeftColor: '#3b82f6', borderLeftWidth: '4px' },
  };
  return styles[level] || styles.upcoming;
};

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
  formRowThree: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    border: '2px solid #f59e0b',
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
  milestonesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  milestoneCard: {
    padding: '24px',
    background: 'white',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid #d4af37',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'all 0.3s ease',
  },
  milestoneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #f3f4f6',
  },
  milestoneTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
  },
  milestoneName: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#0a1929',
    lineHeight: '1.4',
  },
  milestoneBadges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  complianceBadge: {
    padding: '6px 12px',
    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    color: '#92400e',
    fontSize: '11px',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1px solid #f59e0b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  milestoneTypeBadge: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
    color: '#4b5563',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    whiteSpace: 'nowrap',
  },
  milestoneBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  milestoneRow: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  milestoneInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  milestoneLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  milestoneValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: '1.5',
  },
  milestoneSummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    borderRadius: '8px',
    border: '1px solid #86efac',
    marginTop: '8px',
  },
  milestoneSummaryText: {
    fontSize: '13px',
    color: '#15803d',
    lineHeight: '1.6',
    margin: 0,
    fontStyle: 'italic',
  },
  milestoneNotes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    borderRadius: '8px',
    border: '1px solid #93c5fd',
    marginTop: '8px',
  },
  milestoneNotesText: {
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: '1.6',
    margin: 0,
  },
};
