import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function DualApprovalInterface({ user, organizationId }) {
  const [requests, setRequests] = useState([]);
  const [approvals, setApprovals] = useState({});
  const [hasManagementAccess, setHasManagementAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      checkAccessAndLoadData();
    } else {
      console.log('DualApprovalInterface: Missing user', { user, organizationId });
      setLoading(false);
    }
  }, [user?.id, organizationId]);

  const checkAccessAndLoadData = async () => {
    try {
      setLoading(true);
      console.log('DualApprovalInterface: Checking access for', { userId: user.id, organizationId });

      // Get user profile first
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      // Check organization_user_access only if organizationId is provided
      let accessCheck = null;
      if (organizationId) {
        const { data } = await supabase
          .from('organization_user_access')
          .select('*')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .maybeSingle();
        accessCheck = data;
      }

      // User has management access if they have org access OR management role
      const hasAccess = !!accessCheck ||
        (userProfile && ['admin', 'management', 'senior_partner', 'partner'].includes(userProfile.role));

      console.log('DualApprovalInterface: Access check result', {
        hasAccess,
        accessCheck,
        userProfile,
        role: userProfile?.role
      });

      setHasManagementAccess(hasAccess);

      if (hasAccess) {
        await loadRequests();
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      // First get the requests
      // If organizationId is provided, filter by it. If null (admin), show all requests
      let query = supabase
        .from('role_upgrade_requests')
        .select('*')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) {
        console.error('Error loading requests:', requestsError);
        throw requestsError;
      }

      // Then manually fetch user profiles for each request
      if (requestsData && requestsData.length > 0) {
        const userIds = [...new Set([
          ...requestsData.map(r => r.user_id),
          ...requestsData.map(r => r.requested_by).filter(Boolean)
        ])];

        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        if (usersError) {
          console.error('Error loading user profiles:', usersError);
        }

        // Map user data to requests
        const usersMap = {};
        (usersData || []).forEach(u => {
          usersMap[u.id] = u;
        });

        requestsData.forEach(request => {
          request.user = usersMap[request.user_id] || null;
          request.requester = usersMap[request.requested_by] || null;
        });
      }

      console.log('Loaded requests:', requestsData);
      setRequests(requestsData || []);

      // Load approvals
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('role_upgrade_approvals')
        .select('*')
        .eq('organization_id', organizationId);

      if (approvalsError) {
        console.error('Error loading approvals:', approvalsError);
        throw approvalsError;
      }

      // Manually fetch approver profiles
      if (approvalsData && approvalsData.length > 0) {
        const approverIds = [...new Set(approvalsData.map(a => a.approver_user_id))];

        const { data: approversData, error: approversError } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .in('id', approverIds);

        if (approversError) {
          console.error('Error loading approver profiles:', approversError);
        }

        const approversMap = {};
        (approversData || []).forEach(a => {
          approversMap[a.id] = a;
        });

        approvalsData.forEach(approval => {
          approval.approver = approversMap[approval.approver_user_id] || null;
        });
      }

      const approvalsByRequest = {};
      (approvalsData || []).forEach(approval => {
        if (!approvalsByRequest[approval.request_id]) {
          approvalsByRequest[approval.request_id] = [];
        }
        approvalsByRequest[approval.request_id].push(approval);
      });
      setApprovals(approvalsByRequest);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      const { data, error } = await supabase.rpc('process_role_upgrade_approval', {
        p_request_id: requestId,
        p_approver_id: user.id
      });

      if (error) throw error;

      if (data.success) {
        alert(data.message);
        await loadRequests();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + error.message);
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('role_upgrade_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Request rejected successfully');
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    }
  };

  const styles = {
    container: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    header: {
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e5e7eb'
    },
    title: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#0a1929',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#64748b',
      lineHeight: '1.6'
    },
    requestCard: {
      background: '#f8fafc',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      border: '1px solid #e5e7eb'
    },
    requestHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '12px'
    },
    userInfo: {
      flex: 1
    },
    userName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#0a1929',
      marginBottom: '4px'
    },
    userEmail: {
      fontSize: '13px',
      color: '#64748b'
    },
    badge: {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600'
    },
    requestDetails: {
      background: 'white',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '12px'
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '14px'
    },
    approvalSection: {
      background: 'white',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '12px'
    },
    approvalTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#0a1929',
      marginBottom: '12px'
    },
    approvalItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px',
      background: '#f1f5f9',
      borderRadius: '6px',
      marginBottom: '6px',
      fontSize: '13px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px'
    },
    approveButton: {
      padding: '10px 20px',
      background: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    rejectButton: {
      padding: '10px 20px',
      background: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer'
    },
    emptyState: {
      padding: '40px',
      textAlign: 'center',
      color: '#64748b',
      fontSize: '14px'
    },
    noAccessMessage: {
      padding: '24px',
      background: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      color: '#92400e',
      fontSize: '14px'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          Loading...
        </div>
      </div>
    );
  }

  if (!hasManagementAccess) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Role Upgrade Requests - Dual Approval</div>
        <div style={styles.subtitle}>
          Each request requires approval from 2 of the 3 authorized management users.
          You cannot approve your own requests.
        </div>
      </div>

      {requests.length === 0 ? (
        <div style={styles.emptyState}>
          No pending role upgrade requests
        </div>
      ) : (
        requests.map(request => {
          const requestApprovals = approvals[request.id] || [];
          const hasUserApproved = requestApprovals.some(a => a.approver_user_id === user.id);
          const isOwnRequest = request.user_id === user.id;
          const isRequester = request.requested_by === user.id;
          const canApprove = !hasUserApproved && !isOwnRequest && !isRequester && request.status === 'pending';

          return (
            <div key={request.id} style={styles.requestCard}>
              <div style={styles.requestHeader}>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{request.user?.full_name}</div>
                  <div style={styles.userEmail}>{request.user?.email}</div>
                </div>
                <div style={{
                  ...styles.badge,
                  background: request.status === 'approved' ? '#d1fae5' : '#fef3c7',
                  color: request.status === 'approved' ? '#065f46' : '#92400e'
                }}>
                  {request.status}
                </div>
              </div>

              <div style={styles.requestDetails}>
                <div style={styles.detailRow}>
                  <span style={{ color: '#64748b' }}>Requested Role:</span>
                  <span style={{ fontWeight: '600', color: '#0a1929' }}>
                    {request.requested_role}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={{ color: '#64748b' }}>Current Role:</span>
                  <span>{request.current_user_role}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={{ color: '#64748b' }}>Requested:</span>
                  <span>{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
                {request.requester && (
                  <div style={styles.detailRow}>
                    <span style={{ color: '#64748b' }}>Requested By:</span>
                    <span style={{ fontWeight: '600' }}>{request.requester.full_name}</span>
                  </div>
                )}
                {request.justification && (
                  <div style={{ ...styles.detailRow, borderBottom: 'none', display: 'block', paddingTop: '12px' }}>
                    <div style={{ color: '#64748b', marginBottom: '4px' }}>Justification:</div>
                    <div style={{ color: '#0a1929' }}>{request.justification}</div>
                  </div>
                )}
              </div>

              <div style={styles.approvalSection}>
                <div style={styles.approvalTitle}>
                  Approvals: {request.approvals_count || 0} / {request.approvals_required || 2}
                </div>
                {requestApprovals.length > 0 ? (
                  requestApprovals.map(approval => (
                    <div key={approval.id} style={styles.approvalItem}>
                      <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                      <span style={{ fontWeight: '600', marginRight: '8px' }}>
                        {approval.approver?.full_name}
                      </span>
                      <span style={{ color: '#64748b' }}>
                        on {new Date(approval.approved_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                    No approvals yet
                  </div>
                )}
              </div>

              {request.status === 'pending' && (
                <div style={styles.buttonGroup}>
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={!canApprove}
                    style={{
                      ...styles.approveButton,
                      opacity: canApprove ? 1 : 0.5,
                      cursor: canApprove ? 'pointer' : 'not-allowed'
                    }}
                    title={
                      isOwnRequest
                        ? 'Cannot approve - you are the subject of this request'
                        : isRequester
                        ? 'Cannot approve - you created this request'
                        : hasUserApproved
                        ? 'You have already approved this request'
                        : 'Approve this request'
                    }
                  >
                    {hasUserApproved ? 'Already Approved' : isOwnRequest ? 'Your Request' : isRequester ? 'You Requested' : 'Approve'}
                  </button>
                  {!isOwnRequest && (
                    <button
                      onClick={() => handleReject(request.id)}
                      style={styles.rejectButton}
                    >
                      Reject
                    </button>
                  )}
                </div>
              )}

              {request.status === 'approved' && (
                <div style={{
                  padding: '12px',
                  background: '#d1fae5',
                  borderRadius: '6px',
                  color: '#065f46',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Request Approved - Role Updated
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
