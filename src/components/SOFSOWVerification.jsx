import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function SOFSOWVerification({ client, onClose, onVerificationComplete }) {
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [showNewVerification, setShowNewVerification] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [client.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [verificationsRes, checklistRes] = await Promise.all([
        supabase
          .from('sof_sow_verification_records')
          .select('*')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sof_sow_verification_checklist')
          .select('*')
          .order('item_order')
      ]);

      if (verificationsRes.error) throw verificationsRes.error;
      if (checklistRes.error) throw checklistRes.error;

      setVerifications(verificationsRes.data || []);
      setChecklistItems(checklistRes.data || []);
    } catch (error) {
      console.error('Error loading verification data:', error);
      alert('Failed to load verification data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVerification = () => {
    setSelectedVerification(null);
    setShowNewVerification(true);
    setActiveTab('details');
  };

  const handleViewVerification = (verification) => {
    setSelectedVerification(verification);
    setShowNewVerification(false);
    setActiveTab('details');
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loadingContainer}>Loading verification data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>SOF/SOW Verification</h2>
            <p style={styles.clientName}>{client.client_name}</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' ? styles.activeTab : {})
            }}
          >
            Overview
          </button>
          {(selectedVerification || showNewVerification) && (
            <>
              <button
                onClick={() => setActiveTab('details')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'details' ? styles.activeTab : {})
                }}
              >
                Verification Details
              </button>
              <button
                onClick={() => setActiveTab('checklist')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'checklist' ? styles.activeTab : {})
                }}
              >
                Checklist
              </button>
              {selectedVerification && (
                <button
                  onClick={() => setActiveTab('history')}
                  style={{
                    ...styles.tab,
                    ...(activeTab === 'history' ? styles.activeTab : {})
                  }}
                >
                  History
                </button>
              )}
            </>
          )}
        </div>

        <div style={styles.content}>
          {activeTab === 'overview' && (
            <OverviewTab
              verifications={verifications}
              client={client}
              onCreateNew={handleCreateVerification}
              onViewVerification={handleViewVerification}
            />
          )}

          {activeTab === 'details' && (
            <VerificationDetailsTab
              verification={selectedVerification}
              client={client}
              isNew={showNewVerification}
              onSave={loadData}
              onCancel={() => {
                setShowNewVerification(false);
                setSelectedVerification(null);
                setActiveTab('overview');
              }}
            />
          )}

          {activeTab === 'checklist' && (selectedVerification || showNewVerification) && (
            <ChecklistTab
              verification={selectedVerification}
              checklistItems={checklistItems}
              onUpdate={loadData}
            />
          )}

          {activeTab === 'history' && selectedVerification && (
            <HistoryTab verificationId={selectedVerification.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ verifications, client, onCreateNew, onViewVerification }) {
  const sofVerifications = verifications.filter(v => v.verification_type === 'source_of_funds');
  const sowVerifications = verifications.filter(v => v.verification_type === 'source_of_wealth');

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: '#94a3b815', text: '#64748b', border: '#94a3b840' },
      in_progress: { bg: '#3b82f615', text: '#3b82f6', border: '#3b82f640' },
      verified: { bg: '#10b98115', text: '#10b981', border: '#10b98140' },
      rejected: { bg: '#ef444415', text: '#ef4444', border: '#ef444440' },
      requires_review: { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b40' }
    };
    return colors[status] || colors.pending;
  };

  return (
    <div style={styles.overviewContainer}>
      <div style={styles.summaryCards}>
        <div style={styles.summaryCard}>
          <h4 style={styles.summaryTitle}>Source of Funds</h4>
          <div style={styles.summaryValue}>
            {client.source_of_funds ? (
              <>
                <span style={styles.declaredText}>{client.source_of_funds}</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: client.source_of_funds_verified ? '#10b98115' : '#ef444415',
                  color: client.source_of_funds_verified ? '#10b981' : '#ef4444',
                  borderColor: client.source_of_funds_verified ? '#10b98140' : '#ef444440'
                }}>
                  {client.source_of_funds_verified ? 'Verified' : 'Not Verified'}
                </span>
              </>
            ) : (
              <span style={styles.notDeclared}>Not declared</span>
            )}
          </div>
          <div style={styles.verificationCount}>
            {sofVerifications.length} verification record(s)
          </div>
        </div>

        <div style={styles.summaryCard}>
          <h4 style={styles.summaryTitle}>Source of Wealth</h4>
          <div style={styles.summaryValue}>
            {client.source_of_wealth ? (
              <>
                <span style={styles.declaredText}>{client.source_of_wealth}</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: client.source_of_wealth_verified ? '#10b98115' : '#ef444415',
                  color: client.source_of_wealth_verified ? '#10b981' : '#ef4444',
                  borderColor: client.source_of_wealth_verified ? '#10b98140' : '#ef444440'
                }}>
                  {client.source_of_wealth_verified ? 'Verified' : 'Not Verified'}
                </span>
              </>
            ) : (
              <span style={styles.notDeclared}>Not declared</span>
            )}
          </div>
          <div style={styles.verificationCount}>
            {sowVerifications.length} verification record(s)
          </div>
        </div>
      </div>

      <div style={styles.actionButtons}>
        <button onClick={onCreateNew} style={styles.primaryButton}>
          + New Verification Record
        </button>
      </div>

      <div style={styles.verificationsList}>
        <h3 style={styles.sectionTitle}>Verification Records</h3>
        {verifications.length === 0 ? (
          <div style={styles.emptyState}>
            No verification records yet. Create one to start the verification process.
          </div>
        ) : (
          <div style={styles.recordsList}>
            {verifications.map(verification => {
              const statusColors = getStatusColor(verification.verification_status);
              return (
                <div
                  key={verification.id}
                  style={styles.recordCard}
                  onClick={() => onViewVerification(verification)}
                >
                  <div style={styles.recordHeader}>
                    <span style={styles.recordType}>
                      {verification.verification_type === 'source_of_funds' ? 'Source of Funds' : 'Source of Wealth'}
                    </span>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: statusColors.bg,
                      color: statusColors.text,
                      borderColor: statusColors.border
                    }}>
                      {verification.verification_status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>
                  <div style={styles.recordContent}>
                    <strong>Declared:</strong> {verification.declared_source}
                  </div>
                  {verification.estimated_amount && (
                    <div style={styles.recordContent}>
                      <strong>Amount:</strong> {verification.currency} {verification.estimated_amount.toLocaleString()}
                    </div>
                  )}
                  <div style={styles.recordFooter}>
                    <span>Created: {new Date(verification.created_at).toLocaleDateString()}</span>
                    {verification.verified_at && (
                      <span>Verified: {new Date(verification.verified_at).toLocaleDateString()}</span>
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

function VerificationDetailsTab({ verification, client, isNew, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    verification_type: verification?.verification_type || 'source_of_funds',
    declared_source: verification?.declared_source || client.source_of_funds || '',
    estimated_amount: verification?.estimated_amount || '',
    currency: verification?.currency || 'TZS',
    verification_method: verification?.verification_method || '',
    evidence_reviewed: verification?.evidence_reviewed || '',
    verification_findings: verification?.verification_findings || '',
    concerns_identified: verification?.concerns_identified || '',
    mitigation_measures: verification?.mitigation_measures || '',
    verification_status: verification?.verification_status || 'pending'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.declared_source) {
      alert('Please enter the declared source');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (isNew) {
        const { error } = await supabase
          .from('sof_sow_verification_records')
          .insert({
            client_id: client.id,
            organization_id: profile.id,
            created_by: user.id,
            ...formData
          });

        if (error) throw error;
      } else {
        const updateData = { ...formData, updated_at: new Date().toISOString() };

        if (formData.verification_status === 'verified' && !verification.verified_at) {
          updateData.verified_by = user.id;
          updateData.verified_at = new Date().toISOString();
        }

        const { error } = await supabase
          .from('sof_sow_verification_records')
          .update(updateData)
          .eq('id', verification.id);

        if (error) throw error;

        if (formData.verification_status === 'verified') {
          const field = formData.verification_type === 'source_of_funds'
            ? 'source_of_funds_verified'
            : 'source_of_wealth_verified';

          await supabase
            .from('kyc_clients')
            .update({ [field]: true })
            .eq('id', client.id);
        }
      }

      alert(isNew ? 'Verification record created successfully' : 'Verification record updated successfully');
      onSave();
      onCancel();
    } catch (error) {
      console.error('Error saving verification:', error);
      alert('Failed to save verification record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!verification) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('sof_sow_verification_records')
        .update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          verification_status: 'verified'
        })
        .eq('id', verification.id);

      if (error) throw error;

      alert('Verification approved successfully');
      onSave();
    } catch (error) {
      console.error('Error approving verification:', error);
      alert('Failed to approve verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.detailsContainer}>
      <div style={styles.formSection}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Verification Type*</label>
          <select
            value={formData.verification_type}
            onChange={(e) => setFormData({ ...formData, verification_type: e.target.value })}
            style={styles.select}
            disabled={!isNew}
          >
            <option value="source_of_funds">Source of Funds</option>
            <option value="source_of_wealth">Source of Wealth</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Declared Source*</label>
          <textarea
            value={formData.declared_source}
            onChange={(e) => setFormData({ ...formData, declared_source: e.target.value })}
            style={{ ...styles.input, minHeight: '80px' }}
            placeholder="What did the client declare as their source of funds/wealth?"
          />
        </div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Estimated Amount</label>
            <input
              type="number"
              value={formData.estimated_amount}
              onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
              style={styles.input}
              placeholder="0.00"
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              style={styles.select}
            >
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Verification Method</label>
          <input
            type="text"
            value={formData.verification_method}
            onChange={(e) => setFormData({ ...formData, verification_method: e.target.value })}
            style={styles.input}
            placeholder="e.g., Document review, Third-party verification, Client interview"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Evidence Reviewed</label>
          <textarea
            value={formData.evidence_reviewed}
            onChange={(e) => setFormData({ ...formData, evidence_reviewed: e.target.value })}
            style={{ ...styles.input, minHeight: '100px' }}
            placeholder="Describe what evidence was reviewed (documents, third-party checks, interviews, etc.) even if no formal documents were attached"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Verification Findings</label>
          <textarea
            value={formData.verification_findings}
            onChange={(e) => setFormData({ ...formData, verification_findings: e.target.value })}
            style={{ ...styles.input, minHeight: '100px' }}
            placeholder="Document your findings: Is the declared source credible? Does it align with the client profile?"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Concerns Identified</label>
          <textarea
            value={formData.concerns_identified}
            onChange={(e) => setFormData({ ...formData, concerns_identified: e.target.value })}
            style={{ ...styles.input, minHeight: '80px' }}
            placeholder="Note any red flags, inconsistencies, or areas requiring additional scrutiny"
          />
        </div>

        {formData.concerns_identified && (
          <div style={styles.formGroup}>
            <label style={styles.label}>Mitigation Measures</label>
            <textarea
              value={formData.mitigation_measures}
              onChange={(e) => setFormData({ ...formData, mitigation_measures: e.target.value })}
              style={{ ...styles.input, minHeight: '80px' }}
              placeholder="Describe actions taken to address identified concerns (enhanced monitoring, additional documentation, transaction limits, etc.)"
            />
          </div>
        )}

        <div style={styles.formGroup}>
          <label style={styles.label}>Verification Status*</label>
          <select
            value={formData.verification_status}
            onChange={(e) => setFormData({ ...formData, verification_status: e.target.value })}
            style={styles.select}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="verified">Verified</option>
            <option value="requires_review">Requires Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {verification?.verified_at && (
          <div style={styles.infoBox}>
            <strong>Verified by:</strong> {verification.verified_by}<br />
            <strong>Verified at:</strong> {new Date(verification.verified_at).toLocaleString()}
          </div>
        )}

        {verification?.approved_at && (
          <div style={{ ...styles.infoBox, borderColor: '#10b981', backgroundColor: '#10b98110' }}>
            <strong>Approved by:</strong> {verification.approved_by}<br />
            <strong>Approved at:</strong> {new Date(verification.approved_at).toLocaleString()}
          </div>
        )}
      </div>

      <div style={styles.buttonRow}>
        <button onClick={onCancel} style={styles.secondaryButton}>
          Cancel
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          {verification && formData.verification_status === 'verified' && !verification.approved_at && (
            <button onClick={handleApprove} style={styles.approveButton} disabled={submitting}>
              {submitting ? 'Approving...' : 'Senior Approval'}
            </button>
          )}
          <button onClick={handleSubmit} style={styles.primaryButton} disabled={submitting}>
            {submitting ? 'Saving...' : isNew ? 'Create Record' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistTab({ verification, checklistItems, onUpdate }) {
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (verification) {
      loadCompletions();
    }
  }, [verification]);

  const loadCompletions = async () => {
    if (!verification) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sof_sow_verification_checklist_completion')
        .select('*')
        .eq('verification_record_id', verification.id);

      if (error) throw error;

      const completionMap = {};
      (data || []).forEach(item => {
        completionMap[item.checklist_item_id] = item;
      });
      setCompletions(completionMap);
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompletion = async (checklistItemId, currentStatus) => {
    if (!verification) {
      alert('Please save the verification record first');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const newStatus = !currentStatus;

      const existing = completions[checklistItemId];

      if (existing) {
        const { error } = await supabase
          .from('sof_sow_verification_checklist_completion')
          .update({
            is_completed: newStatus,
            completed_by: newStatus ? user.id : null,
            completed_at: newStatus ? new Date().toISOString() : null
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sof_sow_verification_checklist_completion')
          .insert({
            verification_record_id: verification.id,
            checklist_item_id: checklistItemId,
            is_completed: newStatus,
            completed_by: user.id,
            completed_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      await loadCompletions();
    } catch (error) {
      console.error('Error updating completion:', error);
      alert('Failed to update checklist item');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateNotes = async (checklistItemId, notes) => {
    if (!verification) return;

    try {
      const existing = completions[checklistItemId];

      if (existing) {
        const { error } = await supabase
          .from('sof_sow_verification_checklist_completion')
          .update({ completion_notes: notes })
          .eq('id', existing.id);

        if (error) throw error;
      }

      await loadCompletions();
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  if (!verification) {
    return (
      <div style={styles.emptyState}>
        Please save the verification record first before completing the checklist.
      </div>
    );
  }

  if (loading) {
    return <div style={styles.loadingContainer}>Loading checklist...</div>;
  }

  const relevantItems = checklistItems.filter(item =>
    item.verification_type === verification.verification_type ||
    item.verification_type === 'both'
  );

  const completedCount = relevantItems.filter(item =>
    completions[item.id]?.is_completed
  ).length;
  const totalCount = relevantItems.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div style={styles.checklistContainer}>
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span>Completion Progress</span>
          <span style={styles.progressText}>{completedCount} / {totalCount}</span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      </div>

      <div style={styles.checklistItems}>
        {relevantItems.map((item, index) => {
          const completion = completions[item.id];
          const isCompleted = completion?.is_completed || false;

          return (
            <div key={item.id} style={styles.checklistItem}>
              <div style={styles.checklistItemHeader}>
                <label style={styles.checklistLabel}>
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleCompletion(item.id, isCompleted)}
                    disabled={saving}
                    style={styles.checkbox}
                  />
                  <span style={{ fontWeight: item.is_mandatory ? '600' : '400' }}>
                    {index + 1}. {item.checklist_item}
                    {item.is_mandatory && <span style={styles.mandatory}> *</span>}
                  </span>
                </label>
              </div>

              {item.guidance_text && (
                <div style={styles.guidanceText}>{item.guidance_text}</div>
              )}

              {isCompleted && (
                <div style={styles.notesSection}>
                  <textarea
                    value={completion?.completion_notes || ''}
                    onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                    onBlur={() => handleUpdateNotes(item.id, completion?.completion_notes)}
                    placeholder="Add notes about how this step was completed..."
                    style={styles.notesTextarea}
                  />
                  {completion?.completed_at && (
                    <div style={styles.completionInfo}>
                      Completed: {new Date(completion.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryTab({ verificationId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [verificationId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sof_sow_verification_history')
        .select('*')
        .eq('verification_record_id', verificationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={styles.loadingContainer}>Loading history...</div>;
  }

  return (
    <div style={styles.historyContainer}>
      {history.length === 0 ? (
        <div style={styles.emptyState}>No history records yet.</div>
      ) : (
        <div style={styles.historyList}>
          {history.map(record => (
            <div key={record.id} style={styles.historyItem}>
              <div style={styles.historyHeader}>
                <span style={styles.historyAction}>{record.action?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}</span>
                <span style={styles.historyDate}>
                  {new Date(record.created_at).toLocaleString()}
                </span>
              </div>
              {record.change_details && Object.keys(record.change_details).length > 0 && (
                <div style={styles.historyDetails}>
                  <pre style={styles.historyJson}>
                    {JSON.stringify(record.change_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    width: '100%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827'
  },
  clientName: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    color: '#6b7280'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    padding: '0 24px',
    gap: '4px'
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    fontSize: '14px',
    fontWeight: '500'
  },
  activeTab: {
    color: '#2563eb',
    borderBottomColor: '#2563eb'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px'
  },
  loadingContainer: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  overviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  summaryCard: {
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#f9fafb'
  },
  summaryTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  summaryValue: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px'
  },
  declaredText: {
    fontSize: '16px',
    color: '#111827',
    lineHeight: '1.5'
  },
  notDeclared: {
    fontSize: '14px',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  verificationCount: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid',
    width: 'fit-content'
  },
  actionButtons: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  approveButton: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  verificationsList: {
    marginTop: '8px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px'
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db'
  },
  recordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  recordCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white'
  },
  recordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  recordType: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827'
  },
  recordContent: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  recordFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6'
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#111827'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'white'
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1e40af'
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  checklistContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  progressSection: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  progressText: {
    color: '#2563eb',
    fontWeight: '600'
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    transition: 'width 0.3s ease'
  },
  checklistItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  checklistItem: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white'
  },
  checklistItemHeader: {
    marginBottom: '8px'
  },
  checklistLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#111827'
  },
  checkbox: {
    marginTop: '2px',
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  mandatory: {
    color: '#ef4444',
    fontWeight: '600'
  },
  guidanceText: {
    marginLeft: '30px',
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '4px'
  },
  notesSection: {
    marginTop: '12px',
    marginLeft: '30px'
  },
  notesTextarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#111827',
    minHeight: '60px',
    resize: 'vertical'
  },
  completionInfo: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#10b981'
  },
  historyContainer: {
    display: 'flex',
    flexDirection: 'column'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  historyItem: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white'
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  historyAction: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2563eb'
  },
  historyDate: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  historyDetails: {
    marginTop: '8px'
  },
  historyJson: {
    fontSize: '12px',
    color: '#374151',
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    margin: 0
  }
};
