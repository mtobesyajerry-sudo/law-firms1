import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const ROLE_OPTIONS = [
  { value: 'staff', label: 'Staff', description: 'Administrative and support functions' },
  { value: 'compliance_officer', label: 'Compliance Officer', description: 'Monitor compliance and risk management' },
  { value: 'mlro', label: 'MLRO (Money Laundering Reporting Officer)', description: 'Senior compliance oversight' },
  { value: 'management', label: 'Management', description: 'Team management and oversight' },
  { value: 'senior_partner', label: 'Senior Partner', description: 'Senior leadership role' }
];

export default function RoleUpgradeRequestForm({ onClose, onSuccess }) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingRequests, setExistingRequests] = useState([]);
  const [formData, setFormData] = useState({
    requested_role: '',
    justification: ''
  });

  useEffect(() => {
    fetchExistingRequests();
  }, []);

  const fetchExistingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('role_upgrade_requests')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.requested_role) {
        throw new Error('Please select a role');
      }

      if (!formData.justification || formData.justification.trim().length < 20) {
        throw new Error('Please provide a detailed justification (at least 20 characters)');
      }

      const hasPendingRequest = existingRequests.some(
        req => req.status === 'pending' && req.requested_role === formData.requested_role
      );

      if (hasPendingRequest) {
        throw new Error('You already have a pending request for this role');
      }

      const { error: insertError } = await supabase
        .from('role_upgrade_requests')
        .insert({
          user_id: profile.id,
          organization_id: profile.organization_id,
          current_user_role: profile.role,
          requested_role: formData.requested_role,
          justification: formData.justification,
          status: 'pending',
          requested_by: profile.id,
          approvals_count: 0,
          approvals_required: 2,
          approved_by_user_ids: []
        });

      if (insertError) throw insertError;

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(10, 25, 41, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '24px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
          padding: '32px 40px',
          borderBottom: '3px solid #d4af37'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '28px',
                fontWeight: '700',
                color: 'white',
                letterSpacing: '-0.5px'
              }}>
                Role Access Request
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#d4af37',
                fontWeight: '500'
              }}>
                Submit a request to upgrade your access level
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                width: '40px',
                height: '40px',
                fontSize: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{
          padding: '32px 40px',
          overflowY: 'auto',
          flex: 1
        }}>

          {existingRequests.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#0a1929',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>📋</span>
                Request History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {existingRequests.map((request) => (
                  <div key={request.id} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '20px',
                    background: request.status === 'approved' ? '#f0fdf4' : request.status === 'rejected' ? '#fef2f2' : '#f9fafb',
                    borderLeft: `4px solid ${request.status === 'approved' ? '#10b981' : request.status === 'rejected' ? '#dc2626' : '#f59e0b'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          fontWeight: '700',
                          fontSize: '17px',
                          color: '#0a1929'
                        }}>
                          {ROLE_OPTIONS.find(r => r.value === request.requested_role)?.label || request.requested_role}
                        </span>
                        <span style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: request.status === 'approved' ? '#d1fae5' : request.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                          color: request.status === 'approved' ? '#065f46' : request.status === 'rejected' ? '#991b1b' : '#92400e'
                        }}>
                          {getStatusText(request.status)}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                        Why I need this access:
                      </div>
                      <div style={{ fontSize: '14px', color: '#0a1929', lineHeight: '1.7' }}>
                        {request.justification}
                      </div>
                    </div>
                    {request.status === 'rejected' && request.rejection_reason && (
                      <div style={{
                        padding: '14px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}>
                        <p style={{
                          fontSize: '13px',
                          color: '#991b1b',
                          margin: 0,
                          lineHeight: '1.5'
                        }}>
                          <strong style={{ fontWeight: '600' }}>Rejected:</strong> {request.rejection_reason}
                        </p>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Submitted: {new Date(request.created_at).toLocaleDateString()}
                      {request.status === 'approved' && request.reviewed_at && (
                        <> • Approved: {new Date(request.reviewed_at).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '28px',
              marginBottom: '24px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0a1929',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>📝</span>
                New Access Request
              </h3>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Requested Role <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.requested_role}
                  onChange={(e) => setFormData({ ...formData, requested_role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #cbd5e1',
                    borderRadius: '10px',
                    background: 'white',
                    color: '#0a1929',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#d4af37';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                >
                  <option value="">Select a role to request...</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {formData.requested_role && (
                  <p style={{
                    marginTop: '8px',
                    fontSize: '13px',
                    color: '#64748b',
                    fontStyle: 'italic'
                  }}>
                    {ROLE_OPTIONS.find(r => r.value === formData.requested_role)?.description}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '0' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Justification <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #cbd5e1',
                    borderRadius: '10px',
                    background: 'white',
                    color: '#0a1929',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#d4af37';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 175, 55, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Provide a detailed explanation of why this role is necessary for your work. Include your current responsibilities, relevant experience, and how this access will benefit the organization..."
                  required
                />
                <div style={{
                  marginTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <p style={{
                    fontSize: '12px',
                    color: formData.justification.length < 20 ? '#dc2626' : '#10b981',
                    fontWeight: '600',
                    margin: 0
                  }}>
                    {formData.justification.length >= 20 ? '✓ ' : ''}
                    {formData.justification.length} / 20 characters minimum
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <p style={{
                  fontSize: '14px',
                  color: '#991b1b',
                  margin: 0,
                  fontWeight: '500'
                }}>
                  {error}
                </p>
              </div>
            )}
          </form>
        </div>

        <div style={{
          padding: '24px 40px',
          background: '#f8fafc',
          borderTop: '2px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '12px 28px',
              background: 'white',
              border: '2px solid #cbd5e1',
              borderRadius: '10px',
              color: '#475569',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 32px',
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
              border: '2px solid #d4af37',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(10, 25, 41, 0.2)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(10, 25, 41, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(10, 25, 41, 0.2)';
              }
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Submitting...
              </span>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
