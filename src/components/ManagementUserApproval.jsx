import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ManagementUserApproval({ user }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('management_user_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by BRELA number to show firm context
      const grouped = {};
      (data || []).forEach(reg => {
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
      const decryptedPassword = CryptoJS.AES.decrypt(
        registration.encrypted_password,
        'temp-encryption-key-' + registration.created_at
      ).toString(CryptoJS.enc.Utf8);

      // If no organization exists, create it
      let organizationId = registration.existing_organization_id;

      if (!organizationId) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: registration.law_firm_name,
            contact_email: registration.firm_email,
            brela_registration: registration.brela_registration_number,
            tls_registration: registration.tls_registration_number,
            business_type: 'Law Firm',
            law_firm_type: 'Private Practice',
            is_active: true,
            max_users: 5,
            subscription_tier: 'trial',
            subscription_status: 'active',
            trial_ends_at: trialEndDate.toISOString(),
            subscription_expiry_date: trialEndDate.toISOString(),
            monthly_fee: 0,
            payment_status: 'paid'
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
            email: registration.user_email,
            password: decryptedPassword || 'ChangeMe123!',
            full_name: registration.user_full_name,
            role: 'management',
            organization_id: organizationId,
            position: registration.user_position,
            created_by: user.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const { userId } = await response.json();

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

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending' },
      approved: { bg: '#d1fae5', color: '#065f46', text: 'Approved' },
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
    return (
      <div style={styles.container}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ fontSize: '16px', color: '#64748b' }}>Loading registrations...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Management User Registrations</h2>
        <p style={styles.subtitle}>
          Review and approve law firm management user registrations. Each law firm can have up to 3 management users.
          The first approved user becomes the primary contact person.
        </p>
      </div>

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
  );
}
