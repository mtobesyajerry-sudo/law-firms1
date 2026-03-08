import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function ClientReviewForm({ client, onReviewComplete, onCancel }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    review_type: 'scheduled',
    review_notes: '',
    transactions_reviewed: false,
    documents_reviewed: false,
    screening_checked: false,
    risk_rating_after: client.current_risk_rating,
    dd_level_after: client.current_dd_level || 'standard',
    outcome: 'no_issues',
    issues_identified: [],
    recommendations: '',
    next_review_date: '',
    review_frequency: client.review_frequency || 'annual',
    requires_compliance_review: false
  });

  const [issueInput, setIssueInput] = useState('');

  useEffect(() => {
    // Calculate suggested next review date based on frequency
    calculateNextReviewDate(formData.review_frequency);
  }, [formData.review_frequency]);

  const calculateNextReviewDate = (frequency) => {
    const today = new Date();
    let nextDate = new Date(today);

    switch (frequency) {
      case 'monthly':
        nextDate.setMonth(today.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(today.getMonth() + 3);
        break;
      case 'semi_annual':
        nextDate.setMonth(today.getMonth() + 6);
        break;
      case 'annual':
        nextDate.setFullYear(today.getFullYear() + 1);
        break;
      default:
        nextDate.setFullYear(today.getFullYear() + 1);
    }

    setFormData(prev => ({
      ...prev,
      next_review_date: nextDate.toISOString().split('T')[0]
    }));
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddIssue = () => {
    if (issueInput.trim()) {
      setFormData(prev => ({
        ...prev,
        issues_identified: [...prev.issues_identified, issueInput.trim()]
      }));
      setIssueInput('');
    }
  };

  const handleRemoveIssue = (index) => {
    setFormData(prev => ({
      ...prev,
      issues_identified: prev.issues_identified.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const risk_rating_changed = formData.risk_rating_after !== client.current_risk_rating;
      const dd_level_changed = formData.dd_level_after !== (client.current_dd_level || 'standard');

      const reviewData = {
        client_id: client.id,
        organization_id: client.organization_id,
        review_date: new Date().toISOString().split('T')[0],
        reviewed_by: user.id,
        review_type: formData.review_type,
        review_notes: formData.review_notes,
        transactions_reviewed: formData.transactions_reviewed,
        documents_reviewed: formData.documents_reviewed,
        screening_checked: formData.screening_checked,
        risk_rating_before: client.current_risk_rating,
        risk_rating_after: formData.risk_rating_after,
        risk_rating_changed,
        risk_change_justification: risk_rating_changed ? formData.review_notes : null,
        dd_level_before: client.current_dd_level || 'standard',
        dd_level_after: formData.dd_level_after,
        dd_level_changed,
        dd_change_justification: dd_level_changed ? formData.review_notes : null,
        outcome: formData.outcome,
        issues_identified: formData.issues_identified.length > 0 ? formData.issues_identified : null,
        recommendations: formData.recommendations || null,
        next_review_date: formData.next_review_date,
        review_frequency: formData.review_frequency,
        requires_compliance_review: formData.requires_compliance_review
      };

      const { error } = await supabase
        .from('client_reviews')
        .insert([reviewData]);

      if (error) throw error;

      alert('Review completed successfully! Client details have been updated.');
      onReviewComplete();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280'
    },
    body: {
      padding: '24px'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    formGroup: {
      marginBottom: '16px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box'
    },
    textarea: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      minHeight: '100px',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      resize: 'vertical'
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    checkboxGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#374151',
      cursor: 'pointer'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    issueContainer: {
      marginTop: '8px'
    },
    issueInputGroup: {
      display: 'flex',
      gap: '8px',
      marginBottom: '12px'
    },
    issueList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    issueItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '6px',
      fontSize: '13px'
    },
    removeButton: {
      padding: '4px 8px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500'
    },
    addButton: {
      padding: '10px 16px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap'
    },
    warningBox: {
      padding: '12px 16px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#92400e',
      marginTop: '12px'
    },
    infoBox: {
      padding: '12px 16px',
      backgroundColor: '#dbeafe',
      border: '1px solid #60a5fa',
      borderRadius: '8px',
      fontSize: '13px',
      color: '#1e40af',
      marginBottom: '16px'
    },
    footer: {
      padding: '16px 24px',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      backgroundColor: '#f9fafb'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none'
    },
    cancelButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    submitButton: {
      backgroundColor: '#10b981',
      color: 'white'
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title}>Conduct Client Review</div>
          <div style={styles.subtitle}>Client: {client.client_name}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.body}>
            <div style={styles.infoBox}>
              🔍 This review will update the client's risk rating, DD level, and schedule the next review date.
            </div>

            {/* Review Type */}
            <div style={styles.section}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Review Type</label>
                <select
                  style={styles.select}
                  value={formData.review_type}
                  onChange={(e) => setFormData({ ...formData, review_type: e.target.value })}
                  required
                >
                  <option value="scheduled">Scheduled Review</option>
                  <option value="triggered">Triggered Review (Risk Event)</option>
                  <option value="ad_hoc">Ad-Hoc Review</option>
                </select>
              </div>
            </div>

            {/* Review Activities */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>✓ Review Activities Completed</div>
              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={formData.transactions_reviewed}
                    onChange={() => handleCheckboxChange('transactions_reviewed')}
                  />
                  Transactions Reviewed
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={formData.documents_reviewed}
                    onChange={() => handleCheckboxChange('documents_reviewed')}
                  />
                  Documents Reviewed
                </label>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={formData.screening_checked}
                    onChange={() => handleCheckboxChange('screening_checked')}
                  />
                  Screening Checked
                </label>
              </div>
            </div>

            {/* Risk Assessment */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>⚠️ Risk Assessment</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current Risk Rating</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={client.current_risk_rating}
                    disabled
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Updated Risk Rating</label>
                  <select
                    style={styles.select}
                    value={formData.risk_rating_after}
                    onChange={(e) => setFormData({ ...formData, risk_rating_after: e.target.value })}
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Current DD Level</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={(client.current_dd_level || 'standard').toUpperCase()}
                    disabled
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Updated DD Level</label>
                  <select
                    style={styles.select}
                    value={formData.dd_level_after}
                    onChange={(e) => setFormData({ ...formData, dd_level_after: e.target.value })}
                    required
                  >
                    <option value="simplified">Simplified</option>
                    <option value="standard">Standard</option>
                    <option value="enhanced">Enhanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Review Outcome */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📋 Review Outcome</div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Outcome</label>
                <select
                  style={styles.select}
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  required
                >
                  <option value="no_issues">No Issues - Continue Monitoring</option>
                  <option value="continue_monitoring">Continue Monitoring (Minor Concerns)</option>
                  <option value="escalate">Escalate to Compliance</option>
                  <option value="enhanced_dd_required">Enhanced DD Required</option>
                  <option value="account_closure_recommended">Account Closure Recommended</option>
                </select>
              </div>

              {/* Issues Identified */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Issues Identified (Optional)</label>
                <div style={styles.issueContainer}>
                  <div style={styles.issueInputGroup}>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Enter an issue and click Add"
                      value={issueInput}
                      onChange={(e) => setIssueInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIssue())}
                    />
                    <button
                      type="button"
                      style={styles.addButton}
                      onClick={handleAddIssue}
                    >
                      Add Issue
                    </button>
                  </div>
                  {formData.issues_identified.length > 0 && (
                    <div style={styles.issueList}>
                      {formData.issues_identified.map((issue, index) => (
                        <div key={index} style={styles.issueItem}>
                          <span>{issue}</span>
                          <button
                            type="button"
                            style={styles.removeButton}
                            onClick={() => handleRemoveIssue(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review Notes */}
            <div style={styles.section}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Review Notes</label>
                <textarea
                  style={styles.textarea}
                  value={formData.review_notes}
                  onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
                  placeholder="Enter detailed findings, observations, and justifications for any changes..."
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Recommendations (Optional)</label>
                <textarea
                  style={styles.textarea}
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  placeholder="Enter any recommendations for future monitoring or actions..."
                />
              </div>
            </div>

            {/* Next Review Schedule */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📅 Next Review Schedule</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Review Frequency</label>
                  <select
                    style={styles.select}
                    value={formData.review_frequency}
                    onChange={(e) => setFormData({ ...formData, review_frequency: e.target.value })}
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Next Review Date</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formData.next_review_date}
                    onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Compliance Flag */}
            <div style={styles.section}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={formData.requires_compliance_review}
                  onChange={() => handleCheckboxChange('requires_compliance_review')}
                />
                This review requires Compliance Officer sign-off
              </label>
            </div>

            {(formData.risk_rating_after !== client.current_risk_rating ||
              formData.dd_level_after !== (client.current_dd_level || 'standard')) && (
              <div style={styles.warningBox}>
                ⚠️ You are changing the risk rating or DD level. Please provide detailed justification in the review notes.
              </div>
            )}
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              style={{ ...styles.button, ...styles.cancelButton }}
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{ ...styles.button, ...styles.submitButton }}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Complete Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
