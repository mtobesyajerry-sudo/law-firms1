import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function InstitutionalUserManagement({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [processing, setProcessing] = useState(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    position: '',
    requested_role: 'staff',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('institutional_user_requests')
        .select(`
          *,
          requested_by_user:user_profiles!institutional_user_requests_requested_by_fkey(full_name, email),
          first_approver_user:user_profiles!institutional_user_requests_first_approver_fkey(full_name),
          second_approver_user:user_profiles!institutional_user_requests_second_approver_fkey(full_name)
        `)
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      alert('Error loading requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    setProcessing('create');
    try {
      const CryptoJS = (await import('crypto-js')).default;
      const encryptedPassword = CryptoJS.AES.encrypt(
        formData.password,
        'temp-encryption-key-' + Date.now()
      ).toString();

      const { error } = await supabase
        .from('institutional_user_requests')
        .insert({
          organization_id: user.organization_id,
          full_name: formData.full_name,
          email: formData.email,
          position: formData.position,
          requested_role: formData.requested_role,
          encrypted_password: encryptedPassword,
          requested_by: user.id,
          request_status: 'pending'
        });

      if (error) throw error;

      alert('User request created successfully! Waiting for approval.');
      setShowCreateForm(false);
      setFormData({
        full_name: '',
        email: '',
        position: '',
        requested_role: 'staff',
        password: '',
        confirmPassword: ''
      });
      await loadRequests();
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Error creating request: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const approveRequest = async (request) => {
    if (!confirm(`Approve ${request.requested_role} user: ${request.full_name}?`)) {
      return;
    }

    setProcessing(request.id);
    try {
      const CryptoJS = (await import('crypto-js')).default;
      const decryptedPassword = CryptoJS.AES.decrypt(
        request.encrypted_password,
        'temp-encryption-key-' + request.created_at
      ).toString(CryptoJS.enc.Utf8);

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
            email: request.email,
            password: decryptedPassword || 'ChangeMe123!',
            full_name: request.full_name,
            role: request.requested_role,
            organization_id: user.organization_id,
            position: request.position,
            created_by: user.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const { userId } = await response.json();

      // Update request status
      const { error: updateError } = await supabase
        .from('institutional_user_requests')
        .update({
          request_status: 'approved',
          first_approver: user.id,
          first_approved_at: new Date().toISOString(),
          created_user_id: userId
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      alert(`User ${request.full_name} approved successfully! They can now log in.`);
      await loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const rejectRequest = async (request) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setProcessing(request.id);
    try {
      const { error } = await supabase
        .from('institutional_user_requests')
        .update({
          request_status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', request.id);

      if (error) throw error;

      alert('Request rejected');
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
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

  const getRoleBadge = (role) => {
    const badges = {
      staff: { bg: '#dbeafe', color: '#1e40af', text: 'Staff' },
      compliance_officer: { bg: '#fce7f3', color: '#9f1239', text: 'Compliance Officer' }
    };
    const badge = badges[role] || badges.staff;
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
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '32px'
    },
    headerContent: {
      flex: 1
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
    createButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #d4af37, #f4d03f)',
      color: '#0a1929',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 4px 12px rgba(212,175,55,0.3)'
    },
    form: {
      background: 'white',
      borderRadius: '16px',
      padding: '28px',
      marginBottom: '32px',
      border: '2px solid #d4af37',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
    },
    formTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '24px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '2px solid #cbd5e1',
      borderRadius: '8px',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '15px',
      border: '2px solid #cbd5e1',
      borderRadius: '8px',
      outline: 'none',
      cursor: 'pointer',
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      marginTop: '24px'
    },
    submitButton: {
      flex: 1,
      padding: '14px 24px',
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    cancelButton: {
      flex: 1,
      padding: '14px 24px',
      background: '#64748b',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    requestCard: {
      background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '16px'
    },
    requestHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '16px'
    },
    requestName: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '4px'
    },
    requestEmail: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '8px'
    },
    requestDetail: {
      fontSize: '13px',
      color: '#475569',
      marginBottom: '4px'
    },
    badges: {
      display: 'flex',
      gap: '8px',
      flexDirection: 'column',
      alignItems: 'flex-end'
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
          <div style={{ fontSize: '16px', color: '#64748b' }}>Loading user requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h2 style={styles.title}>Institutional User Management</h2>
          <p style={styles.subtitle}>
            Create and manage staff and compliance officer accounts for your organization.
            New users will be able to log in through the main login page once approved.
          </p>
        </div>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            style={styles.createButton}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            + Create User Request
          </button>
        )}
      </div>

      {showCreateForm && (
        <div style={styles.form}>
          <div style={styles.formTitle}>Create New User Request</div>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Position *</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                style={styles.input}
                placeholder="e.g., Associate, Paralegal, Compliance Manager"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Role *</label>
              <select
                value={formData.requested_role}
                onChange={(e) => setFormData({ ...formData, requested_role: e.target.value })}
                style={styles.select}
                required
              >
                <option value="staff">Staff</option>
                <option value="compliance_officer">Compliance Officer</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={styles.input}
                minLength={8}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Password *</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                style={styles.input}
                minLength={8}
                required
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="submit"
                disabled={processing === 'create'}
                style={styles.submitButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
              >
                {processing === 'create' ? 'Creating...' : 'Create Request'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={styles.cancelButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#475569'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#64748b'}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {requests.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👥</div>
          <div>No user requests found</div>
        </div>
      ) : (
        requests.map(request => (
          <div key={request.id} style={styles.requestCard}>
            <div style={styles.requestHeader}>
              <div style={{ flex: 1 }}>
                <div style={styles.requestName}>{request.full_name}</div>
                <div style={styles.requestEmail}>{request.email}</div>
                <div style={styles.requestDetail}>Position: {request.position}</div>
                <div style={styles.requestDetail}>
                  Requested by: {request.requested_by_user?.full_name}
                </div>
                <div style={styles.requestDetail}>
                  Date: {new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={styles.badges}>
                {getRoleBadge(request.requested_role)}
                {getStatusBadge(request.request_status)}
              </div>
            </div>

            {request.request_status === 'pending' && request.requested_by !== user.id && (
              <div style={styles.buttonGroup}>
                <button
                  onClick={() => approveRequest(request)}
                  disabled={processing === request.id}
                  style={styles.approveButton}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                >
                  {processing === request.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => rejectRequest(request)}
                  disabled={processing === request.id}
                  style={styles.rejectButton}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                >
                  Reject
                </button>
              </div>
            )}

            {request.request_status === 'rejected' && request.rejection_reason && (
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
        ))
      )}
    </div>
  );
}
