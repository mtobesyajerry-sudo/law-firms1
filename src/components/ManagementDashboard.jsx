/**
 * SYSTEM ADMINISTRATOR DASHBOARD
 *
 * This is the GLOBAL system administration dashboard for users with role='admin' and organization_id=NULL.
 *
 * System Administrators can:
 * - Manage ALL organizations across the entire system
 * - Manage ALL users across all organizations
 * - Configure global system settings
 * - Manage subscriptions for all organizations
 * - Access ALL assessments system-wide
 *
 * DO NOT CONFUSE WITH:
 * - ClientManagementDashboard: Organization-level management (role=management/senior_partner/partner with an organization_id)
 * - These are completely separate roles with different access scopes
 *
 * Access: Only users with role='admin' AND organization_id IS NULL
 * Route: /admin/dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getRiskColor, getRiskLabel, institutionCategories, calculateSectionScore, calculateRiskLevel } from '../data/assessmentData';
import { getFilteredSections } from '../utils/frameworkUtils';
import MarkdownRenderer from './MarkdownRenderer';
import { dashboardStyles, getBadgeStyle, getRiskBadgeStyle, getStatusBadgeStyle } from '../utils/dashboardStyles';
import LoadingSpinner from './LoadingSpinner';

export default function ManagementDashboard() {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('registration');

  const [editUser, setEditUser] = useState(null);
  const [editOrg, setEditOrg] = useState(null);
  const [editAssessment, setEditAssessment] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: null, name: '' });
  const [suspendModal, setSuspendModal] = useState({ show: false, userId: null, userName: '', currentStatus: true });
  const [suspensionReason, setSuspensionReason] = useState('');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState('');
  const [showSupport, setShowSupport] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsAndConditions, setShowTermsAndConditions] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [systemContent, setSystemContent] = useState({});
  const [editingContent, setEditingContent] = useState(null);

  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const hasActiveSubscription = (organization) => {
    if (!organization) return false;
    if (!organization.subscription_expiry_date) return false;

    const expiryDate = new Date(organization.subscription_expiry_date);
    const now = new Date();
    return expiryDate > now;
  };

  const getOrganizationUserCount = (orgId) => {
    return users.filter(u => u.organization_id === orgId && u.role !== 'admin').length;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadError(null);

      // Check current session and user
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.id, session?.user?.email);

      const [usersRes, orgsRes, assessRes, regReqRes, clientsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('organizations').select('*').order('created_at', { ascending: false }),
        supabase.from('assessments').select('*, organizations(name)').order('created_at', { ascending: false }),
        supabase.from('law_firm_registrations').select('*').order('created_at', { ascending: false }),
        supabase.from('kyc_clients').select('*, organizations(name)').order('created_at', { ascending: false })
      ]);

      console.log('Users response:', { data: usersRes.data, error: usersRes.error, count: usersRes.count });
      console.log('Orgs response:', { data: orgsRes.data, error: orgsRes.error, count: orgsRes.count });
      console.log('Assessments response:', { data: assessRes.data, error: assessRes.error, count: assessRes.count });
      console.log('Reg requests response:', { data: regReqRes.data, error: regReqRes.error, count: regReqRes.count });
      console.log('Clients response:', { data: clientsRes.data, error: clientsRes.error, count: clientsRes.count });

      if (usersRes.error) throw new Error(`Users: ${usersRes.error.message}`);
      if (orgsRes.error) throw new Error(`Organizations: ${orgsRes.error.message}`);
      if (assessRes.error) throw new Error(`Assessments: ${assessRes.error.message}`);
      if (regReqRes.error) throw new Error(`Registration Requests: ${regReqRes.error.message}`);
      if (clientsRes.error) throw new Error(`Clients: ${clientsRes.error.message}`);

      setUsers(usersRes.data || []);
      setOrganizations(orgsRes.data || []);
      setAssessments(assessRes.data || []);
      setRegistrationRequests(regReqRes.data || []);
      setClients(clientsRes.data || []);

      console.log('Users loaded:', usersRes.data);
      console.log('Users count:', (usersRes.data || []).length);
      console.log('Organizations loaded:', orgsRes.data);
      console.log('Registration Requests loaded:', regReqRes.data);
      console.log('Registration Requests count:', (regReqRes.data || []).length);
      console.log('Pending count:', (regReqRes.data || []).filter(r => r.registration_status === 'pending').length);

      setSystemContent({});
    } catch (error) {
      console.error('Error loading data:', error);
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const recalculateAllScores = async () => {
    if (!confirm('This will recalculate Technical Compliance and Effectiveness scores for all assessments. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const { data: allAssessments, error: assessError } = await supabase
        .from('assessments')
        .select('id, dnfbp_tier');

      if (assessError) throw assessError;

      let updatedCount = 0;
      for (const assessment of allAssessments) {
        const { data: responses, error: respError } = await supabase
          .from('assessment_responses')
          .select('*')
          .eq('assessment_id', assessment.id);

        if (respError) continue;

        const { data: existingScores, error: scoresError } = await supabase
          .from('section_scores')
          .select('*')
          .eq('assessment_id', assessment.id);

        if (scoresError) continue;

        const tier = assessment.entity_tier || assessment.dnfbp_tier || 2;
        const sections = getFilteredSections('banks_financial_institutions', tier);

        for (const section of sections) {
          const sectionResponses = responses.filter(r => r.section_code === section.code);
          if (sectionResponses.length === 0) continue;

          const scoreData = calculateSectionScore(sectionResponses, section);
          const existingScore = existingScores.find(s => s.section_code === section.code);

          if (existingScore) {
            const { error: updateError } = await supabase
              .from('section_scores')
              .update({
                technical_compliance_score: scoreData.technical_compliance_score || 0,
                effectiveness_score: scoreData.effectiveness_score || 0,
                risk_score: scoreData.score,
                risk_level: calculateRiskLevel(scoreData.score),
                answered_questions: scoreData.answeredCount,
                total_questions: scoreData.totalCount
              })
              .eq('id', existingScore.id);

            if (!updateError) updatedCount++;
          }
        }
      }

      alert(`Successfully recalculated scores for ${updatedCount} section(s) across ${allAssessments.length} assessment(s)`);
      await loadData();
    } catch (error) {
      console.error('Error recalculating scores:', error);
      alert('Error recalculating scores: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (requestId, requestData) => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Step 1: Create the organization FIRST
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: requestData.law_firm_name,
          business_type: 'law_firm',
          size: 'small',
          law_firm_type: 'small_firm',
          brela_registration: requestData.brela_registration_number,
          tls_registration: requestData.tls_registration_number,
          contact_email: requestData.firm_email,
          assigned_user_id: null
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Step 2: Create the user WITH the organization_id (temporary password will be auto-generated)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_user_id: user.id,
            email: requestData.firm_email,
            full_name: requestData.contact_person_name,
            role: 'client',
            organization_id: orgData.id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        await supabase.from('organizations').delete().eq('id', orgData.id);
        const errorMsg = result.error || result.details || 'Failed to create user';
        throw new Error(errorMsg);
      }

      const newUserId = result.user?.id;

      // Step 3: Update organization with the assigned user
      await supabase
        .from('organizations')
        .update({
          assigned_user_id: newUserId
        })
        .eq('id', orgData.id);

      // Step 4: Set default subscription expiry to 30 days from now
      const defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
      const formattedExpiryDate = defaultExpiryDate.toISOString().split('T')[0];

      await supabase
        .from('user_profiles')
        .update({
          subscription_expiry_date: formattedExpiryDate
        })
        .eq('id', newUserId);

      // Step 5: Mark registration as approved and clear encrypted password
      const { error: updateError } = await supabase
        .from('law_firm_registrations')
        .update({
          registration_status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          encrypted_password: null,
          user_id: newUserId,
          organization_id: orgData.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      await loadData();

      // Show success message with temporary password
      if (result.temporary_password) {
        alert(`Registration approved successfully!\n\nTemporary Password: ${result.temporary_password}\n\nPlease share this password with the user. They will be required to change it on first login.`);
      } else {
        alert('Registration approved successfully! User and organization have been created.');
      }
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Error approving registration: ' + error.message);
    }
  };

  const rejectRegistration = async (requestId, reason) => {
    try {
      const { error } = await supabase
        .from('law_firm_registrations')
        .update({
          registration_status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadData();
      alert('Registration rejected');
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Error rejecting registration: ' + error.message);
    }
  };

  const deleteRegistrationRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this registration request? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('law_firm_registrations')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      await loadData();
      alert('Registration request deleted successfully');
    } catch (error) {
      console.error('Error deleting registration request:', error);
      alert('Error deleting registration request: ' + error.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus, userName) => {
    if (currentStatus) {
      setSuspendModal({ show: true, userId, userName, currentStatus });
      setSuspensionReason('');
    } else {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            is_active: true,
            suspension_reason: null,
            suspended_at: null
          })
          .eq('id', userId);

        if (error) throw error;
        await loadData();
        alert('User activated successfully');
      } catch (error) {
        console.error('Error activating user:', error);
        alert('Error activating user: ' + error.message);
      }
    }
  };

  const handleSuspendUser = async () => {
    try {
      if (!suspensionReason.trim()) {
        alert('Please provide a reason for suspension');
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: false,
          suspension_reason: suspensionReason,
          suspended_at: new Date().toISOString()
        })
        .eq('id', suspendModal.userId);

      if (error) throw error;
      await loadData();
      setSuspendModal({ show: false, userId: null, userName: '', currentStatus: true });
      setSuspensionReason('');
      alert('User suspended successfully');
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Error suspending user: ' + error.message);
    }
  };

  const updateOrganizationSubscription = async (orgId, expiryDate) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_expiry_date: expiryDate })
        .eq('id', orgId);

      if (error) throw error;
      await loadData();
      alert('Organization subscription updated successfully');
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error updating subscription: ' + error.message);
    }
  };

  const quickRenewOrganization = async (orgId, days, orgName) => {
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + days);
    const formattedDate = newExpiryDate.toISOString().split('T')[0];

    if (confirm(`Renew subscription for ${orgName} for ${days} days (until ${new Date(newExpiryDate).toLocaleDateString()})?`)) {
      await updateOrganizationSubscription(orgId, formattedDate);
    }
  };

  const renewAndActivateOrganization = async (orgId, days, orgName) => {
    try {
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + days);
      const formattedDate = newExpiryDate.toISOString().split('T')[0];

      if (!confirm(`Renew subscription for ${orgName} for ${days} days and activate organization?`)) {
        return;
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_expiry_date: formattedDate,
          is_active: true,
          suspended_at: null,
          suspension_reason: null
        })
        .eq('id', orgId);

      if (error) throw error;
      await loadData();
      alert('Organization subscription renewed and activated successfully');
    } catch (error) {
      console.error('Error renewing organization subscription:', error);
      alert('Error renewing organization subscription: ' + error.message);
    }
  };

  const toggleOrganizationStatus = async (orgId, currentStatus, orgName) => {
    if (!currentStatus) {
      const org = organizations.find(o => o.id === orgId);
      if (!hasActiveSubscription(org)) {
        if (confirm(`${orgName} does not have an active subscription. Do you want to renew their subscription for 30 days and activate?`)) {
          await renewAndActivateOrganization(orgId, 30, orgName);
        } else {
          alert('Organization cannot be activated without a valid subscription');
        }
        return;
      }

      try {
        const { error } = await supabase
          .from('organizations')
          .update({
            is_active: true,
            suspension_reason: null,
            suspended_at: null
          })
          .eq('id', orgId);

        if (error) throw error;
        await loadData();
        alert('Organization activated successfully');
      } catch (error) {
        console.error('Error activating organization:', error);
        alert('Error activating organization: ' + error.message);
      }
    } else {
      const reason = prompt(`Suspend ${orgName}?\n\nPlease provide a reason:`);
      if (!reason) return;

      try {
        const { error } = await supabase
          .from('organizations')
          .update({
            is_active: false,
            suspension_reason: reason,
            suspended_at: new Date().toISOString()
          })
          .eq('id', orgId);

        if (error) throw error;
        await loadData();
        alert('Organization suspended successfully');
      } catch (error) {
        console.error('Error suspending organization:', error);
        alert('Error suspending organization: ' + error.message);
      }
    }
  };

  const updateOrganizationMaxUsers = async (orgId, maxUsers) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ max_users: maxUsers })
        .eq('id', orgId);

      if (error) throw error;
      await loadData();
      alert('Organization user limit updated successfully');
    } catch (error) {
      console.error('Error updating user limit:', error);
      alert('Error updating user limit: ' + error.message);
    }
  };

  const assignOrganization = async (userId, orgId) => {
    try {
      const updates = [];

      updates.push(
        supabase
          .from('user_profiles')
          .update({ organization_id: orgId || null })
          .eq('id', userId)
      );

      if (orgId) {
        updates.push(
          supabase
            .from('organizations')
            .update({ assigned_user_id: userId })
            .eq('id', orgId)
        );
      }

      await Promise.all(updates);
      await loadData();
    } catch (error) {
      console.error('Error assigning organization:', error);
    }
  };

  const updateUser = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editUser.full_name,
          email: editUser.email,
          role: editUser.role,
        })
        .eq('id', editUser.id);

      if (error) throw error;

      await loadData();
      setEditUser(null);
      alert('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user: ' + error.message);
    }
  };

  const updateOrganization = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: editOrg.name,
          business_type: editOrg.business_type,
          size: editOrg.size,
          dnfbp_category: editOrg.dnfbp_category,
        })
        .eq('id', editOrg.id);

      if (error) throw error;

      await loadData();
      setEditOrg(null);
      alert('Organization updated successfully');
    } catch (error) {
      console.error('Error updating organization:', error);
      alert('Error updating organization: ' + error.message);
    }
  };

  const updateAssessment = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          assessment_date: editAssessment.assessment_date,
          status: editAssessment.status,
          overall_risk_rating: editAssessment.overall_risk_rating,
        })
        .eq('id', editAssessment.id);

      if (error) throw error;

      await loadData();
      setEditAssessment(null);
      alert('Assessment updated successfully');
    } catch (error) {
      console.error('Error updating assessment:', error);
      alert('Error updating assessment: ' + error.message);
    }
  };

  const handleDelete = async () => {
    try {
      const { type, id } = deleteConfirm;

      if (type === 'user') {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_user_id: user.id,
            user_id: id,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete user');
        }
      } else if (type === 'organization') {
        const { error } = await supabase.from('organizations').delete().eq('id', id);
        if (error) throw error;
      } else if (type === 'assessment') {
        const { error } = await supabase.from('assessments').delete().eq('id', id);
        if (error) throw error;
      }

      await loadData();
      setDeleteConfirm({ show: false, type: '', id: null, name: '' });
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting ${deleteConfirm.type}:`, error);
      alert(`Error deleting ${deleteConfirm.type}: ` + error.message);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      alert('Password changed successfully');
      setShowChangePassword(false);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordError(error.message);
    }
  };

  const updateSystemContent = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('system_content')
        .update({
          title: editingContent.title,
          content: editingContent.content,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingContent.id);

      if (error) throw error;

      await loadData();
      setEditingContent(null);
      alert('Content updated successfully');
    } catch (error) {
      console.error('Error updating content:', error);
      alert('Error updating content: ' + error.message);
    }
  };

  const applyFormatting = (syntax, type = 'wrap') => {
    const textarea = document.getElementById('content-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editingContent.content.substring(start, end);

    if (selectedText) {
      let newText;
      if (type === 'wrap') {
        newText = editingContent.content.substring(0, start) +
                  syntax + selectedText + syntax +
                  editingContent.content.substring(end);
      }

      setEditingContent({ ...editingContent, content: newText });

      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + syntax.length + selectedText.length + syntax.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const makeBold = () => {
    applyFormatting('**', 'wrap');
  };

  const makeItalic = () => {
    applyFormatting('*', 'wrap');
  };

  const makeBulletList = () => {
    const textarea = document.getElementById('content-editor');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editingContent.content.substring(start, end);

    let newText;
    if (selectedText) {
      const lines = selectedText.split('\n');
      const bulletedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
          return '- ' + trimmed;
        }
        return line;
      }).join('\n');

      newText = editingContent.content.substring(0, start) +
                bulletedLines +
                editingContent.content.substring(end);
    } else {
      newText = editingContent.content.substring(0, start) +
                '- ' +
                editingContent.content.substring(end);
    }

    setEditingContent({ ...editingContent, content: newText });

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText ? start + newText.length - editingContent.content.length : start + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Loading dashboard..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={dashboardStyles.pageContainer}>
        <div style={{ ...dashboardStyles.contentCard, background: '#fee2e2', borderColor: '#dc2626' }}>
          <h3 style={{ color: '#991b1b', marginTop: 0 }}>Error Loading Data</h3>
          <p style={{ color: '#7f1d1d' }}>{loadError}</p>
          <button onClick={loadData} style={dashboardStyles.button}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={dashboardStyles.pageContainer}>
      <div style={dashboardStyles.headerCard}>
        <div style={dashboardStyles.headerContent}>
          <div>
            <div style={dashboardStyles.headerTitle}>
              AML/CFT Compliance System
            </div>
            <h1 style={dashboardStyles.headerSubtitle}>
              System Administrator Dashboard
            </h1>
            {profile?.first_name && (
              <p style={{ color: '#d4af37', fontSize: '16px', margin: '8px 0 0 0', fontWeight: '600' }}>
                Welcome, {profile.first_name}
              </p>
            )}
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '8px 0 0 0' }}>
              Global system administration - Manage all organizations, users, and subscriptions
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/admin/security')}
              style={{
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px'
              }}
              title="Security Dashboard"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
                e.currentTarget.style.borderColor = '#f0d883';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#d4af37';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </button>
            <button
              onClick={() => setShowChangePassword(true)}
              style={{
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px'
              }}
              title="Change Password"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)';
                e.currentTarget.style.borderColor = '#f0d883';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#d4af37';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to sign out?')) {
                  await signOut();
                  navigate('/');
                }
              }}
              style={{
                padding: '10px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid #d4af37',
                borderRadius: '8px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.2)';
                e.currentTarget.style.borderColor = '#f0d883';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = '#d4af37';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={dashboardStyles.contentCard}>
        <div style={dashboardStyles.tabContainer}>
          <button
            onClick={() => setActiveTab('registration')}
            style={activeTab === 'registration' ? dashboardStyles.tabActive : dashboardStyles.tab}
          >
            Registration Requests ({registrationRequests.filter(r => r.registration_status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={activeTab === 'users' ? dashboardStyles.tabActive : dashboardStyles.tab}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            style={activeTab === 'subscriptions' ? dashboardStyles.tabActive : dashboardStyles.tab}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            style={activeTab === 'organizations' ? dashboardStyles.tabActive : dashboardStyles.tab}
          >
            Organizations ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            style={activeTab === 'assessments' ? dashboardStyles.tabActive : dashboardStyles.tab}
          >
            Assessments ({assessments.length})
          </button>
          <button
            onClick={() => setActiveTab('content')}
            style={activeTab === 'content' ? dashboardStyles.tabActive : dashboardStyles.tab}
          >
            Content Management
          </button>
        </div>

        {activeTab === 'registration' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Registration Requests</h2>
            <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
              Review and approve or reject user registration requests.
            </p>

            <div style={styles.registrationSection}>
              <div style={styles.registrationCard}>
                <h3 style={styles.subscriptionCardTitle}>
                  Pending Requests ({registrationRequests.filter(r => r.registration_status === 'pending').length})
                </h3>
                <div style={styles.tableContainer}>
                  {registrationRequests.filter(r => r.registration_status === 'pending').length === 0 ? (
                    <p style={styles.emptyState}>No pending registration requests</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Law Firm Name</th>
                          <th style={styles.th}>BRELA #</th>
                          <th style={styles.th}>Firm Email</th>
                          <th style={styles.th}>Contact Person</th>
                          <th style={styles.th}>Designation</th>
                          <th style={styles.th}>Mobile</th>
                          <th style={styles.th}>Submitted</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrationRequests.filter(r => r.registration_status === 'pending').map((request) => {
                          return (
                            <tr key={request.id} style={styles.tr}>
                              <td style={styles.td}>{request.law_firm_name}</td>
                              <td style={styles.td}>{request.brela_registration_number}</td>
                              <td style={styles.td}>{request.firm_email}</td>
                              <td style={styles.td}>{request.contact_person_name}</td>
                              <td style={styles.td}>{request.contact_person_designation}</td>
                              <td style={styles.td}>{request.mobile_number}</td>
                              <td style={styles.td}>{new Date(request.created_at).toLocaleDateString()}</td>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Approve registration for ${request.law_firm_name}?`)) {
                                        approveRegistration(request.id, request);
                                      }
                                    }}
                                    style={styles.activateButton}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Please provide a reason for rejection:');
                                      if (reason) {
                                        rejectRegistration(request.id, reason);
                                      }
                                    }}
                                    style={styles.dangerActionButton}
                                  >
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div style={styles.registrationCard}>
                <h3 style={styles.subscriptionCardTitle}>
                  Processed Requests ({registrationRequests.filter(r => r.registration_status !== 'pending').length})
                </h3>
                <div style={styles.tableContainer}>
                  {registrationRequests.filter(r => r.registration_status !== 'pending').length === 0 ? (
                    <p style={styles.emptyState}>No processed requests</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Law Firm Name</th>
                          <th style={styles.th}>BRELA #</th>
                          <th style={styles.th}>Firm Email</th>
                          <th style={styles.th}>Contact Person</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Processed</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrationRequests.filter(r => r.registration_status !== 'pending').map((request) => (
                          <tr key={request.id} style={styles.tr}>
                            <td style={styles.td}>{request.law_firm_name}</td>
                            <td style={styles.td}>{request.brela_registration_number}</td>
                            <td style={styles.td}>{request.firm_email}</td>
                            <td style={styles.td}>{request.contact_person_name}</td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.badge,
                                background: request.registration_status === 'approved' ? '#d1fae5' : '#fee2e2',
                                color: request.registration_status === 'approved' ? '#065f46' : '#991b1b'
                              }}>
                                {request.registration_status}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : '-'}
                            </td>
                            <td style={styles.td}>
                              <button
                                onClick={() => deleteRegistrationRequest(request.id)}
                                style={styles.dangerActionButton}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={styles.tabContent}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>User Management ({users.length} {users.length === 1 ? 'User' : 'Users'})</h2>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Position</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Organization</th>
                    <th style={styles.th}>Account Status</th>
                    <th style={styles.th}>Subscription</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const org = organizations.find(o => o.id === user.organization_id);
                    return (
                      <tr key={user.id} style={styles.tr}>
                        <td style={styles.td}>{user.full_name || '-'}</td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>{user.position || '-'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: user.role === 'admin' ? '#fef3c7' : '#dbeafe',
                            color: user.role === 'admin' ? '#92400e' : '#1e40af'
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <select
                            value={user.organization_id || ''}
                            onChange={(e) => assignOrganization(user.id, e.target.value)}
                            style={styles.selectSmall}
                            disabled={user.role === 'admin'}
                          >
                            <option value="">No organization</option>
                            {organizations.map(org => (
                              <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: user.is_active ? '#d1fae5' : '#fee2e2',
                            color: user.is_active ? '#065f46' : '#991b1b'
                          }}>
                            {user.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {user.role === 'client' ? (
                            hasActiveSubscription(user) ? (
                              <span style={{
                                ...styles.badge,
                                background: '#d1fae5',
                                color: '#065f46'
                              }}>
                                Active
                              </span>
                            ) : (
                              <span style={{
                                ...styles.badge,
                                background: '#fee2e2',
                                color: '#991b1b'
                              }}>
                                {user.subscription_expiry_date ? 'Expired' : 'Not Set'}
                              </span>
                            )
                          ) : (
                            <span style={{...styles.badge, background: '#e5e7eb', color: '#6b7280'}}>N/A</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => toggleUserStatus(user.id, user.is_active, user.full_name || user.email)}
                              style={styles.actionButton}
                            >
                              {user.is_active ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              onClick={() => setEditUser(user)}
                              style={styles.actionButton}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({
                                show: true,
                                type: 'user',
                                id: user.id,
                                name: user.full_name || user.email
                              })}
                              style={styles.dangerActionButton}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Organization Subscription Management</h2>
            <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
              Manage organization subscriptions, user limits, and access control. All users in an organization share the same subscription.
            </p>

            <div style={styles.subscriptionSection}>
              <div style={styles.subscriptionCard}>
                <h3 style={styles.subscriptionCardTitle}>
                  Active Subscriptions ({organizations.filter(o => o.is_active && hasActiveSubscription(o)).length})
                </h3>
                <div style={styles.tableContainer}>
                  {organizations.filter(o => o.is_active && hasActiveSubscription(o)).length === 0 ? (
                    <p style={styles.emptyState}>No organizations with active subscriptions</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Organization</th>
                          <th style={styles.th}>Business Type</th>
                          <th style={styles.th}>Users</th>
                          <th style={styles.th}>Max Users</th>
                          <th style={styles.th}>Subscription Expiry</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.filter(o => o.is_active && hasActiveSubscription(o)).map((org) => {
                          const userCount = getOrganizationUserCount(org.id);
                          const isExpiringSoon = org.subscription_expiry_date &&
                            new Date(org.subscription_expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                          const isExpired = org.subscription_expiry_date &&
                            new Date(org.subscription_expiry_date) < new Date();
                          return (
                            <tr key={org.id} style={styles.tr}>
                              <td style={styles.td}>
                                <strong>{org.name}</strong>
                                {org.contact_email && <div style={{ fontSize: '12px', color: '#718096' }}>{org.contact_email}</div>}
                              </td>
                              <td style={styles.td}>{org.business_type}</td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.badge,
                                  background: userCount >= (org.max_users || 5) ? '#fee2e2' : '#dbeafe',
                                  color: userCount >= (org.max_users || 5) ? '#991b1b' : '#1e40af'
                                }}>
                                  {userCount} users
                                </span>
                              </td>
                              <td style={styles.td}>
                                <input
                                  type="number"
                                  min="1"
                                  max="1000"
                                  defaultValue={org.max_users || 5}
                                  onChange={(e) => {
                                    if (e.target.value && parseInt(e.target.value) > 0) {
                                      updateOrganizationMaxUsers(org.id, parseInt(e.target.value));
                                    }
                                  }}
                                  style={{ ...styles.dateInput, width: '80px' }}
                                />
                              </td>
                              <td style={styles.td}>
                                <div>
                                  {org.subscription_expiry_date ? (
                                    <span style={{
                                      ...styles.badge,
                                      background: isExpired ? '#fee2e2' : isExpiringSoon ? '#fef3c7' : '#d1fae5',
                                      color: isExpired ? '#991b1b' : isExpiringSoon ? '#92400e' : '#065f46'
                                    }}>
                                      {new Date(org.subscription_expiry_date).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span style={styles.noExpiry}>Not set</span>
                                  )}
                                  <input
                                    type="date"
                                    defaultValue={org.subscription_expiry_date?.split('T')[0] || ''}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        updateOrganizationSubscription(org.id, e.target.value);
                                      }
                                    }}
                                    style={styles.dateInput}
                                  />
                                </div>
                              </td>
                              <td style={styles.td}>
                                <button
                                  onClick={() => toggleOrganizationStatus(org.id, org.is_active, org.name)}
                                  style={styles.actionButton}
                                >
                                  Suspend
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div style={styles.subscriptionCard}>
                <h3 style={styles.subscriptionCardTitle}>
                  Expired Subscriptions ({organizations.filter(o => o.is_active && !hasActiveSubscription(o)).length})
                </h3>
                <div style={styles.tableContainer}>
                  {organizations.filter(o => o.is_active && !hasActiveSubscription(o)).length === 0 ? (
                    <p style={styles.emptyState}>No organizations with expired subscriptions</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Organization</th>
                          <th style={styles.th}>Business Type</th>
                          <th style={styles.th}>Users</th>
                          <th style={styles.th}>Subscription Expiry</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.filter(o => o.is_active && !hasActiveSubscription(o)).map((org) => {
                          const userCount = getOrganizationUserCount(org.id);
                          return (
                            <tr key={org.id} style={styles.tr}>
                              <td style={styles.td}>
                                <strong>{org.name}</strong>
                                {org.contact_email && <div style={{ fontSize: '12px', color: '#718096' }}>{org.contact_email}</div>}
                              </td>
                              <td style={styles.td}>{org.business_type}</td>
                              <td style={styles.td}>
                                <span style={styles.badge}>
                                  {userCount} users
                                </span>
                              </td>
                              <td style={styles.td}>
                                <div>
                                  {org.subscription_expiry_date ? (
                                    <span style={{
                                      ...styles.badge,
                                      background: '#fee2e2',
                                      color: '#991b1b'
                                    }}>
                                      Expired: {new Date(org.subscription_expiry_date).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span style={{...styles.badge, background: '#fee2e2', color: '#991b1b'}}>Not set</span>
                                  )}
                                  <input
                                    type="date"
                                    defaultValue={org.subscription_expiry_date?.split('T')[0] || ''}
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        updateOrganizationSubscription(org.id, e.target.value);
                                      }
                                    }}
                                    style={styles.dateInput}
                                  />
                                </div>
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => quickRenewOrganization(org.id, 30, org.name)}
                                    style={{...styles.renewButton, fontSize: '12px', padding: '4px 8px'}}
                                    title="Renew for 30 days"
                                  >
                                    30 Days
                                  </button>
                                  <button
                                    onClick={() => quickRenewOrganization(org.id, 90, org.name)}
                                    style={{...styles.renewButton, fontSize: '12px', padding: '4px 8px'}}
                                    title="Renew for 90 days"
                                  >
                                    90 Days
                                  </button>
                                  <button
                                    onClick={() => quickRenewOrganization(org.id, 365, org.name)}
                                    style={{...styles.renewButton, fontSize: '12px', padding: '4px 8px'}}
                                    title="Renew for 1 year"
                                  >
                                    1 Year
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div style={styles.subscriptionCard}>
                <h3 style={styles.subscriptionCardTitle}>
                  Suspended Organizations ({organizations.filter(o => !o.is_active).length})
                </h3>
                <div style={styles.tableContainer}>
                  {organizations.filter(o => !o.is_active).length === 0 ? (
                    <p style={styles.emptyState}>No suspended organizations</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Organization</th>
                          <th style={styles.th}>Business Type</th>
                          <th style={styles.th}>Users</th>
                          <th style={styles.th}>Suspended At</th>
                          <th style={styles.th}>Reason</th>
                          <th style={styles.th}>Subscription Status</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {organizations.filter(o => !o.is_active).map((org) => {
                          const userCount = getOrganizationUserCount(org.id);
                          const hasValidSubscription = hasActiveSubscription(org);
                          return (
                            <tr key={org.id} style={styles.tr}>
                              <td style={styles.td}>
                                <strong>{org.name}</strong>
                                {org.contact_email && <div style={{ fontSize: '12px', color: '#718096' }}>{org.contact_email}</div>}
                              </td>
                              <td style={styles.td}>{org.business_type}</td>
                              <td style={styles.td}>
                                <span style={styles.badge}>
                                  {userCount} users
                                </span>
                              </td>
                              <td style={styles.td}>
                                {org.suspended_at ? new Date(org.suspended_at).toLocaleDateString() : '-'}
                              </td>
                              <td style={styles.td}>
                                <span style={styles.suspensionReason}>
                                  {org.suspension_reason || 'No reason provided'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {hasValidSubscription ? (
                                  <span style={{
                                    ...styles.badge,
                                    background: '#d1fae5',
                                    color: '#065f46'
                                  }}>
                                    Valid until {new Date(org.subscription_expiry_date).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span style={{
                                    ...styles.badge,
                                    background: '#fee2e2',
                                    color: '#991b1b'
                                  }}>
                                    {org.subscription_expiry_date ? 'Expired' : 'Not Set'}
                                  </span>
                                )}
                              </td>
                              <td style={styles.td}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {!hasValidSubscription && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      <button
                                        onClick={() => renewAndActivateOrganization(org.id, 30, org.name)}
                                        style={{...styles.renewButton, fontSize: '12px', padding: '4px 8px'}}
                                        title="Renew for 30 days and activate"
                                      >
                                        30 Days
                                      </button>
                                      <button
                                        onClick={() => renewAndActivateOrganization(org.id, 90, org.name)}
                                        style={{...styles.renewButton, fontSize: '12px', padding: '4px 8px'}}
                                        title="Renew for 90 days and activate"
                                      >
                                        90 Days
                                      </button>
                                      <button
                                        onClick={() => renewAndActivateOrganization(org.id, 365, org.name)}
                                        style={{...styles.renewButton, fontSize: '12px', padding: '4px 8px'}}
                                        title="Renew for 1 year and activate"
                                      >
                                        1 Year
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => toggleOrganizationStatus(org.id, org.is_active, org.name)}
                                    style={styles.activateButton}
                                  >
                                    {hasValidSubscription ? 'Activate' : 'Activate (Renew Subscription)'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'organizations' && (
          <div style={styles.tabContent}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Organizations</h2>
            </div>

            <div style={styles.grid}>
              {organizations.map((org) => {
                const assignedUser = users.find(u => u.id === org.assigned_user_id);
                const orgAssessments = assessments.filter(a => a.organization_id === org.id);
                return (
                  <div key={org.id} style={styles.card}>
                    <h3 style={styles.cardTitle}>{org.name}</h3>
                    <p style={styles.cardText}>{org.business_type}</p>
                    <p style={styles.cardSubtext}>Size: {org.size}</p>
                    <p style={styles.cardSubtext}>
                      Assigned to: {assignedUser ? assignedUser.full_name || assignedUser.email : 'Unassigned'}
                    </p>
                    <p style={styles.cardSubtext}>Assessments: {orgAssessments.length}</p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => setEditOrg(org)}
                        style={styles.actionButton}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({
                          show: true,
                          type: 'organization',
                          id: org.id,
                          name: org.name
                        })}
                        style={styles.dangerActionButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>All Assessments</h2>
            <p style={{ color: '#718096', marginBottom: '24px', fontSize: '14px' }}>
              Total Assessments: {assessments.length} across {organizations.length} organizations
            </p>

            {organizations.map((org) => {
              const orgAssessments = assessments.filter(a => a.organization_id === org.id);
              if (orgAssessments.length === 0) return null;

              return (
                <div key={org.id} style={styles.orgAssessmentCard}>
                  <div style={styles.orgAssessmentHeader}>
                    <div>
                      <h3 style={styles.orgAssessmentTitle}>{org.name}</h3>
                      <p style={styles.orgAssessmentSubtitle}>
                        {org.business_type} • {orgAssessments.length} assessment{orgAssessments.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={styles.orgAssessmentStats}>
                      <span style={{
                        ...styles.badge,
                        background: '#d1fae5',
                        color: '#065f46'
                      }}>
                        {orgAssessments.filter(a => a.status === 'completed').length} Completed
                      </span>
                      <span style={{
                        ...styles.badge,
                        background: '#fef3c7',
                        color: '#92400e'
                      }}>
                        {orgAssessments.filter(a => a.status !== 'completed').length} In Progress
                      </span>
                    </div>
                  </div>

                  <div style={styles.tableContainer}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Date</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Risk Rating</th>
                          <th style={styles.th}>Assessor</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgAssessments.map((assessment) => (
                          <tr key={assessment.id} style={styles.tr}>
                            <td style={styles.td}>{new Date(assessment.assessment_date).toLocaleDateString()}</td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.badge,
                                background: assessment.status === 'completed' ? '#d1fae5' : '#fef3c7',
                                color: assessment.status === 'completed' ? '#065f46' : '#92400e'
                              }}>
                                {assessment.status}
                              </span>
                            </td>
                            <td style={styles.td}>
                              {assessment.overall_risk_rating ? (
                                <span style={{
                                  ...styles.badge,
                                  background: getRiskColor(assessment.overall_risk_rating) + '20',
                                  color: getRiskColor(assessment.overall_risk_rating)
                                }}>
                                  {getRiskLabel(assessment.overall_risk_rating)}
                                </span>
                              ) : '-'}
                            </td>
                            <td style={styles.td}>{assessment.assessor_name || '-'}</td>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => navigate(`/report/${assessment.id}`)}
                                  style={styles.linkButton}
                                >
                                  View Report
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({
                                    show: true,
                                    type: 'assessment',
                                    id: assessment.id,
                                    name: `${org.name} - ${new Date(assessment.assessment_date).toLocaleDateString()}`
                                  })}
                                  style={styles.dangerActionButton}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {assessments.length === 0 && (
              <p style={styles.emptyState}>No assessments found.</p>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Content Management</h2>
            <p style={{ color: '#718096', marginBottom: '24px' }}>
              Edit Terms & Conditions, Privacy Policy, and Support information that appears throughout the system.
            </p>

            <div style={styles.contentGrid}>
              {['terms', 'privacy', 'support'].map(key => {
                const content = systemContent[key];
                if (!content) return null;

                return (
                  <div key={key} style={styles.contentCard}>
                    <h3 style={styles.contentCardTitle}>{content.title}</h3>
                    <p style={styles.contentCardMeta}>
                      Last updated: {content.updated_at ? new Date(content.updated_at).toLocaleString() : 'Never'}
                    </p>
                    <button
                      onClick={() => setEditingContent({...content})}
                      style={styles.primaryButton}
                    >
                      Edit Content
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {editUser && (
        <div style={styles.modal} onClick={() => setEditUser(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit User</h2>
            <form onSubmit={updateUser}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  type="text"
                  value={editUser.full_name}
                  onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  style={styles.select}
                >
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setEditUser(null)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOrg && (
        <div style={styles.modal} onClick={() => setEditOrg(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit Organization</h2>
            <form onSubmit={updateOrganization}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Name</label>
                <input
                  type="text"
                  value={editOrg.name}
                  onChange={(e) => setEditOrg({ ...editOrg, name: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Business Type</label>
                <input
                  type="text"
                  value={editOrg.business_type}
                  onChange={(e) => setEditOrg({ ...editOrg, business_type: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Size</label>
                <select
                  value={editOrg.size}
                  onChange={(e) => setEditOrg({ ...editOrg, size: e.target.value })}
                  style={styles.select}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Institution Category</label>
                <select
                  value={editOrg.dnfbp_category || ''}
                  onChange={(e) => setEditOrg({ ...editOrg, dnfbp_category: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Select Institution Category</option>
                  {institutionCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setEditOrg(null)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editAssessment && (
        <div style={styles.modal} onClick={() => setEditAssessment(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit Assessment</h2>
            <form onSubmit={updateAssessment}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Assessment Date</label>
                <input
                  type="date"
                  value={editAssessment.assessment_date}
                  onChange={(e) => setEditAssessment({ ...editAssessment, assessment_date: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select
                  value={editAssessment.status}
                  onChange={(e) => setEditAssessment({ ...editAssessment, status: e.target.value })}
                  style={styles.select}
                >
                  <option value="draft">Draft</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Overall Risk Rating</label>
                <select
                  value={editAssessment.overall_risk_rating || ''}
                  onChange={(e) => setEditAssessment({ ...editAssessment, overall_risk_rating: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Not Assessed</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setEditAssessment(null)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm.show && (
        <div style={styles.modal} onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Confirm Delete</h2>
            <p style={styles.modalText}>
              Are you sure you want to delete this {deleteConfirm.type}?
            </p>
            <p style={{ ...styles.modalText, fontWeight: '600' }}>
              {deleteConfirm.name}
            </p>
            <p style={{ ...styles.modalText, color: '#ef4444', fontSize: '13px' }}>
              This action cannot be undone. All related data will be permanently deleted.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setDeleteConfirm({ show: false, type: '', id: null, name: '' })}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={styles.dangerButton}
              >
                Delete {deleteConfirm.type}
              </button>
            </div>
          </div>
        </div>
      )}

      {suspendModal.show && (
        <div style={styles.modal} onClick={() => setSuspendModal({ show: false, userId: null, userName: '', currentStatus: true })}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Suspend User</h2>
            <p style={styles.modalText}>
              You are about to suspend the following user:
            </p>
            <p style={{ ...styles.modalText, fontWeight: '600' }}>
              {suspendModal.userName}
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reason for Suspension *</label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g., Subscription payment overdue, Terms violation, etc."
                style={styles.textarea}
                rows={4}
                required
              />
            </div>
            <p style={{ ...styles.modalText, color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>
              The user will be unable to access the system until reactivated.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setSuspendModal({ show: false, userId: null, userName: '', currentStatus: true })}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendUser}
                style={styles.dangerButton}
              >
                Suspend User
              </button>
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div style={styles.modal} onClick={() => {
          setShowChangePassword(false);
          setPasswordForm({ newPassword: '', confirmPassword: '' });
          setPasswordError('');
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={styles.label}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  style={styles.input}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              {passwordError && (
                <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>
                  {passwordError}
                </p>
              )}
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingContent && (
        <div style={styles.modal} onClick={() => setEditingContent(null)}>
          <div style={styles.largeModalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit {editingContent.title}</h2>
            <form onSubmit={updateSystemContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Title</label>
                <input
                  type="text"
                  value={editingContent.title}
                  onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Content</label>
                <p style={{ fontSize: '13px', color: '#718096', marginBottom: '8px' }}>
                  You can use markdown formatting for better text structure.
                </p>
                <div style={styles.formattingToolbar}>
                  <button
                    type="button"
                    onClick={makeBold}
                    style={styles.formatButton}
                    title="Bold (Markdown: **text**)"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    onClick={makeItalic}
                    style={styles.formatButton}
                    title="Italic (Markdown: *text*)"
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    onClick={makeBulletList}
                    style={styles.formatButton}
                    title="Bullet List (Markdown: - item)"
                  >
                    <span style={{ fontFamily: 'monospace' }}>• List</span>
                  </button>
                </div>
                <textarea
                  id="content-editor"
                  value={editingContent.content}
                  onChange={(e) => setEditingContent({ ...editingContent, content: e.target.value })}
                  style={styles.largeTextarea}
                  rows={20}
                  required
                />
              </div>
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setEditingContent(null)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupport && (
        <div style={styles.modal} onClick={() => setShowSupport(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{systemContent.support?.title || 'Contact Support'}</h2>
            <div style={styles.supportInfo}>
              <MarkdownRenderer content={systemContent.support?.content || 'Loading support information...'} />
            </div>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowSupport(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrivacyPolicy && (
        <div style={styles.modal} onClick={() => setShowPrivacyPolicy(false)}>
          <div style={styles.privacyPolicyContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{...styles.modalTitle, padding: '24px 32px 0'}}>{systemContent.privacy?.title || 'Privacy Policy'}</h2>
            <div style={styles.privacyPolicyScroll}>
              <MarkdownRenderer content={systemContent.privacy?.content || 'Loading privacy policy...'} />
            </div>
            <div style={{...styles.modalActions, padding: '20px 32px', borderTop: '1px solid #e8eaed'}}>
              <button
                onClick={() => setShowPrivacyPolicy(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showTermsAndConditions && (
        <div style={styles.modal} onClick={() => setShowTermsAndConditions(false)}>
          <div style={styles.privacyPolicyContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{...styles.modalTitle, padding: '24px 32px 0'}}>{systemContent.terms?.title || 'Terms & Conditions'}</h2>
            <div style={styles.privacyPolicyScroll}>
              <MarkdownRenderer content={systemContent.terms?.content || 'Loading terms & conditions...'} />
            </div>
            <div style={{...styles.modalActions, padding: '20px 32px', borderTop: '1px solid #e8eaed'}}>
              <button
                onClick={() => setShowTermsAndConditions(false)}
                style={styles.cancelButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          © 2026 IurisPeritis. All Rights Reserved.
        </div>
        <div style={styles.footerRight}>
          <a
            href="#"
            style={styles.footerLink}
            onClick={(e) => { e.preventDefault(); setShowTermsAndConditions(true); }}
            onMouseEnter={(e) => { e.target.style.color = '#d4af37'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Terms & Conditions
          </a>
          <span style={styles.footerDivider}>|</span>
          <a
            href="#"
            style={styles.footerLink}
            onClick={(e) => { e.preventDefault(); setShowPrivacyPolicy(true); }}
            onMouseEnter={(e) => { e.target.style.color = '#d4af37'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Privacy Policy
          </a>
          <span style={styles.footerDivider}>|</span>
          <a
            href="#"
            style={styles.footerLink}
            onClick={(e) => { e.preventDefault(); setShowSupport(true); }}
            onMouseEnter={(e) => { e.target.style.color = '#d4af37'; e.target.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#ffffff'; e.target.style.transform = 'translateY(0)'; }}
          >
            Support
          </a>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '32px',
    margin: '24px 24px 0 24px',
    borderRadius: '12px 12px 0 0',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-end',
  },
  iconButtonsRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: '1.2',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#d4af37',
    fontWeight: '600',
  },
  iconButton: {
    padding: '10px 14px',
    background: 'rgba(212, 175, 55, 0.1)',
    color: '#d4af37',
    border: '2px solid #d4af37',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    padding: '10px 20px',
    background: '#d4af37',
    color: '#0a1929',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 24px 24px 24px',
    padding: '24px 32px 32px 32px',
    background: 'white',
    borderRadius: '0 0 12px 12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '32px',
    borderBottom: '3px solid #d4af37',
  },
  tab: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
    color: '#718096',
    transition: 'all 0.3s',
  },
  tabActive: {
    color: '#0a1929',
    borderBottom: '3px solid #d4af37',
    fontWeight: '700',
  },
  tabContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    border: '1px solid #d4af37',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '20px 24px',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 2px 8px rgba(212,175,55,0.15)',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    margin: 0,
  },
  primaryButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    transition: 'all 0.3s ease',
  },
  form: {
    marginBottom: '32px',
    padding: '24px',
    background: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #d4af37',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '700',
    color: '#0a1929',
  },
  input: {
    padding: '10px 12px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
  },
  selectSmall: {
    padding: '6px 8px',
    border: '2px solid #cbd5e0',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
    transition: 'all 0.3s ease',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    fontWeight: '700',
    color: '#ffffff',
    fontSize: '13px',
    borderBottom: '3px solid #d4af37',
    letterSpacing: '0.5px',
  },
  tr: {
    borderBottom: '1px solid #e8eaed',
    transition: 'background 0.2s ease',
  },
  td: {
    padding: '12px',
    color: '#2d3748',
    fontSize: '14px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  actionButton: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#0a1929',
    border: '1px solid #d4af37',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  dangerActionButton: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  },
  linkButton: {
    padding: '6px 16px',
    background: 'transparent',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.3s ease',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 2px 8px rgba(212,175,55,0.2)',
  },
  cardTitle: {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
  },
  cardText: {
    margin: '0 0 4px 0',
    color: '#4a5568',
    fontSize: '14px',
  },
  cardSubtext: {
    margin: '0 0 4px 0',
    color: '#718096',
    fontSize: '13px',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    color: '#718096',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    padding: '32px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    border: '2px solid #d4af37',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  modalTitle: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#0a1929',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '12px',
  },
  modalText: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#2d3748',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: '16px',
    backgroundColor: '#f8f9fa',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  dangerButton: {
    padding: '10px 24px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
  },
  cancelButton: {
    padding: '10px 24px',
    background: '#f0f0f0',
    color: '#2d3748',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  suspendInfo: {
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  suspendReason: {
    fontSize: '11px',
    color: '#718096',
    fontStyle: 'italic',
    maxWidth: '200px',
    wordWrap: 'break-word',
  },
  dateInput: {
    padding: '4px 8px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '4px',
    width: '100%',
  },
  reportButton: {
    padding: '6px 12px',
    background: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px',
  },
  reportButtonAlt: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#059669',
    border: '1px solid #059669',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '12px',
  },
  subscriptionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    marginTop: '24px',
  },
  subscriptionCard: {
    background: '#f7fafc',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
  },
  subscriptionCardTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a202c',
  },
  noExpiry: {
    color: '#718096',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  suspensionReason: {
    fontSize: '13px',
    color: '#718096',
    fontStyle: 'italic',
    display: 'block',
    maxWidth: '300px',
  },
  activateButton: {
    padding: '6px 12px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
  },
  renewButton: {
    padding: '6px 12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '14px',
  },
  footer: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '24px 32px',
    color: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '3px solid #d4af37',
    marginTop: '48px',
  },
  footerLeft: {
    fontSize: '14px',
    color: '#d4af37',
    fontWeight: '500',
  },
  footerRight: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    paddingRight: '48px',
  },
  footerLink: {
    color: '#ffffff',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'color 0.3s ease',
  },
  footerDivider: {
    color: '#d4af37',
    fontSize: '14px',
  },
  supportInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    margin: '24px 0',
  },
  supportItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  supportLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  supportValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#0a1929',
    textDecoration: 'none',
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #e8eaed',
    transition: 'all 0.3s ease',
  },
  privacyPolicyContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '0',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
  },
  privacyPolicyScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
    paddingTop: '24px',
  },
  privacySection: {
    marginBottom: '32px',
  },
  privacySectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
    marginBottom: '16px',
    marginTop: '0',
  },
  privacySubTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginTop: '16px',
    marginBottom: '12px',
  },
  privacyText: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#475569',
    marginBottom: '12px',
  },
  privacyList: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#475569',
    paddingLeft: '24px',
    marginTop: '8px',
    marginBottom: '12px',
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    marginTop: '24px',
  },
  contentCard: {
    background: '#f8f9fa',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    boxShadow: '0 2px 8px rgba(212,175,55,0.2)',
  },
  contentCardTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
  },
  contentCardMeta: {
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: '#718096',
  },
  largeModalContent: {
    background: 'white',
    padding: '32px',
    borderRadius: '12px',
    maxWidth: '900px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '2px solid #d4af37',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  largeTextarea: {
    width: '100%',
    padding: '12px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'vertical',
    backgroundColor: '#f8f9fa',
    boxSizing: 'border-box',
  },
  supportContent: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#2d3748',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0,
  },
  markdownContent: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#2d3748',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0,
  },
  formattingToolbar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '2px solid #cbd5e0',
  },
  formatButton: {
    padding: '8px 16px',
    background: '#ffffff',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '40px',
  },
  orgAssessmentCard: {
    background: '#f8f9fa',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #d4af37',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(212,175,55,0.15)',
  },
  orgAssessmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #d4af37',
  },
  orgAssessmentTitle: {
    margin: '0 0 6px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#0a1929',
  },
  orgAssessmentSubtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500',
  },
  orgAssessmentStats: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  registrationSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    marginTop: '24px',
  },
  registrationCard: {
    background: '#f7fafc',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
  },
};
