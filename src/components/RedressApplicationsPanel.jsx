import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const RedressApplicationsPanel = ({ matchId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);

  const [formData, setFormData] = useState({
    applicant_name: '',
    applicant_contact: '',
    grounds_for_redress: '',
    supporting_documents_reference: '',
  });

  useEffect(() => {
    fetchApplications();
  }, [matchId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('redress_applications')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setApplications(data || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load applications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.applicant_name.trim() || !formData.grounds_for_redress.trim()) {
      setError('Applicant name and grounds for redress are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const { error: insertError } = await supabase
        .from('redress_applications')
        .insert([{
          match_id: matchId,
          applicant_name: formData.applicant_name.trim(),
          applicant_contact: formData.applicant_contact.trim(),
          grounds_for_redress: formData.grounds_for_redress.trim(),
          supporting_documents_reference: formData.supporting_documents_reference.trim(),
          status: 'pending',
          organization_id: userId,
          created_at: new Date().toISOString(),
        }]);

      if (insertError) throw insertError;

      setSuccessMessage('Redress application submitted successfully');
      setFormData({ applicant_name: '', applicant_contact: '', grounds_for_redress: '', supporting_documents_reference: '' });
      setTimeout(() => setSuccessMessage(null), 5000);
      await fetchApplications();
    } catch (err) {
      setError(`Failed to submit application: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (applicationId) => {
    if (!editingStatus) return;

    try {
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const { error: updateError } = await supabase
        .from('redress_applications')
        .update({ status: editingStatus, reviewed_by: userId, reviewed_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      setSuccessMessage('Application status updated');
      setTimeout(() => setSuccessMessage(null), 5000);
      setEditingId(null);
      setEditingStatus(null);
      await fetchApplications();
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    }
  };

  const statusBadgeStyle = (status) => {
    const map = {
      pending: { bg: '#f57c00', text: '#fff' },
      under_review: { bg: '#1976d2', text: '#fff' },
      granted: { bg: '#388e3c', text: '#fff' },
      denied: { bg: '#d32f2f', text: '#fff' },
    };
    const c = map[status] || map.pending;
    return { backgroundColor: c.bg, color: c.text, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-block' };
  };

  const messageStyle = (type) => ({
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    backgroundColor: type === 'error' ? 'rgba(211,47,47,0.2)' : 'rgba(56,142,60,0.2)',
    color: type === 'error' ? '#ff8a80' : '#81c784',
    border: `1px solid ${type === 'error' ? '#d32f2f' : '#388e3c'}`,
  });

  const containerStyle = { backgroundColor: '#0a1929', color: '#e2e8f0', borderRadius: '8px', padding: '24px' };
  const warningBannerStyle = { backgroundColor: '#d32f2f', color: '#fff', border: '3px solid #ff9800', borderRadius: '8px', padding: '16px', marginBottom: '24px', fontSize: '16px', fontWeight: '600', lineHeight: '1.5', boxShadow: '0 4px 12px rgba(211,47,47,0.4)' };
  const sectionTitleStyle = { fontSize: '20px', fontWeight: '700', color: '#d4af37', marginBottom: '16px', marginTop: '24px', borderBottom: '2px solid #d4af37', paddingBottom: '8px' };
  const applicationCardStyle = { backgroundColor: '#1a2f45', border: '1px solid #d4af37', borderRadius: '6px', padding: '16px', marginBottom: '12px' };
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#d4af37', textTransform: 'uppercase', marginBottom: '4px', marginTop: '12px' };
  const inputStyle = { width: '100%', backgroundColor: '#0a1929', border: '1px solid #d4af37', color: '#e2e8f0', padding: '10px', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '12px' };
  const textareaStyle = { ...inputStyle, minHeight: '100px', fontFamily: 'inherit', resize: 'vertical' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };
  const buttonStyle = { backgroundColor: '#d4af37', color: '#0a1929', border: 'none', padding: '10px 20px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginRight: '8px', marginTop: '12px' };
  const secondaryButtonStyle = { backgroundColor: 'transparent', color: '#d4af37', border: '2px solid #d4af37', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginRight: '8px' };

  return (
    <div style={containerStyle}>
      <div style={warningBannerStyle}>
        IMPORTANT: Granted status does NOT automatically lift the TFS freeze. A separate administrative process with the FIU is required.
      </div>

      {error && <div style={messageStyle('error')}>{error}</div>}
      {successMessage && <div style={messageStyle('success')}>{successMessage}</div>}

      <div>
        <h2 style={sectionTitleStyle}>Existing Redress Applications</h2>

        {loading ? (
          <p style={{ color: '#e2e8f0' }}>Loading applications...</p>
        ) : applications.length === 0 ? (
          <p style={{ color: '#e2e8f0' }}>No redress applications for this match yet.</p>
        ) : (
          applications.map(app => (
            <div key={app.id} style={applicationCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: '#d4af37' }}>{app.applicant_name}</h3>
                  <p style={{ margin: '0', fontSize: '12px', color: '#e2e8f0' }}>
                    Applied: {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={statusBadgeStyle(app.status)}>
                  {app.status.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Contact</label>
                <p style={{ margin: '0', fontSize: '14px', wordBreak: 'break-word' }}>{app.applicant_contact || 'Not provided'}</p>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Grounds for Redress</label>
                <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4' }}>{app.grounds_for_redress}</p>
              </div>

              {app.supporting_documents_reference && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Supporting Documents</label>
                  <p style={{ margin: '0', fontSize: '14px' }}>{app.supporting_documents_reference}</p>
                </div>
              )}

              {app.reviewer_notes && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Reviewer Notes</label>
                  <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.4' }}>{app.reviewer_notes}</p>
                </div>
              )}

              {editingId === app.id ? (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#0a1929', borderRadius: '4px' }}>
                  <label style={labelStyle}>Update Status</label>
                  <select value={editingStatus || app.status} onChange={(e) => setEditingStatus(e.target.value)} style={selectStyle}>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="granted">Granted</option>
                    <option value="denied">Denied</option>
                  </select>
                  <button onClick={() => handleStatusUpdate(app.id)} style={buttonStyle}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = '#e8c547')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = '#d4af37')}>
                    Save Status
                  </button>
                  <button onClick={() => { setEditingId(null); setEditingStatus(null); }} style={secondaryButtonStyle}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setEditingId(app.id); setEditingStatus(app.status); }} style={secondaryButtonStyle}>
                  Update Status
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div>
        <h2 style={sectionTitleStyle}>Submit New Redress Application</h2>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Applicant Name *</label>
          <input type="text" name="applicant_name" value={formData.applicant_name} onChange={handleInputChange} placeholder="Full name of the applicant" style={inputStyle} required />

          <label style={labelStyle}>Contact Information</label>
          <input type="text" name="applicant_contact" value={formData.applicant_contact} onChange={handleInputChange} placeholder="Email, phone, or mailing address" style={inputStyle} />

          <label style={labelStyle}>Grounds for Redress *</label>
          <textarea name="grounds_for_redress" value={formData.grounds_for_redress} onChange={handleInputChange} placeholder="Detailed explanation of why the TFS freeze should be lifted" style={textareaStyle} required />

          <label style={labelStyle}>Supporting Documents Reference</label>
          <input type="text" name="supporting_documents_reference" value={formData.supporting_documents_reference} onChange={handleInputChange} placeholder="File names, URLs, or case numbers of supporting documents" style={inputStyle} />

          <button type="submit" disabled={submitting}
            style={{ ...buttonStyle, opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => !submitting && (e.target.style.backgroundColor = '#e8c547')}
            onMouseLeave={(e) => !submitting && (e.target.style.backgroundColor = '#d4af37')}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RedressApplicationsPanel;
