import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

const PEPReviewPanel = () => {
  const [pepMatches, setPepMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hoveredCardId, setHoveredCardId] = useState(null);

  const [formData, setFormData] = useState({
    pepStatus: 'approved',
    seniorApproverName: '',
    sowSofReference: '',
    familyAssociates: '',
    enhancedMonitoring: false,
    approvalNotes: '',
  });

  useEffect(() => {
    fetchPepMatches();
  }, []);

  const fetchPepMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: matches, error: matchError } = await supabase
        .from('screening_matches')
        .select('*')
        .not('pep_category', 'is', null)
        .in('status', ['pending_review', 'pending_second_review']);

      if (matchError) throw matchError;

      const matchesWithClients = await Promise.all(
        matches.map(async (match) => {
          const { data: clientData, error: clientError } = await supabase
            .from('kyc_clients_decrypted')
            .select('*')
            .eq('id', match.kyc_client_id)
            .maybeSingle();

          if (clientError) return { ...match, client: null };
          return { ...match, client: clientData };
        })
      );

      setPepMatches(matchesWithClients);
    } catch (err) {
      setError('Failed to load PEP matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandCard = (matchId) => {
    setExpandedId(expandedId === matchId ? null : matchId);
    if (expandedId !== matchId) {
      setFormData({
        pepStatus: 'approved',
        seniorApproverName: '',
        sowSofReference: '',
        familyAssociates: '',
        enhancedMonitoring: false,
        approvalNotes: '',
      });
    }
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (match) => {
    try {
      setSubmitting(true);

      const { error: updateError } = await supabase
        .from('kyc_clients')
        .update({
          pep_status: formData.pepStatus,
          pep_senior_approver_name: formData.seniorApproverName,
          pep_sow_sof_reference: formData.sowSofReference,
          pep_family_associates: formData.familyAssociates,
          pep_enhanced_monitoring: formData.enhancedMonitoring,
          pep_senior_approval_notes: formData.approvalNotes,
          pep_confirmed_at: new Date().toISOString(),
        })
        .eq('id', match.kyc_client_id);

      if (updateError) throw updateError;

      const { error: statusError } = await supabase
        .from('screening_matches')
        .update({ status: 'completed' })
        .eq('id', match.id);

      if (statusError) throw statusError;

      setSuccessMessage(`PEP review completed for ${match.client?.client_name || 'client'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setExpandedId(null);
      await fetchPepMatches();
    } catch (err) {
      setError('Failed to save PEP review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
  const buttonContainerStyle = { display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' };
  const submitButtonStyle = { padding: '10px 24px', backgroundColor: '#d4af37', color: '#0a1929', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s ease' };
  const cancelButtonStyle = { padding: '10px 24px', backgroundColor: 'transparent', color: '#e2e8f0', border: '1px solid #e2e8f0', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' };
  const emptyStateStyle = { textAlign: 'center', padding: '48px 24px', color: '#e2e8f0' };
  const emptyStateTitleStyle = { fontSize: '20px', fontWeight: 'bold', color: '#d4af37', marginBottom: '8px' };
  const errorStyle = { backgroundColor: '#5c2c2c', border: '1px solid #c41e3a', color: '#ff6b6b', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' };
  const successStyle = { backgroundColor: '#2c5c2c', border: '1px solid #3ba83b', color: '#7cfc7c', padding: '12px 16px', borderRadius: '4px', marginBottom: '16px' };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>PEP Review Queue</div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>PEP Review Queue</div>

      {error && <div style={errorStyle}>{error}</div>}
      {successMessage && <div style={successStyle}>{successMessage}</div>}

      {pepMatches.length === 0 ? (
        <div style={emptyStateStyle}>
          <div style={emptyStateTitleStyle}>No PEP Matches Pending Review</div>
          <p>All politically exposed persons have been reviewed.</p>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
            {pepMatches.length} match{pepMatches.length !== 1 ? 'es' : ''} pending review
          </div>

          {pepMatches.map((match) => (
            <div
              key={match.id}
              style={hoveredCardId === match.id ? cardHoverStyle : cardStyle}
              onMouseEnter={() => setHoveredCardId(match.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              onClick={() => handleExpandCard(match.id)}
            >
              <div style={cardHeaderStyle}>
                <div>
                  <div style={clientNameStyle}>
                    {match.client?.client_name || 'Unknown Client'}
                  </div>
                  <div style={detailsStyle}>
                    <div style={detailItemStyle}>
                      <span style={labelStyle}>PEP Category:</span>
                      <span>{match.pep_category}</span>
                    </div>
                    <div style={detailItemStyle}>
                      <span style={labelStyle}>Match Score:</span>
                      <span>{match.match_score ? `${(match.match_score * 100).toFixed(0)}%` : 'N/A'}</span>
                    </div>
                    <div style={detailItemStyle}>
                      <span style={labelStyle}>Status:</span>
                      <span>{match.status}</span>
                    </div>
                    <div style={detailItemStyle}>
                      <span style={labelStyle}>Screened:</span>
                      <span>{match.screened_at ? new Date(match.screened_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '20px', color: '#d4af37' }}>
                  {expandedId === match.id ? '\u25BC' : '\u25B6'}
                </div>
              </div>

              {expandedId === match.id && (
                <div style={formSectionStyle} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d4af37', marginBottom: '16px' }}>
                    Enhanced Due Diligence Review
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={formGroupStyle}>
                      <label style={formLabelStyle}>Decision *</label>
                      <select value={formData.pepStatus} onChange={(e) => handleFormChange('pepStatus', e.target.value)} style={formInputStyle}>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="enhanced_monitoring">Enhanced Monitoring</option>
                      </select>
                    </div>

                    <div style={formGroupStyle}>
                      <label style={formLabelStyle}>Senior Approver Name *</label>
                      <input type="text" value={formData.seniorApproverName} onChange={(e) => handleFormChange('seniorApproverName', e.target.value)} placeholder="Full name" style={formInputStyle} />
                    </div>

                    <div style={formGroupStyle}>
                      <label style={formLabelStyle}>Source of Wealth/Funds Reference</label>
                      <input type="text" value={formData.sowSofReference} onChange={(e) => handleFormChange('sowSofReference', e.target.value)} placeholder="Reference documentation" style={formInputStyle} />
                    </div>

                    <div style={formGroupStyle}>
                      <label style={formLabelStyle}>Family &amp; Associates Notes</label>
                      <input type="text" value={formData.familyAssociates} onChange={(e) => handleFormChange('familyAssociates', e.target.value)} placeholder="Notable family members or associates" style={formInputStyle} />
                    </div>
                  </div>

                  <div style={formGroupStyle}>
                    <label style={formLabelStyle}>Senior Approval Notes</label>
                    <textarea value={formData.approvalNotes} onChange={(e) => handleFormChange('approvalNotes', e.target.value)} placeholder="Detailed notes on your review and decision" style={formTextAreaStyle} />
                  </div>

                  <div style={formGroupStyle}>
                    <div style={checkboxContainerStyle}>
                      <input type="checkbox" id={`enhanced-${match.id}`} checked={formData.enhancedMonitoring} onChange={(e) => handleFormChange('enhancedMonitoring', e.target.checked)} style={checkboxStyle} />
                      <label htmlFor={`enhanced-${match.id}`} style={{ color: '#e2e8f0', cursor: 'pointer' }}>
                        Require Enhanced Monitoring
                      </label>
                    </div>
                  </div>

                  <div style={buttonContainerStyle}>
                    <button onClick={() => handleExpandCard(match.id)} style={cancelButtonStyle}>Cancel</button>
                    <button
                      onClick={() => handleSubmit(match)}
                      disabled={submitting || !formData.seniorApproverName}
                      style={{ ...submitButtonStyle, opacity: submitting || !formData.seniorApproverName ? 0.6 : 1, cursor: submitting || !formData.seniorApproverName ? 'not-allowed' : 'pointer' }}
                    >
                      {submitting ? 'Saving...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PEPReviewPanel;
