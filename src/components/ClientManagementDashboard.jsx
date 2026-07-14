/**
 * ORGANIZATION MANAGEMENT DASHBOARD
 *
 * This is the organization-level management dashboard for partners, senior partners, and management roles.
 *
 * Organization Managers can:
 * - Manage users WITHIN their organization only
 * - View and manage KYC clients for their organization
 * - Handle matters and cases for their organization
 * - Review assessments for their organization
 * - Manage transaction alerts for their organization
 *
 * DO NOT CONFUSE WITH:
 * - ManagementDashboard: System Administrator dashboard (role='admin', organization_id=NULL)
 * - System admins manage ALL organizations; org managers manage ONLY their organization
 *
 * Access: Users with role IN ('management', 'senior_partner', 'partner') AND organization_id IS NOT NULL
 * Route: /dashboard/management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { dashboardStyles } from '../utils/dashboardStyles';
import DualApprovalInterface from './DualApprovalInterface';
import NewUserRequestForm from './NewUserRequestForm';
import MatterManagement from './MatterManagement';
import { hidesMatters } from '../utils/sectorLabels';
import { fmtDate, fmtDateTime } from '../utils/dateFormat';

export default function ClientManagementDashboard() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const isInsurance = hidesMatters(organization?.sector);

  const getBackRoute = () => {
    return '/client/dashboard';
  };

  const [kycClients, setKycClients] = useState([]);
  const [matters, setMatters] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [transactionAlerts, setTransactionAlerts] = useState([]);
  const [roleUpgradeRequests, setRoleUpgradeRequests] = useState([]);
  const [newUserRequests, setNewUserRequests] = useState([]);
  const [newUserRequestApprovals, setNewUserRequestApprovals] = useState([]);
  const [organizationUsers, setOrganizationUsers] = useState([]);
  const [selectedUserForRoleChange, setSelectedUserForRoleChange] = useState(null);
  const [showRoleChangeModal, setShowRoleChangeModal] = useState(false);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [justification, setJustification] = useState('');
  const [statistics, setStatistics] = useState({
    totalClients: 0,
    activeMatters: 0,
    pendingReviews: 0,
    highRiskClients: 0,
    sanctionedClients: 0,
    openAlerts: 0,
    matterAlerts: 0,
    pendingRoleRequests: 0,
    pendingAccessRequests: 0
  });

  useEffect(() => {
    loadData();
  }, [organization?.id]);

  const loadData = async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      // Query all data in parallel including optional tables
      let alertsRes = { data: [], error: null };
      let matterAlertsRes = { data: [], error: null };

      const optionalQueries = await Promise.allSettled([
        supabase
          .from('transaction_alerts')
          .select('id, alert_type, alert_severity, alert_score, investigation_status')
          .eq('organization_id', organization.id)
          .in('investigation_status', ['new', 'assigned'])
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('matter_aml_alerts')
          .select('id, matter_name, alert_status')
          .eq('organization_id', organization.id)
          .limit(50)
      ]);

      if (optionalQueries[0].status === 'fulfilled') {
        alertsRes = optionalQueries[0].value;
      }
      if (optionalQueries[1].status === 'fulfilled') {
        matterAlertsRes = optionalQueries[1].value;
      }

      const [clientsRes, mattersRes, assessmentsRes, roleRequestsRes, newUserRequestsRes, approvalsRes, usersRes] = await Promise.all([
        supabase
          .from('kyc_clients_decrypted')
          .select('id, client_name, current_risk_rating, pep_status, created_at')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('matters')
          .select('id, matter_name, status, created_at')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('assessments')
          .select('id, entity_category, overall_risk_rating, status, created_at')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('role_upgrade_requests')
          .select('id, user_id, status, created_at, user_profiles!role_upgrade_requests_user_id_fkey(full_name, email, role)')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('new_user_requests')
          .select('id, full_name, email, status, created_at, requested_access, position, reason, organization_id')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('new_user_request_approvals')
          .select(`
            request_id,
            approver_id,
            approval_status,
            new_user_requests!inner(organization_id)
          `)
          .eq('new_user_requests.organization_id', organization.id)
          .limit(200),
        supabase
          .from('user_profiles')
          .select('id, full_name, email, role, is_active, created_at')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      const clients = clientsRes.data || [];
      const mattersData = mattersRes.data || [];
      const assessmentsData = assessmentsRes.data || [];
      const alertsData = alertsRes.data || [];
      const matterAlertsData = matterAlertsRes.data || [];
      const roleRequests = roleRequestsRes.data || [];
      const newUserReqs = newUserRequestsRes.data || [];
      const approvals = approvalsRes.data || [];
      const users = usersRes.data || [];

      // Log errors for debugging
      if (roleRequestsRes.error) {
        console.error('Error loading role requests:', roleRequestsRes.error);
      }
      if (newUserRequestsRes.error) {
        console.error('Error loading new user requests:', newUserRequestsRes.error);
      }
      if (usersRes.error) {
        console.error('Error loading users:', usersRes.error);
      }

      console.log('=== CLIENT MANAGEMENT DASHBOARD DEBUG ===');
      console.log('Organization ID:', organization.id);
      console.log('Profile:', profile);
      console.log('Users Response:', usersRes);
      console.log('Users Data:', users);
      console.log('Users Count:', users.length);
      console.log('Role upgrade requests loaded:', roleRequests);
      console.log('New user requests loaded:', newUserReqs);
      console.log('Approvals loaded:', approvals);
      console.log('Pending requests:', roleRequests.filter(r => r.status === 'pending'));

      setKycClients(clients);
      setMatters(mattersData);
      setAssessments(assessmentsData);
      setTransactionAlerts(alertsData);
      setRoleUpgradeRequests(roleRequests);
      setNewUserRequests(newUserReqs);
      setNewUserRequestApprovals(approvals);
      setOrganizationUsers(users);

      setStatistics({
        totalClients: clients.length,
        activeMatters: mattersData.filter(m => m.status === 'active').length,
        pendingReviews: clients.filter(c => c.onboarding_status === 'pending').length,
        highRiskClients: clients.filter(c => c.current_risk_rating?.toLowerCase() === 'high').length,
        sanctionedClients: clients.filter(c => (c.sanctions_screening?.status === 'match_found') || c.pep_status === 'confirmed').length,
        openAlerts: alertsData.length,
        matterAlerts: matterAlertsData.length,
        pendingRoleRequests: roleRequests.filter(r => r.status === 'pending' && r.user_id !== profile?.id).length,
        pendingAccessRequests: newUserReqs.filter(r => r.status === 'pending').length
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId, userId, requestedRole) => {
    if (!confirm(`Approve this role upgrade request to ${requestedRole}?`)) {
      return;
    }

    try {
      // Update user role
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: requestedRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update request status
      const { error: requestError } = await supabase
        .from('role_upgrade_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      alert('Role upgrade request approved successfully!');
      loadData();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request: ' + error.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Enter rejection reason (optional):');

    try {
      const { error } = await supabase
        .from('role_upgrade_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          rejection_reason: reason || 'No reason provided'
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Role upgrade request rejected.');
      loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request: ' + error.message);
    }
  };

  const handleCreateRoleChangeRequest = async () => {
    if (!selectedUserForRoleChange || !newRole || !justification.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!confirm(`Create role change request for ${selectedUserForRoleChange.full_name}?\n\nCurrent Role: ${selectedUserForRoleChange.role}\nNew Role: ${newRole}\n\nThis request will require approval from 2 other management users (not including you).`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('role_upgrade_requests')
        .insert({
          user_id: selectedUserForRoleChange.id,
          organization_id: organization.id,
          current_user_role: selectedUserForRoleChange.role,
          requested_role: newRole,
          justification: justification,
          status: 'pending',
          approvals_required: 2,
          approvals_count: 0,
          approved_by_user_ids: [],
          requested_by: profile.id
        });

      if (error) throw error;

      alert(`Role change request created successfully!\n\nFor: ${selectedUserForRoleChange.full_name}\nFrom: ${selectedUserForRoleChange.role} → ${newRole}\n\nThis request will be visible to other management users for approval.`);

      setShowRoleChangeModal(false);
      setSelectedUserForRoleChange(null);
      setNewRole('');
      setJustification('');
      loadData();
    } catch (error) {
      console.error('Error creating role change request:', error);
      alert('Failed to create request: ' + error.message);
    }
  };

  const handleApproveAccessRequest = async (request) => {
    const email = prompt(`Enter email address for ${request.full_name}:`);
    if (!email || !email.includes('@')) {
      alert('Valid email address is required');
      return;
    }

    if (!confirm(`Create account for ${request.full_name} (${email}) as ${request.requested_access}?`)) {
      return;
    }

    const tempPassword = prompt('Enter temporary password for this user (min 6 characters):');
    if (!tempPassword || tempPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const organizationName = prompt('Enter organization name (optional):') || organization?.name || 'Default Organization';

    try {
      // First, create or get the organization
      let orgId = organization?.id;

      if (!orgId) {
        // Create a new organization if none exists
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName,
            business_type: 'law_firm',
            sector: 'law_firm'
          })
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = newOrg.id;
      }

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          admin_user_id: profile.id,
          email: email,
          password: tempPassword,
          full_name: request.full_name,
          role: request.requested_access,
          organization_id: orgId
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to create user: ${error.message || JSON.stringify(error)}`);
      }

      if (!data?.success) {
        console.error('Edge function returned error:', data);
        throw new Error(data?.error || 'Failed to create user');
      }

      const { error: updateError } = await supabase
        .from('public_access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          created_user_id: data?.user?.id,
          email: email,
          organization_name: organizationName
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`User created but failed to update request: ${updateError.message}`);
      }

      alert(`Account created successfully!\n\nName: ${request.full_name}\nEmail: ${email}\nTemporary Password: ${tempPassword}\nOrganization: ${organizationName}\n\nPlease share these credentials with ${request.full_name}.`);
      loadData();
    } catch (error) {
      console.error('Error approving access request:', error);
      alert('Failed to approve request: ' + error.message);
    }
  };

  const handleRejectAccessRequest = async (requestId) => {
    const reason = prompt('Enter rejection reason (optional):');

    try {
      const { error } = await supabase
        .from('new_user_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile.id,
          rejection_reason: reason || 'No reason provided'
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('New user request rejected.');
      loadData();
    } catch (error) {
      console.error('Error rejecting new user request:', error);
      alert('Failed to reject request: ' + error.message);
    }
  };

  const handleApproveNewUserRequest = async (requestId) => {
    try {
      // Call the database function to process approval
      const { data, error } = await supabase.rpc('process_new_user_approval', {
        p_request_id: requestId,
        p_approver_id: profile.id
      });

      if (error) throw error;

      if (!data.success) {
        alert(data.message);
        return;
      }

      // Check if user needs to be created
      if (data.requires_user_creation) {
        // Get the request details
        const { data: request, error: fetchError } = await supabase
          .from('new_user_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (fetchError) throw fetchError;

        const email = request.email || prompt(`Enter email address for ${request.full_name}:`);
        if (!email || !email.includes('@')) {
          alert('Valid email address is required to create the account');
          return;
        }

        // Create the user via edge function (password will be auto-generated)
        try {
          console.log('Calling create-user edge function with:', {
            admin_user_id: profile.id,
            email: email,
            full_name: request.full_name,
            role: request.requested_access,
            organization_id: organization.id
          });

          const response = await supabase.functions.invoke('create-user', {
            body: {
              admin_user_id: profile.id,
              email: email,
              full_name: request.full_name,
              role: request.requested_access,
              organization_id: organization.id
            }
          });

          console.log('Edge function response:', response);

          if (response.error) {
            console.error('Edge function error:', response.error);
            const status = response.error.context?.status ?? response.error.status ?? '';
            const msg = response.error.message || JSON.stringify(response.error);
            throw new Error(status ? `HTTP ${status}: ${msg}` : msg);
          }

          const newUserData = response.data;
          console.log('Edge function data:', newUserData);

          if (!newUserData || !newUserData.success) {
            const errorMsg = newUserData?.error || 'Failed to create user account';
            const errorDetails = newUserData?.details || '';
            throw new Error(errorDetails ? `${errorMsg}\n\nDetails: ${errorDetails}` : errorMsg);
          }

          // Mark request as completed and clear the encrypted password
          const { error: completeErr } = await supabase
            .from('new_user_requests')
            .update({
              created_user_id: newUserData.user?.id,
              status: 'completed',
              email: email,
              temporary_password: null,
              encrypted_temporary_password: null
            })
            .eq('id', requestId);
          if (completeErr) console.error('Failed to mark request completed:', completeErr);

          const tempPassword = newUserData.temporary_password;
          if (tempPassword) {
            alert(`Account created successfully!\n\nName: ${request.full_name}\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease share these credentials with ${request.full_name}. They will be required to change the password on first login.`);
          } else {
            alert(`Account created successfully!\n\nName: ${request.full_name}\nEmail: ${email}\n\nThe user account has been created.`);
          }
        } catch (createError) {
          console.error('Error creating user:', createError);
          alert('Failed to create user account.\n\nError: ' + (createError.message || JSON.stringify(createError)));
        }
      } else {
        alert(data.message + ` (${data.approval_count}/2 approvals)`);
      }

      loadData();
    } catch (error) {
      console.error('Error approving new user request:', error);
      alert('Failed to process approval: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: `2px solid ${color}20`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        flex: '1',
        minWidth: '200px'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '32px' }}>{icon}</span>
        <div style={{
          fontSize: '36px',
          fontWeight: '700',
          color: color,
          lineHeight: '1'
        }}>
          {value}
        </div>
      </div>
      <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
        {title}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
      padding: '24px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a1929, #1a2f45)',
        borderRadius: '20px',
        padding: '40px 48px',
        marginBottom: '32px',
        border: '2px solid #d4af37',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: '#d4af37', letterSpacing: '1.5px', fontFamily: 'system-ui, -apple-system, sans-serif', marginBottom: '12px' }}>
              AML/CFT Compliance System
            </div>
            <h1 style={{ margin: '0', fontSize: '44px', fontWeight: '800', color: 'white', lineHeight: '1.2' }}>
              Management Dashboard
            </h1>
            {profile?.first_name && (
              <p style={{ color: '#d4af37', fontSize: '18px', margin: '12px 0 0 0', fontWeight: '600' }}>
                Welcome, {profile.first_name}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <button
              onClick={() => navigate('/security/settings')}
              style={{
                padding: '6px 14px', background: 'transparent',
                border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d4af37'; e.currentTarget.style.color = '#d4af37'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
            >
              Security Settings
            </button>
            <button
              onClick={() => navigate(getBackRoute())}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
        <StatCard
          title="High Risk Clients"
          value={statistics.highRiskClients}
          icon="⚠️"
          color="#ef4444"
          onClick={() => setActiveTab('clients')}
        />
        <StatCard
          title="Sanctioned Clients"
          value={statistics.sanctionedClients}
          icon="🚫"
          color="#9333ea"
          onClick={() => setActiveTab('clients')}
        />
        {!isInsurance && (
          <StatCard
            title="Matter AML Alerts"
            value={statistics.matterAlerts}
            icon="🚨"
            color="#dc2626"
            onClick={() => setActiveTab('matters')}
          />
        )}
        <StatCard
          title="Transaction Alerts"
          value={statistics.openAlerts}
          icon="📊"
          color="#dc2626"
          onClick={() => setActiveTab('alerts')}
        />
      </div>

      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          borderBottom: '2px solid #e5e7eb',
          background: '#f8f9fa'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            {
              id: 'users',
              label: 'Users',
              icon: '🔐',
              badge: statistics.pendingRoleRequests + statistics.pendingAccessRequests
            },
            { id: 'clients', label: 'Clients', icon: '👥' },
            ...(!isInsurance ? [{ id: 'matters', label: 'Matters', icon: '📋' }] : []),
            { id: 'assessments', label: 'Assessments', icon: '📝' },
            { id: 'alerts', label: 'Alerts', icon: '🚨' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '14px 8px',
                background: activeTab === tab.id ? 'white' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #d4af37' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? '#0a1929' : '#64748b',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 7px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '700',
                  lineHeight: '1.4'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
          {(profile?.role === 'management' || profile?.role === 'admin') && (
            <button
              onClick={() => navigate('/billing')}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '14px 8px',
                background: 'transparent',
                border: 'none',
                borderBottom: '3px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: '#64748b',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              Billing
            </button>
          )}
        </div>

        <div style={{ padding: '32px' }}>
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
                    Role Management
                  </h3>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                    {organizationUsers.length} {organizationUsers.length === 1 ? 'user' : 'users'} in organization
                  </div>
                </div>
                <button
                  onClick={() => setShowNewUserForm(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                    border: '2px solid #10b981',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>➕</span>
                  Add New User
                </button>
              </div>

              {/* Dual Approval Interface for Role Upgrade Requests */}
              <div style={{ marginBottom: '32px' }}>
                <DualApprovalInterface user={profile} organizationId={organization?.id} />
              </div>

              {/* New User Requests with Dual Approval */}
              {newUserRequests.filter(r => r.status === 'pending').length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#0a1929' }}>
                    Pending New User Requests
                  </h4>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {newUserRequests
                      .filter(r => r.status === 'pending')
                      .map(request => {
                        const approvals = newUserRequestApprovals.filter(a => a.request_id === request.id);
                        const hasApproved = approvals.some(a => a.approver_id === profile.id);
                        const isCreator = request.created_by === profile.id;
                        const canApprove = !hasApproved && !isCreator;
                        const approvalsCount = approvals.length;

                        return (
                          <div
                            key={request.id}
                            style={{
                              padding: '24px',
                              background: approvalsCount === 1 ? '#f0fdf4' : '#fffbeb',
                              border: `2px solid ${approvalsCount === 1 ? '#10b981' : '#fbbf24'}`,
                              borderRadius: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0a1929' }}>
                                    {request.full_name}
                                  </div>
                                  <span style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    background: approvalsCount === 1 ? '#dcfce7' : '#fef3c7',
                                    color: approvalsCount === 1 ? '#166534' : '#92400e',
                                    border: `2px solid ${approvalsCount === 1 ? '#10b981' : '#f59e0b'}`
                                  }}>
                                    {approvalsCount}/2 APPROVALS
                                  </span>
                                  <span style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    background: request.requested_access === 'staff' ? '#e0e7ff' : '#fce7f3',
                                    color: request.requested_access === 'staff' ? '#3730a3' : '#9f1239'
                                  }}>
                                    {request.requested_access?.toUpperCase() || 'PENDING'}
                                  </span>
                                </div>

                                <div style={{ fontSize: '15px', color: '#64748b', marginBottom: '12px', fontWeight: '500' }}>
                                  {request.position}
                                </div>

                                {request.email && (
                                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                                    Email: {request.email}
                                  </div>
                                )}

                                {request.phone && (
                                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                                    Phone: {request.phone}
                                  </div>
                                )}

                                <div style={{
                                  padding: '16px',
                                  background: 'white',
                                  borderRadius: '10px',
                                  border: '1px solid #e5e7eb',
                                  marginBottom: '12px'
                                }}>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
                                    Reason for Access:
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#0a1929', lineHeight: '1.6' }}>
                                    {request.reason}
                                  </div>
                                </div>

                                {approvalsCount > 0 && (
                                  <div style={{
                                    padding: '12px',
                                    background: approvalsCount === 1 ? '#dcfce7' : '#fef3c7',
                                    borderRadius: '8px',
                                    marginBottom: '12px'
                                  }}>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#0a1929', marginBottom: '4px' }}>
                                      Approvals: {approvalsCount}/2
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                                      {approvalsCount === 1 ? 'One more approval needed' : 'Ready to create account'}
                                    </div>
                                  </div>
                                )}

                                {isCreator && (
                                  <div style={{
                                    padding: '12px',
                                    background: '#e0e7ff',
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    fontSize: '13px',
                                    color: '#3730a3',
                                    fontWeight: '600'
                                  }}>
                                    You created this request
                                  </div>
                                )}

                                {hasApproved && (
                                  <div style={{
                                    padding: '12px',
                                    background: '#dcfce7',
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    fontSize: '13px',
                                    color: '#166534',
                                    fontWeight: '600'
                                  }}>
                                    You have already approved this request
                                  </div>
                                )}

                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                  Created: {fmtDateTime(request.created_at)}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                              {canApprove ? (
                                <>
                                  <button
                                    onClick={() => handleApproveNewUserRequest(request.id)}
                                    style={{
                                      flex: 1,
                                      padding: '12px 24px',
                                      background: 'linear-gradient(135deg, #059669, #10b981)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '10px',
                                      cursor: 'pointer',
                                      fontWeight: '600',
                                      fontSize: '15px',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    ✓ Approve {approvalsCount === 1 ? '& Create Account' : '(1st Approval)'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectAccessRequest(request.id)}
                                    style={{
                                      flex: 1,
                                      padding: '12px 24px',
                                      background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '10px',
                                      cursor: 'pointer',
                                      fontWeight: '600',
                                      fontSize: '15px',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    ✕ Reject
                                  </button>
                                </>
                              ) : (
                                <div style={{
                                  flex: 1,
                                  padding: '12px 24px',
                                  background: '#f1f5f9',
                                  borderRadius: '10px',
                                  textAlign: 'center',
                                  color: '#64748b',
                                  fontWeight: '600',
                                  fontSize: '15px'
                                }}>
                                  {isCreator ? 'Waiting for approvals from other managers' : 'You cannot approve this request'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Show section if there are pending requests from other users */}
              {roleUpgradeRequests.filter(r => r.status === 'pending' && r.user_id !== profile?.id).length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>
                    Pending Role Upgrade Requests
                  </h4>

                  <div style={{ display: 'grid', gap: '16px' }}>
                    {roleUpgradeRequests
                        .filter(r => r.status === 'pending' && r.user_id !== profile?.id)
                        .map(request => (
                      <div
                        key={request.id}
                        style={{
                          padding: '20px',
                          background: '#fef3c7',
                          border: '2px solid #f59e0b',
                          borderRadius: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                              {request.user_profiles?.full_name || 'Unknown User'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                              Email: {request.user_profiles?.email || 'N/A'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                              Current Role: <span style={{ fontWeight: '600', color: '#0a1929' }}>
                                {request.user_profiles?.role?.toUpperCase() || 'N/A'}
                              </span>
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                              Requested Role: <span style={{ fontWeight: '600', color: '#8b5cf6' }}>
                                {request.requested_role?.toUpperCase()}
                              </span>
                            </div>
                            {request.justification && (
                              <div style={{
                                marginTop: '12px',
                                padding: '12px',
                                background: 'white',
                                borderRadius: '8px',
                                fontSize: '13px',
                                color: '#475569',
                                border: '1px solid #e5e7eb'
                              }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px', color: '#64748b' }}>Justification:</div>
                                {request.justification}
                              </div>
                            )}
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                              Requested: {fmtDateTime(request.created_at)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            onClick={() => handleApproveRequest(request.id, request.user_id, request.requested_role)}
                            style={{
                              padding: '10px 24px',
                              background: 'linear-gradient(135deg, #065f46, #10b981)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            style={{
                              padding: '10px 24px',
                              background: 'linear-gradient(135deg, #991b1b, #dc2626)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '14px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show if current user has their own pending role upgrade request */}
              {roleUpgradeRequests.filter(r => r.status === 'pending' && r.user_id === profile?.id).length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{
                    padding: '24px',
                    background: '#fef3c7',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                      Your Role Upgrade Request is Pending
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      You cannot approve your own role upgrade request. Another management user needs to review and approve it.
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#0a1929' }}>
                  Organization Users ({organizationUsers.length} {organizationUsers.length === 1 ? 'User' : 'Users'})
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '20px'
                }}>
                  {organizationUsers.map(user => (
                    <div
                      key={user.id}
                      style={{
                        padding: '24px',
                        background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
                        border: '2px solid #d4af37',
                        borderRadius: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(212, 175, 55, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #d4af37, #f4e4c1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          fontWeight: '700',
                          color: '#0a1929',
                          flexShrink: 0
                        }}>
                          {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#0a1929',
                            marginBottom: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {user.full_name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {user.email}
                          </div>
                        </div>
                      </div>

                      {user.position && (
                        <div style={{
                          padding: '8px 12px',
                          background: '#f1f5f9',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#475569',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>💼</span>
                          {user.position}
                        </div>
                      )}

                      <div style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        textAlign: 'center',
                        letterSpacing: '0.5px',
                        background: user.role === 'admin' ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' :
                                   user.role === 'senior_partner' ? 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' :
                                   user.role === 'management' ? 'linear-gradient(135deg, #f3e8ff, #e9d5ff)' :
                                   user.role === 'compliance_officer' ? 'linear-gradient(135deg, #fce7f3, #fbcfe8)' :
                                   user.role === 'staff' ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' :
                                   'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                        color: user.role === 'admin' ? '#1e40af' :
                               user.role === 'senior_partner' ? '#4338ca' :
                               user.role === 'management' ? '#7c3aed' :
                               user.role === 'compliance_officer' ? '#db2777' :
                               user.role === 'staff' ? '#16a34a' : '#6b7280',
                        border: `2px solid ${
                          user.role === 'admin' ? '#3b82f6' :
                          user.role === 'senior_partner' ? '#6366f1' :
                          user.role === 'management' ? '#a855f7' :
                          user.role === 'compliance_officer' ? '#ec4899' :
                          user.role === 'staff' ? '#22c55e' : '#9ca3af'
                        }`,
                        marginTop: 'auto'
                      }}>
                        {user.role ? user.role.replace('_', ' ').toUpperCase() : 'N/A'}
                      </div>

                      <div style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        textAlign: 'center',
                        paddingTop: '8px',
                        borderTop: '1px solid #e5e7eb'
                      }}>
                        Member since {fmtDate(user.created_at)}
                      </div>

                      {user.id === profile.id && (
                        <button
                          onClick={() => {
                            setSelectedUserForRoleChange(user);
                            setShowRoleChangeModal(true);
                          }}
                          style={{
                            padding: '10px 16px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            width: '100%'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Request Role Change
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {organizationUsers.length === 0 && (
                  <div style={{
                    padding: '60px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '16px'
                  }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>👥</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                      No Users Found
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      There are currently no users in your organization
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div>
              <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
                Performance Overview
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Client Distribution</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>Low Risk</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>
                        {kycClients.filter(c => c.current_risk_rating?.toLowerCase() === 'low').length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>Medium Risk</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b' }}>
                        {kycClients.filter(c => c.current_risk_rating?.toLowerCase() === 'medium').length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>High Risk</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>
                        {kycClients.filter(c => c.current_risk_rating?.toLowerCase() === 'high').length}
                      </span>
                    </div>
                  </div>
                </div>

                {!isInsurance && (
                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Matter Status</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>Active</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>
                        {matters.filter(m => m.status === 'active').length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>Pending</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b' }}>
                        {matters.filter(m => m.status === 'pending').length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>Completed</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                        {matters.filter(m => m.status === 'completed').length}
                      </span>
                    </div>
                  </div>
                </div>
                )}

                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>Recent Activity</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>New Clients (Last 30 Days)</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>
                        {kycClients.filter(c => {
                          const created = new Date(c.created_at);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return created >= thirtyDaysAgo;
                        }).length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', color: '#475569' }}>Assessments (Last 30 Days)</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>
                        {assessments.filter(a => {
                          const created = new Date(a.created_at);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return created >= thirtyDaysAgo;
                        }).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
                  Client Management
                </h3>
              </div>

              {kycClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No clients yet</div>
                  <div style={{ fontSize: '14px' }}>Visit the Staff dashboard to add clients</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {kycClients.slice(0, 10).map(client => (
                    <div
                      key={client.id}
                      onClick={() => navigate(`/kyc-client/${client.id}`)}
                      style={{
                        padding: '20px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#d4af37';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                            {client.client_name || ''}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                            {client.client_type === 'individual' ? 'Individual Client' : 'Legal Entity'}
                          </div>
                          {client.email && (
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                              {client.email}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <div style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: client.current_risk_rating?.toLowerCase() === 'high' ? '#fee2e2' : client.current_risk_rating?.toLowerCase() === 'medium' ? '#fef3c7' : client.current_risk_rating?.toLowerCase() === 'low' ? '#dcfce7' : '#f1f5f9',
                            color: client.current_risk_rating?.toLowerCase() === 'high' ? '#dc2626' : client.current_risk_rating?.toLowerCase() === 'medium' ? '#f59e0b' : client.current_risk_rating?.toLowerCase() === 'low' ? '#16a34a' : '#64748b'
                          }}>
                            {client.current_risk_rating?.toUpperCase() || 'UNRATED'}
                          </div>
                          <div style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: client.onboarding_status === 'completed' ? '#dcfce7' : client.onboarding_status === 'in_progress' ? '#fef3c7' : '#f1f5f9',
                            color: client.onboarding_status === 'completed' ? '#16a34a' : client.onboarding_status === 'in_progress' ? '#f59e0b' : '#64748b'
                          }}>
                            {client.onboarding_status ? client.onboarding_status.replace('_', ' ').toUpperCase() : 'PENDING'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'matters' && (
            isInsurance
              ? (setActiveTab('overview'), null)
              : <MatterManagement sector={organization?.sector} />
          )}

          {activeTab === 'assessments' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
                  Risk Assessments
                </h3>
              </div>

              {assessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No assessments yet</div>
                  <div style={{ fontSize: '14px' }}>Visit the Compliance dashboard to create assessments</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {assessments.slice(0, 10).map(assessment => (
                    <div
                      key={assessment.id}
                      onClick={() => navigate(`/report/${assessment.id}`)}
                      style={{
                        padding: '20px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#d4af37';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929', marginBottom: '8px' }}>
                            {assessment.institution_name || 'Institutional Assessment'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Created: {fmtDate(assessment.created_at)}
                          </div>
                        </div>
                        {assessment.overall_risk_rating && (
                          <div style={{
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: assessment.overall_risk_rating === 'High' ? '#fee2e2' :
                                       assessment.overall_risk_rating === 'Medium' ? '#fef3c7' : '#dcfce7',
                            color: assessment.overall_risk_rating === 'High' ? '#dc2626' :
                                   assessment.overall_risk_rating === 'Medium' ? '#f59e0b' : '#16a34a'
                          }}>
                            {assessment.overall_risk_rating}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#0a1929' }}>
                  Transaction Alerts
                </h3>
                <button
                  onClick={() => navigate('/str-alerts')}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #991b1b, #dc2626)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  View All Alerts
                </button>
              </div>

              {transactionAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>No open alerts</div>
                  <div style={{ fontSize: '14px' }}>All transaction alerts have been resolved</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {transactionAlerts.slice(0, 10).map(alert => (
                    <div
                      key={alert.id}
                      style={{
                        padding: '20px',
                        background: 'white',
                        border: '2px solid #fee2e2',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626', marginBottom: '8px' }}>
                            {alert.alert_type ? alert.alert_type.replace('_', ' ').toUpperCase() : 'ALERT'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                            Severity: {alert.alert_severity?.toUpperCase() || 'UNKNOWN'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Created: {fmtDate(alert.created_at)}
                          </div>
                        </div>
                        <div style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: '#fef3c7',
                          color: '#f59e0b'
                        }}>
                          OPEN
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showRoleChangeModal && selectedUserForRoleChange && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '700', color: '#0a1929' }}>
              Request Role Change
            </h3>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '2px solid #e2e8f0' }}>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>User</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>{selectedUserForRoleChange.full_name}</div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>{selectedUserForRoleChange.email}</div>
              </div>

              <div style={{ marginBottom: '16px', padding: '16px', background: '#fef3c7', borderRadius: '12px', border: '2px solid #fbbf24' }}>
                <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>Current Role</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#0a1929' }}>
                  {selectedUserForRoleChange.role ? selectedUserForRoleChange.role.replace('_', ' ').toUpperCase() : 'N/A'}
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#0a1929' }}>
                  New Role *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#0a1929',
                    background: 'white'
                  }}
                >
                  <option value="">Select new role...</option>
                  <option value="staff">Staff</option>
                  <option value="lawyer">Lawyer</option>
                  <option value="compliance_officer">Compliance Officer</option>
                  <option value="mlro">MLRO</option>
                  <option value="management">Management</option>
                  <option value="senior_partner">Senior Partner</option>
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#0a1929' }}>
                  Justification *
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Provide a detailed justification for this role change..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #cbd5e1',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{
                padding: '16px',
                background: '#eff6ff',
                borderRadius: '12px',
                border: '2px solid #3b82f6',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>
                  Dual Approval Required
                </div>
                <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                  This request will require approval from <strong>2 other management users</strong> (not including you).
                  You will not be able to approve this request yourself for security reasons.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRoleChangeModal(false);
                  setSelectedUserForRoleChange(null);
                  setNewRole('');
                  setJustification('');
                }}
                style={{
                  padding: '12px 24px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoleChangeRequest}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New User Request Form Modal */}
      {showNewUserForm && (
        <NewUserRequestForm
          onClose={() => setShowNewUserForm(false)}
          onSuccess={() => {
            setShowNewUserForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
