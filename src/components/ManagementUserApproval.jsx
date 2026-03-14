import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

export default function ManagementUserApproval({ user }) {
  const [registrations, setRegistrations] = useState([]);
  const [newUserRequests, setNewUserRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);

      // Load both management_user_registrations and new_user_requests
      const [regData, newUserData] = await Promise.all([
        supabase
          .from('management_user_registrations')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('new_user_requests')
          .select('*, organizations(name)')
          .order('created_at', { ascending: false })
      ]);

      if (regData.error) throw regData.error;
      if (newUserData.error) throw newUserData.error;

      // Group by BRELA number to show firm context
      const grouped = {};
      (regData.data || []).forEach(reg => {
        if (!grouped[reg.brela_registration_number]) {
          grouped[reg.brela_registration_number] = {
            law_firm_name: reg.law_firm_name,
            brela: reg.brela_registration_number,
            registrations: []
          };
        }
        grouped[reg.brela_registration_number].registrations.push(reg);
      });

      setRegistrations(Object.values(grouped));
      setNewUserRequests(newUserData.data || []);
    } catch (error) {
      console.error('Error loading registrations:', error);
      alert('Error loading registrations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (registration) => {
    if (!confirm(`Approve registration for ${registration.user_full_name}?`)) {
      return;
    }

    setProcessing(registration.id);
    try {
      const CryptoJS = (await import('crypto-js')).default;
      const ENCRYPTION_KEY = 'user-registration-encryption-key-2026';
      let decryptedPassword = '';

      try {
        decryptedPassword = CryptoJS.AES.decrypt(
          registration.encrypted_password,
          ENCRYPTION_KEY
        ).toString(CryptoJS.enc.Utf8);

        if (!decryptedPassword || decryptedPassword.length < 8) {
          throw new Error('Password decryption failed or password too short');
        }
      } catch (decryptError) {
        console.error('Password decryption error:', decryptError);
        alert('Error: Failed to decrypt user password. The registration may be corrupted. Please ask the user to register again.');
        setProcessing(null);
        return;
      }

      // If no organization exists, create it
      let organizationId = registration.existing_organization_id;

      if (!organizationId) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: registration.law_firm_name,
            contact_email: registration.firm_email,
            brela_registration: registration.brela_registration_number,
            tls_registration: registration.tls_registration_number,
            business_type: 'law_firm',
            law_firm_type: 'small_firm',
            is_active: true,
            max_users: 5
          })
          .select()
          .single();

        if (orgError) throw orgError;
        organizationId = orgData.id;
      }

      // Create the user account using edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            admin_user_id: user.id,
            email: registration.user_email,
            password: decryptedPassword,
            full_name: registration.user_full_name,
            role: 'management',
            organization_id: organizationId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const { user: createdUser } = await response.json();
      const userId = createdUser?.id;

      // Update registration status
      const { error: updateError } = await supabase
        .from('management_user_registrations')
        .update({
          registration_status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          created_user_id: userId,
          existing_organization_id: organizationId
        })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      alert(`User ${registration.user_full_name} approved successfully! They can now log in with their credentials.`);
      await loadRegistrations();
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Error approving registration: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const rejectRegistration = async (registration) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessing(registration.id);
    try {
      const { error } = await supabase
        .from('management_user_registrations')
        .update({
          registration_status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', registration.id);

      if (error) throw error;

      alert('Registration rejected');
      await loadRegistrations();
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Error rejecting registration: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const approveNewUserRequest = async (request) => {
    if (!confirm(`Approve user request for ${request.full_name}?`)) {
      return;
    }

    setProcessing(request.id);
    try {
      const CryptoJS = (await import('crypto-js')).default;
      const ENCRYPTION_KEY = 'user-registration-encryption-key-2026';
      let decryptedPassword = '';

      try {
        decryptedPassword = CryptoJS.AES.decrypt(
          request.encrypted_temporary_password,
          ENCRYPTION_KEY
        ).toString(CryptoJS.enc.Utf8);

        if (!decryptedPassword || decryptedPassword.length < 8) {
          throw new Error('Password decryption failed or password too short');
        }
      } catch (decryptError) {
        console.error('Password decryption error:', decryptError);
        alert('Error: Failed to decrypt user password. The request may be corrupted. Please ask the user to resubmit the request.');
        setProcessing(null);
        return;
      }

      // Create the user account using edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            admin_user_id: user.id,
            email: request.email,
            password: decryptedPassword,
            full_name: request.full_name,
            role: request.requested_access || 'client',
            organization_id: request.organization_id,
            position: request.position
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const { user: createdUser } = await response.json();
      const userId = createdUser?.id;

      // Update request status
      const { error: updateError } = await supabase
        .from('new_user_requests')
        .update({
          status: 'completed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          created_user_id: userId
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      alert(`User ${request.full_name} approved successfully! They can now log in with their credentials.`);
      await loadRegistrations();
    } catch (error) {
      console.error('Error approving user request:', error);
      alert('Error approving user request: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const rejectNewUserRequest = async (request) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('new_user_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', request.id);

      if (error) throw error;

      alert('User request rejected');
      await loadRegistrations();
    } catch (error) {
      console.error('Error rejecting user request:', error);
      alert('Error rejecting user request: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending' },
      approved: { bg: '#d1fae5', color: '#065f46', text: 'Approved' },
      completed: { bg: '#d1fae5', color: '#065f46', text: 'Completed' },
      rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Rejected' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span style={{
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
        background: badge.bg,
        color: badge.color
      }}>
        {badge.text}
      </span>
    );
  };

  const styles = {
    container: {
      padding: '0'
    },
    header: {
      marginBottom: '32px'
    },
    title: {
      fontSize: '22px',
      fontWeight: '700',
      color: '#0a1929',
      margin: '0 0 8px 0'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      lineHeight: '1.6',
      margin: 0
    },
    firmCard: {
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      border: '2px solid #d4af37',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
    },
    firmHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: '2px solid #f1f5f9'
    },
    firmName: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#0a1929'
    },
    brelaNumber: {
      fontSize: '13px',
      color: '#64748b',
      marginTop: '4px'
    },
    userCountBadge: {
      padding: '8px 16px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '700',
      background: '#dbeafe',
      color: '#1e40af'
    },
    userCard: {
      background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px'
    },
    userHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    userName: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '4px'
    },
    userEmail: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '8px'
    },
    userDetail: {
      fontSize: '13px',
      color: '#475569',
      marginBottom: '4px'
    },
    primaryBadge: {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
      color: '#0a1929',
      marginTop: '8px',
      display: 'inline-block'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '16px'
    },
    approveButton: {
      flex: 1,
      padding: '12px 20px',
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    rejectButton: {
      flex: 1,
      padding: '12px 20px',
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    emptyState: {
      padding: '60px 20px',
      textAlign: 'center',
      background: '#f8fafc',
      border: '2px dashed #cbd5e1',
      borderRadius: '12px',
      color: '#64748b',
      fontSize: '16px'
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px',
      opacity: 0.5
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  const totalPendingCount =
    registrations.reduce((sum, firm) =>
      sum + firm.registrations.filter(r => r.registration_status === 'pending').length, 0
    ) + newUserRequests.filter(r => r.status === 'pending').length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>User Registrations & Requests</h2>
        <p style={styles.subtitle}>
          Review and approve user registrations and requests. {totalPendingCount > 0 && (
            <strong style={{ color: '#d97706' }}>
              {totalPendingCount} pending approval{totalPendingCount !== 1 ? 's' : ''}
            </strong>
          )}
        </p>
      </div>

      {/* New User Requests Section */}
      {newUserRequests.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#0a1929',
            marginBottom: '16px',
            paddingBottom: '12px',
            borderBottom: '2px solid #e2e8f0'
          }}>
            New User Requests ({newUserRequests.filter(r => r.status === 'pending').length} pending)
          </h3>
          {newUserRequests.map(request => (
            <div key={request.id} style={styles.userCard}>
              <div style={styles.userHeader}>
                <div style={{ flex: 1 }}>
                  <div style={styles.userName}>{request.full_name}</div>
                  <div style={styles.userEmail}>{request.email}</div>
                  <div style={styles.userDetail}>Position: {request.position || 'Not specified'}</div>
                  <div style={styles.userDetail}>
                    Organization: {request.organizations?.name || 'Unknown'}
                  </div>
                  <div style={styles.userDetail}>
                    Requested Access: {request.requested_access || 'client'}
                  </div>
                  {request.reason && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#475569'
                    }}>
                      <strong>Reason:</strong> {request.reason}
                    </div>
                  )}
                  <div style={styles.userDetail}>
                    Submitted: {new Date(request.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  {getStatusBadge(request.status)}
                </div>
              </div>

              {request.status === 'pending' && (
                <div style={styles.buttonGroup}>
                  <button
                    onClick={() => approveNewUserRequest(request)}
                    disabled={processing === request.id}
                    style={styles.approveButton}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                  >
                    {processing === request.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => rejectNewUserRequest(request)}
                    disabled={processing === request.id}
                    style={styles.rejectButton}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                  >
                    Reject
                  </button>
                </div>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#fee2e2',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#991b1b'
                }}>
                  <strong>Rejection Reason:</strong> {request.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Management User Registrations Section */}
      <div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: '#0a1929',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '2px solid #e2e8f0'
        }}>
          Law Firm Management Registrations
        </h3>

        {registrations.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <div>No registration requests found</div>
          </div>
        ) : (
          registrations.map(firm => (
          <div key={firm.brela} style={styles.firmCard}>
            <div style={styles.firmHeader}>
              <div>
                <div style={styles.firmName}>{firm.law_firm_name}</div>
                <div style={styles.brelaNumber}>BRELA: {firm.brela}</div>
              </div>
              <div style={styles.userCountBadge}>
                {firm.registrations.filter(r => r.registration_status === 'approved').length}/3 Approved
              </div>
            </div>

            {firm.registrations.map(reg => (
              <div key={reg.id} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.userName}>{reg.user_full_name}</div>
                    <div style={styles.userEmail}>{reg.user_email}</div>
                    <div style={styles.userDetail}>Position: {reg.user_position}</div>
                    <div style={styles.userDetail}>Mobile: {reg.mobile_number || 'Not provided'}</div>
                    <div style={styles.userDetail}>
                      Submitted: {new Date(reg.created_at).toLocaleDateString()}
                    </div>
                    {reg.is_primary_contact && (
                      <div style={styles.primaryBadge}>PRIMARY CONTACT</div>
                    )}
                  </div>
                  <div>
                    {getStatusBadge(reg.registration_status)}
                  </div>
                </div>

                {reg.registration_status === 'pending' && (
                  <div style={styles.buttonGroup}>
                    <button
                      onClick={() => approveRegistration(reg)}
                      disabled={processing === reg.id}
                      style={styles.approveButton}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                    >
                      {processing === reg.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => rejectRegistration(reg)}
                      disabled={processing === reg.id}
                      style={styles.rejectButton}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                    >
                      Reject
                    </button>
                  </div>
                )}

                {reg.registration_status === 'rejected' && reg.rejection_reason && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#991b1b'
                  }}>
                    <strong>Rejection Reason:</strong> {reg.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
      </div>
    </div>
  );
}
