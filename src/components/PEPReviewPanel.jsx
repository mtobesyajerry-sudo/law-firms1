import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';
import { fmtDate } from '../utils/dateFormat';

const PEPReviewPanel = () => {
  const [pepClients, setPepClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [assessmentForm, setAssessmentForm] = useState({
    notes: '',
    sowSofReference: '',
    familyAssociates: '',
    enhancedMonitoring: false,
  });

  const [approvalForm, setApprovalForm] = useState({
    notes: '',
    seniorApproverName: '',
    enhancedMonitoring: false,
  });

  // Load user profile for role-based UI
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('role, organization_id')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(prof);
      } catch {
        // ignore — role checks enforced server-side
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  const isStaff = profile?.role === 'staff';
  const isComplianceOfficer = profile?.role === 'compliance_officer';
  const isMlro = profile?.role === 'mlro';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'system_admin';
  const isSenior = isMlro || isAdmin;
  const canSubmitAssessment = isComplianceOfficer || isMlro || isAdmin;
  const canApprove = isSenior;

  const fetchPepClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof?.organization_id) return;

      const { data: clients, error: clientError } = await supabase
        .from('kyc_clients_decrypted')
        .select('id, client_name, pep_status, pep_confirmed_at, pep_confirmed_by, pep_senior_approver_name, pep_senior_approved_at, pep_senior_approval_notes, pep_sow_sof_reference, pep_family_associates, pep_enhanced_monitoring, senior_approval_status, current_dd_level, created_at, updated_at')
        .eq('organization_id', prof.organization_id)
        .eq('pep_status', true)
        .order('created_at', { ascending: false });

      if (clientError) throw clientError;

      setPepClients(clients || []);
    } catch {
      setError('Failed to load PEP clients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profileLoading) {
      fetchPepClients();
    }
  }, [profileLoading, fetchPepClients]);

  const handleExpandCard = (clientId) => {
    setExpandedId(expandedId === clientId ? null : clientId);
    setAssessmentForm({ notes: '', sowSofReference: '', familyAssociates: '', enhancedMonitoring: false });
    setApprovalForm({ notes: '', seniorApproverName: '', enhancedMonitoring: false });
  };

  const handleAssessmentChange = (field, value) => {
    setAssessmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleApprovalChange = (field, value) => {
    setApprovalForm((prev) => ({ ...prev, [field]: value }));
  };

  const callApprovePep = async (clientId, action, payload) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-pep`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ client_id: clientId, action, ...payload }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleSubmitAssessment = async (client) => {
    try {
      setSubmitting(true);
      setError(null);

      await callApprovePep(client.id, 'submit_assessment', {
        notes: assessmentForm.notes,
        sow_sof_reference: assessmentForm.sowSofReference,
        family_associates: assessmentForm.familyAssociates,
        enhanced_monitoring: assessmentForm.enhancedMonitoring,
      });

      setSuccessMessage(`Assessment submitted for ${client.client_name || 'client'} — awaiting senior approval.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setExpandedId(null);
      await fetchPepClients();
    } catch (err) {
      setError(err.message || 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (client) => {
    try {
      setSubmitting(true);
      setError(null);

      await callApprovePep(client.id, 'approve', {
        notes: approvalForm.notes,
        senior_approver_name: approvalForm.seniorApproverName,
        enhanced_monitoring: approvalForm.enhancedMonitoring,
      });

      setSuccessMessage(`PEP senior approval completed for ${client.client_name || 'client'}.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setExpandedId(null);
      await fetchPepClients();
    } catch (err) {
      setError(err.message || 'Failed to approve PEP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (client) => {
    try {
      setSubmitting(true);
      setError(null);

      await callApprovePep(client.id, 'reject', {
        notes: approvalForm.notes,
        senior_approver_name: approvalForm.seniorApproverName,
      });

      setSuccessMessage(`PEP review rejected for ${client.client_name || 'client'}.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      setExpandedId(null);
      await fetchPepClients();
    } catch (err) {
      setError(err.message || 'Failed to reject PEP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Styles (match existing dark/gold theme) ---
  const containerStyle = { backgroundColor: '#0a1929', borderRadius: '8px', padding: '24px', marginBottom: '24px' };
  const headerStyle = { color: '#d4af37', fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' };
  const cardStyle = { backgroundColor: '#1a2f45', border: '1px solid #d4af37', borderRadius: '6px', padding: '16px', marginBottom: '16px', cursor: 'pointer', transition: 'all 0.3s ease' };
  const cardHoverStyle = { ...cardStyle, backgroundColor: '#2a3d5c', boxShadow: '0 0 10px rgba(212,175,55,0.25)' };
  const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e2e8f0' };
  const clientNameStyle = { fontSize: '18px', fontWeight: 'bold', color: '#d4af37' };
  const detailsStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '12px', fontSize: '14px', color: '#e2e8f0' };
  const detailItemStyle = { display: 'flex', justifyContent: 'space-between' };
  const labelStyle = { fontWeight: '600', color: '#d4af37' };
  const formSectionStyle = { marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(212,175,55,0.25)' };
  const formGroupStyle = { marginBottom: '16px' };
  const formLabelStyle = { display: 'block', color: '#d4af37', fontWeight: '600', marginBottom: '6px', fontSize: '14px' };
  const formInputStyle = { width: '100%', padding: '10px', backgroundColor: '#0a1929', border: '1px solid #d4af37', borderRadius: '4px', color: '#e2e8f0', fontSize: '14px', boxSizing: 'border-box' };
  const formTextAreaStyle = { ...formInputStyle, minHeight: '80px', resize: 'vertical' };
  const checkboxContainerStyle = { display: 'flex', alignItems: 'center', gap: '8px' };
  const checkboxStyle = { width: '18px', height: '18px', cursor: 'pointer', accentColor: '#d4af37' };
  const buttonContainerStyle = { display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap' };
  const submitButtonStyle = { padding: '10px 24px', backgroundColor: '#d4af37', color: '#0a1929', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s ease' };
  const rejectButtonStyle = { ...submitButtonStyle, backgroundColor: '#c41e3a', color: '#fff' };
  const cancelButtonStyle = { padding: '10px 24px', backgroundColor: 'transparent', color: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };
  const emptyStateStyle = { textAlign: 'center', padding: '48px 24px', color: '#e2e8f0' };
  const emptyStateTitleStyle = { fontSize: '20px', fontWeight: 'bold', color: '#d4af37', marginBottom: '8px' };
  const errorStyle = { backgroundColor: '#5c2c2c', border: '1px solid #c41e3a', color: '#ff6b6b', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' };
  const successStyle = { backgroundColor: '#2c5c2c', border: '1px solid #3ba83b', color: '#7cfc7c', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' };
  const stepLabelStyle = { fontSize: '13px', fontWeight: '600', color: '#d4af37', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const statusBadgeStyle = (status) => ({
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: status === 'approved' ? 'rgba(72,187,120,0.2)' : status === 'pending_senior' ? 'rgba(237,137,54,0.2)' : status === 'rejected' ? 'rgba(196,30,58,0.2)' : 'rgba(160,174,192,0.15)',
    color: status === 'approved' ? '#48bb78' : status === 'pending_senior' ? '#ed8936' : status === 'rejected' ? '#f56565' : '#a0aec0',
    border: `1px solid ${status === 'approved' ? '#48bb78' : status === 'pending_senior' ? '#ed8936' : status === 'rejected' ? '#f56565' : '#a0aec0'}`,
  });
  const roleNoticeStyle = { backgroundColor: 'rgba(237,137,54,0.1)', border: '1px solid #ed8936', borderRadius: '4px', padding: '10px 14px', marginBottom: '16px', color: '#ed8936', fontSize: '13px' };

  if (loading || profileLoading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>PEP Review Queue</div>
        <LoadingSpinner />
      </div>
    );
  }

  const getStatusLabel = (status) => {
    if (status === 'approved') return 'Approved';
    if (status === 'pending_senior') return 'Awaiting Senior Approval';
    if (status === 'rejected') return 'Rejected';
    if (status === 'pending') return 'Pending Review';
    return 'Not Started';
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>PEP Review Queue</div>

      {error && <div style={errorStyle}>{error}</div>}
      {successMessage && <div style={successStyle}>{successMessage}</div>}

      {pepClients.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyStateTitleStyle}>No PEP Clients Pending Review</div>
          <p>All politically exposed persons have been reviewed, or no clients are currently flagged as PEPs.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
            {pepClients.length} PEP client{pepClients.length !== 1 ? 's' : ''} requiring review
          </div>

          {pepClients.map((client) => {
            const isApproved = client.senior_approval_status === 'approved';
            const isRejected = client.senior_approval_status === 'rejected';
            const isPendingSenior = client.senior_approval_status === 'pending_senior';
            const canActOnThis = !isApproved && !isRejected;

            return (
              <div
                key={client.id}
                style={hoveredCardId === client.id ? cardHoverStyle : cardStyle}
                onMouseEnter={() => setHoveredCardId(client.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                onClick={() => canActOnThis && handleExpandCard(client.id)}
              >
                <div style={cardHeaderStyle}>
                  <div>
                    <div style={clientNameStyle}>
                      {client.client_name || 'Unknown Client'}
                    </div>
                    <div style={detailsStyle}>
                      <div style={detailItemStyle}>
                        <span style={labelStyle}>Status:</span>
                        <span style={statusBadgeStyle(client.senior_approval_status)}>
                          {getStatusLabel(client.senior_approval_status)}
                        </span>
                      </div>
                      <div style={detailItemStyle}>
                        <span style={labelStyle}>DD Level:</span>
                        <span>{client.current_dd_level || 'N/A'}</span>
                      </div>
                      {client.pep_confirmed_at && (
                        <div style={detailItemStyle}>
                          <span style={labelStyle}>Confirmed:</span>
                          <span>{fmtDate(client.pep_confirmed_at)}</span>
                        </div>
                      )}
                      {client.pep_senior_approver_name && (
                        <div style={detailItemStyle}>
                          <span style={labelStyle}>Approver:</span>
                          <span>{client.pep_senior_approver_name}</span>
                        </div>
                      )}
                      {client.pep_enhanced_monitoring && (
                        <div style={detailItemStyle}>
                          <span style={labelStyle}>Enhanced Monitoring:</span>
                          <span style={{ color: '#ed8936' }}>Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={statusBadgeStyle(client.senior_approval_status)}>
                      {getStatusLabel(client.senior_approval_status)}
                    </span>
                    {canActOnThis && (
                      <div style={{ fontSize: '20px', color: '#d4af37' }}>
                        {expandedId === client.id ? '\u25BC' : '\u25B6'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Existing assessment details (if submitted) */}
                {isPendingSenior && client.pep_senior_approval_notes && (
                  <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'rgba(212,175,55,0.08)', borderRadius: '4px', fontSize: '13px', color: '#e2e8f0' }}>
                    <div style={{ fontWeight: '600', color: '#d4af37', marginBottom: '4px' }}>CO Assessment Notes:</div>
                    {client.pep_senior_approval_notes}
                    {client.pep_sow_sof_reference && (
                      <div style={{ marginTop: '6px' }}><span style={{ color: '#d4af37' }}>SOW/SOF Ref:</span> {client.pep_sow_sof_reference}</div>
                    )}
                  </div>
                )}

                {expandedId === client.id && canActOnThis && (
                  <div style={formSectionStyle} onClick={(e) => e.stopPropagation()}>
                    {/* Step 1: Submit Assessment (CO) */}
                    {canSubmitAssessment && !isPendingSenior && (
                      <>
                        <div style={stepLabelStyle}>Step 1 — Submit PEP Assessment (Compliance Officer)</div>
                        <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
                          Prepare the PEP review. This will be forwarded for senior sign-off.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={formGroupStyle}>
                            <label style={formLabelStyle}>Source of Wealth/Funds Reference</label>
                            <input type="text" value={assessmentForm.sowSofReference} onChange={(e) => handleAssessmentChange('sowSofReference', e.target.value)} placeholder="Reference documentation" style={formInputStyle} />
                          </div>
                          <div style={formGroupStyle}>
                            <label style={formLabelStyle}>Family & Associates Notes</label>
                            <input type="text" value={assessmentForm.familyAssociates} onChange={(e) => handleAssessmentChange('familyAssociates', e.target.value)} placeholder="Notable family members or associates" style={formInputStyle} />
                          </div>
                        </div>

                        <div style={formGroupStyle}>
                          <label style={formLabelStyle}>Assessment Notes *</label>
                          <textarea value={assessmentForm.notes} onChange={(e) => handleAssessmentChange('notes', e.target.value)} placeholder="Detailed assessment of PEP risk factors, source of wealth review, and recommended actions (min 10 characters)" style={formTextAreaStyle} />
                        </div>

                        <div style={formGroupStyle}>
                          <div style={checkboxContainerStyle}>
                            <input type="checkbox" id={`assess-mon-${client.id}`} checked={assessmentForm.enhancedMonitoring} onChange={(e) => handleAssessmentChange('enhancedMonitoring', e.target.checked)} style={checkboxStyle} />
                            <label htmlFor={`assess-mon-${client.id}`} style={{ color: '#e2e8f0', cursor: 'pointer' }}>
                              Recommend Enhanced Monitoring
                            </label>
                          </div>
                        </div>

                        <div style={buttonContainerStyle}>
                          <button onClick={() => handleExpandCard(client.id)} style={cancelButtonStyle}>Cancel</button>
                          <button
                            onClick={() => handleSubmitAssessment(client)}
                            disabled={submitting || assessmentForm.notes.trim().length < 10}
                            style={{ ...submitButtonStyle, opacity: submitting || assessmentForm.notes.trim().length < 10 ? 0.6 : 1, cursor: submitting || assessmentForm.notes.trim().length < 10 ? 'not-allowed' : 'pointer' }}
                          >
                            {submitting ? 'Submitting...' : 'Submit for Senior Approval'}
                          </button>
                        </div>
                      </>
                    )}

                    {/* Step 2: Senior Approval (MLRO/Admin only) */}
                    {canApprove && isPendingSenior && (
                      <>
                        <div style={stepLabelStyle}>Step 2 — Senior PEP Approval (MLRO / Admin)</div>
                        <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
                          A compliance officer has submitted an assessment. Review and provide final sign-off.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={formGroupStyle}>
                            <label style={formLabelStyle}>Senior Approver Name *</label>
                            <input type="text" value={approvalForm.seniorApproverName} onChange={(e) => handleApprovalChange('seniorApproverName', e.target.value)} placeholder="Your full name" style={formInputStyle} />
                          </div>
                        </div>

                        <div style={formGroupStyle}>
                          <label style={formLabelStyle}>Senior Approval Notes *</label>
                          <textarea value={approvalForm.notes} onChange={(e) => handleApprovalChange('notes', e.target.value)} placeholder="Final approval decision and rationale (min 10 characters)" style={formTextAreaStyle} />
                        </div>

                        <div style={formGroupStyle}>
                          <div style={checkboxContainerStyle}>
                            <input type="checkbox" id={`approve-mon-${client.id}`} checked={approvalForm.enhancedMonitoring} onChange={(e) => handleApprovalChange('enhancedMonitoring', e.target.checked)} style={checkboxStyle} />
                            <label htmlFor={`approve-mon-${client.id}`} style={{ color: '#e2e8f0', cursor: 'pointer' }}>
                              Require Enhanced Monitoring
                            </label>
                          </div>
                        </div>

                        <div style={buttonContainerStyle}>
                          <button onClick={() => handleExpandCard(client.id)} style={cancelButtonStyle}>Cancel</button>
                          <button
                            onClick={() => handleReject(client)}
                            disabled={submitting || approvalForm.notes.trim().length < 10}
                            style={{ ...rejectButtonStyle, opacity: submitting || approvalForm.notes.trim().length < 10 ? 0.6 : 1, cursor: submitting || approvalForm.notes.trim().length < 10 ? 'not-allowed' : 'pointer' }}
                          >
                            {submitting ? 'Processing...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => handleApprove(client)}
                            disabled={submitting || approvalForm.notes.trim().length < 10 || approvalForm.seniorApproverName.trim().length < 2}
                            style={{ ...submitButtonStyle, opacity: submitting || approvalForm.notes.trim().length < 10 || approvalForm.seniorApproverName.trim().length < 2 ? 0.6 : 1, cursor: submitting || approvalForm.notes.trim().length < 10 || approvalForm.seniorApproverName.trim().length < 2 ? 'not-allowed' : 'pointer' }}
                          >
                            {submitting ? 'Processing...' : 'Confirm Senior Approval'}
                          </button>
                        </div>
                      </>
                    )}

                    {/* Two-tier collapse: same person does both steps */}
                    {canApprove && !isPendingSenior && canSubmitAssessment && (
                      <>
                        <div style={stepLabelStyle}>Step 1 — Submit PEP Assessment</div>
                        <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
                          As both Compliance Officer and MLRO, you will submit the assessment first, then confirm senior approval.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={formGroupStyle}>
                            <label style={formLabelStyle}>Source of Wealth/Funds Reference</label>
                            <input type="text" value={assessmentForm.sowSofReference} onChange={(e) => handleAssessmentChange('sowSofReference', e.target.value)} placeholder="Reference documentation" style={formInputStyle} />
                          </div>
                          <div style={formGroupStyle}>
                            <label style={formLabelStyle}>Family & Associates Notes</label>
                            <input type="text" value={assessmentForm.familyAssociates} onChange={(e) => handleAssessmentChange('familyAssociates', e.target.value)} placeholder="Notable family members or associates" style={formInputStyle} />
                          </div>
                        </div>

                        <div style={formGroupStyle}>
                          <label style={formLabelStyle}>Assessment Notes *</label>
                          <textarea value={assessmentForm.notes} onChange={(e) => handleAssessmentChange('notes', e.target.value)} placeholder="Detailed assessment of PEP risk factors (min 10 characters)" style={formTextAreaStyle} />
                        </div>

                        <div style={formGroupStyle}>
                          <div style={checkboxContainerStyle}>
                            <input type="checkbox" id={`assess-mon-${client.id}`} checked={assessmentForm.enhancedMonitoring} onChange={(e) => handleAssessmentChange('enhancedMonitoring', e.target.checked)} style={checkboxStyle} />
                            <label htmlFor={`assess-mon-${client.id}`} style={{ color: '#e2e8f0', cursor: 'pointer' }}>
                              Recommend Enhanced Monitoring
                            </label>
                          </div>
                        </div>

                        <div style={buttonContainerStyle}>
                          <button onClick={() => handleExpandCard(client.id)} style={cancelButtonStyle}>Cancel</button>
                          <button
                            onClick={() => handleSubmitAssessment(client)}
                            disabled={submitting || assessmentForm.notes.trim().length < 10}
                            style={{ ...submitButtonStyle, opacity: submitting || assessmentForm.notes.trim().length < 10 ? 0.6 : 1, cursor: submitting || assessmentForm.notes.trim().length < 10 ? 'not-allowed' : 'pointer' }}
                          >
                            {submitting ? 'Submitting...' : 'Submit for Senior Approval'}
                          </button>
                        </div>
                      </>
                    )}

                    {/* Staff view-only notice */}
                    {isStaff && (
                      <div style={roleNoticeStyle}>
                        You have view-only access. PEP assessments and senior approvals can only be performed by Compliance Officers and MLROs.
                      </div>
                    )}

                    {/* CO-only (no mlro) can submit but not approve */}
                    {isComplianceOfficer && !isSenior && isPendingSenior && (
                      <div style={roleNoticeStyle}>
                        Assessment submitted. Awaiting senior approval from an MLRO or Admin.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PEPReviewPanel;
