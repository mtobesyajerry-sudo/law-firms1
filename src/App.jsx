import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import MfaEnrollment from './components/MfaEnrollment';
import ClientDashboard from './components/ClientDashboard';
import ManagementDashboard from './components/ManagementDashboard';
import ClientManagementDashboard from './components/ClientManagementDashboard';
import StaffDashboard from './components/StaffDashboard';
import ComplianceOfficerDashboard from './components/ComplianceOfficerDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import SystemAdminDashboard from './components/SystemAdminDashboard';
import AssessmentForm from './components/AssessmentForm';
import AssessmentReport from './components/AssessmentReport';
import KYCClientDetails from './components/KYCClientDetails';
import STRAlertDashboard from './components/STRAlertDashboard';
import ControlAssessmentForm from './components/ControlAssessmentForm';
import IntegratedClientRiskView from './components/IntegratedClientRiskView';
import LoadingSpinner from './components/LoadingSpinner';
import TrialBanner from './components/TrialBanner';
import TrialExpiredModal from './components/TrialExpiredModal';
import PricingPage from './components/pricing/PricingPage';
import BillingPage from './components/BillingPage';
import AdminPaymentsPage from './components/AdminPaymentsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import { validatePassword } from './utils/security';
import AccountantKycForm from './components/AccountantKycForm';
import AccountantKycReport from './components/AccountantKycReport';
import KycCddForm from './components/KycCddForm';
import KycCddReport from './components/KycCddReport';

// Shown when profile.password_change_required = true.
// The user cannot reach any other route until they set a compliant password.
function ForcePasswordChange() {
  const { signOut, refreshProfile, patchProfile } = useAuth();
  const [pw, setPw] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const check = validatePassword(pw);
    if (!check.isValid) { setError(check.errors.join(' ')); return; }
    if (pw !== confirm) { setError('Passwords do not match'); return; }
    setSaving(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: pw });
      if (updateErr) throw updateErr;

      // Commit the new JWT synchronously before any authenticated RPC call.
      // updateUser issues a new token asynchronously; without this the RPC lands
      // with the old token and can fail with a 401, leaving the flag stuck true.
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) throw new Error(`Password changed but session could not be refreshed: ${refreshErr.message}. Please sign out and sign back in.`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Session lost after password update — please log in again.');

      // Record new password hash for reuse prevention (failure is non-fatal)
      const encoded = new TextEncoder().encode(pw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      const pwHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      await supabase.from('password_history').insert({ user_id: user.id, password_hash: pwHash });

      // Clear the forced-change flag via SECURITY DEFINER RPC.
      // Retry once if it fails — re-refresh first in case token rotation raced again.
      const clearFlag = async () => supabase.rpc('complete_password_change');
      let { error: flagErr } = await clearFlag();
      if (flagErr) {
        await supabase.auth.refreshSession();
        const retry = await clearFlag();
        flagErr = retry.error;
      }
      // If both attempts failed, surface the error and stay on this page.
      // The user's password IS changed but the account flag is still set —
      // they must retry rather than be forwarded into the app in a half-state.
      if (flagErr) {
        throw new Error(
          `Your password was changed, but we could not fully update your account (${flagErr.message}). ` +
          `Please try submitting again, or sign out and contact support if the problem persists.`
        );
      }

      // Flag cleared — unblock the route guard immediately in local state,
      // then fetch the full profile to sync any other fields.
      patchProfile({ password_change_required: false });
      await refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
      <div style={{ maxWidth: '440px', width: '100%', background: 'white', padding: '48px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '700', color: '#1a202c' }}>Change Your Password</h1>
        <p style={{ margin: '0 0 28px', fontSize: '15px', color: '#4a5568', lineHeight: '1.5' }}>
          Your account requires a password change before you can continue. Choose a strong password with at least 12 characters including uppercase, lowercase, a number, and a special character.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>New Password</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' }} />
          </div>
          {error && <p style={{ color: '#e53e3e', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
        <button onClick={signOut} style={{ marginTop: '16px', width: '100%', padding: '10px', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '8px', color: '#4a5568', fontSize: '14px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function MfaNudgeBanner({ gracePeriodEnds, onSetupNow, onDismiss }) {
  const graceDate = new Date(gracePeriodEnds);
  const daysLeft = Math.max(0, Math.ceil((graceDate - Date.now()) / 86400000));
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: daysLeft <= 3 ? '#fef2f2' : '#fffbeb',
      borderBottom: `2px solid ${daysLeft <= 3 ? '#fca5a5' : '#fcd34d'}`,
      padding: '10px 20px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '14px', color: daysLeft <= 3 ? '#b91c1c' : '#92400e', fontWeight: '600' }}>
        Two-factor authentication is required by {graceDate.toLocaleDateString()}.
        {daysLeft > 0 ? ` ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining.` : ' Required now.'}
      </span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={onSetupNow} style={{
          padding: '6px 16px', fontSize: '13px', fontWeight: '700',
          color: '#0a1929', background: 'linear-gradient(135deg,#d4af37,#f4d03f)',
          border: 'none', borderRadius: '6px', cursor: 'pointer',
        }}>Set up now</button>
        {daysLeft > 0 && (
          <button onClick={onDismiss} style={{
            padding: '6px 14px', fontSize: '13px', fontWeight: '600',
            color: '#64748b', background: 'transparent',
            border: '1px solid #cbd5e0', borderRadius: '6px', cursor: 'pointer',
          }}>Remind me later</button>
        )}
      </div>
    </div>
  );
}

// Full-page MFA enrollment screen — used for forced enrollment (grace expired) and voluntary setup.
// Unlike the overlay version, this replaces the entire page so there's nothing behind it.
function MfaEnrollmentPage({ forced, gracePeriodEnds, onComplete, onSkip }) {
  const { signOut } = useAuth();
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1929 0%, #0d2137 50%, #0a1929 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        {forced && (
          <div style={{
            textAlign: 'center', marginBottom: '24px',
            color: '#d4af37', fontSize: '13px', fontWeight: '600',
            letterSpacing: '1px', textTransform: 'uppercase',
          }}>
            Two-factor authentication is required to continue
          </div>
        )}
        <MfaEnrollment
          forced={forced}
          gracePeriodEnds={gracePeriodEnds}
          onComplete={onComplete}
          onSkip={onSkip}
        />
        {forced && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={signOut}
              style={{
                background: 'transparent', border: 'none',
                color: '#64748b', fontSize: '13px', cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign out instead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Voluntary MFA security settings page — accessible from the profile menu.
function MfaSettingsPage() {
  const { mfaEnrolled, mfaAssuranceLevel, mfaGracePeriodEnds, refreshMfaState } = useAuth();
  const [showEnrollment, setShowEnrollment] = React.useState(false);
  const navigate = useNavigate();

  if (showEnrollment) {
    return (
      <MfaEnrollmentPage
        gracePeriodEnds={mfaGracePeriodEnds}
        onComplete={() => { setShowEnrollment(false); refreshMfaState(); }}
        onSkip={() => setShowEnrollment(false)}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f8',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent', border: 'none',
            color: '#64748b', fontSize: '14px', cursor: 'pointer',
            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px',
            padding: 0,
          }}
        >
          ← Back
        </button>

        <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800', color: '#0a1929' }}>
          Security Settings
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: '15px', color: '#4a5568', lineHeight: 1.6 }}>
          Manage your account security settings including two-factor authentication.
        </p>

        <div style={{
          background: 'white', borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#0a1929', marginBottom: '4px' }}>
                Two-Factor Authentication (TOTP)
              </div>
              <div style={{ fontSize: '13px', color: mfaEnrolled ? '#059669' : '#92400e' }}>
                {mfaEnrolled
                  ? 'Active — your account is protected with an authenticator app'
                  : 'Not set up — your account uses only a password'}
              </div>
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
              background: mfaEnrolled ? '#d1fae5' : '#fef3c7',
              color: mfaEnrolled ? '#065f46' : '#92400e',
              whiteSpace: 'nowrap',
            }}>
              {mfaEnrolled ? 'Enabled' : 'Not enabled'}
            </div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {mfaEnrolled ? (
              <div style={{
                padding: '14px', background: '#f0fdf4',
                border: '1px solid #86efac', borderRadius: '8px',
                fontSize: '14px', color: '#166534', lineHeight: 1.5,
              }}>
                Two-factor authentication is active. When you log in, you will be asked for a code from your authenticator app.
                To change your authenticator app, set up MFA again — this will replace the existing factor.
              </div>
            ) : (
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#4a5568', lineHeight: 1.6 }}>
                Add an extra layer of security by requiring a one-time code from your authenticator app each time you sign in.
              </p>
            )}

            <button
              onClick={() => setShowEnrollment(true)}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                color: '#0a1929', border: 'none', borderRadius: '8px',
                fontWeight: '700', fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
              }}
            >
              {mfaEnrolled ? 'Re-enroll authenticator app' : 'Set up two-factor authentication'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false, managementOnly = false, staffOnly = false, complianceOnly = false, billingOnly = false }) {
  const { user, profile, loading, signOut, isEarlyClient, requiresPasswordChange,
    requiresMfaEnrollment, showMfaNudge, mfaGracePeriodEnds, refreshMfaState,
    isTrialing, trialEndsAt, daysUntilTrialEnds, trialExpiredNeedPayment } = useAuth();
  const [showMfaEnrollment, setShowMfaEnrollment] = React.useState(false);
  const [nudgeDismissed, setNudgeDismissed] = React.useState(false);
  const [trialBannerDismissed, setTrialBannerDismissed] = React.useState(false);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Block all navigation until a forced password change is completed
  if (requiresPasswordChange) {
    return <ForcePasswordChange />;
  }

  // Block all navigation until forced MFA enrollment completes (grace period expired).
  // Render the enrollment page full-screen — no dashboard, no sidebar behind it.
  if (requiresMfaEnrollment) {
    return (
      <MfaEnrollmentPage
        forced
        onComplete={refreshMfaState}
      />
    );
  }

  if (profile && !profile.is_active) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f7fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{
          maxWidth: '600px',
          background: 'white',
          padding: '48px',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
          }}>
            🚫
          </div>
          <h1 style={{
            margin: '0 0 16px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a202c',
          }}>
            Account Suspended
          </h1>
          <p style={{
            margin: '0 0 24px 0',
            fontSize: '16px',
            color: '#4a5568',
            lineHeight: '1.6',
          }}>
            Your access to the AML/CFT/CPF Risk Assessment System has been suspended by the Administrator.
          </p>
          {profile.suspension_reason && (
            <div style={{
              background: '#fef3c7',
              border: '2px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <p style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#92400e',
              }}>
                Reason for Suspension:
              </p>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#78350f',
              }}>
                {profile.suspension_reason}
              </p>
            </div>
          )}
          <p style={{
            margin: '0 0 32px 0',
            fontSize: '14px',
            color: '#718096',
            lineHeight: '1.6',
          }}>
            Please contact the system administrator to resolve this issue and restore your access.
          </p>
          <button
            onClick={signOut}
            style={{
              padding: '12px 32px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/client/dashboard" replace />;
  }

  if (billingOnly && !(profile?.role === 'management' || profile?.role === 'admin')) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Management access: admin, management, senior_partner, OR early clients (first 5 in org)
  if (managementOnly && !(profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'senior_partner' || (profile?.role === 'client' && isEarlyClient))) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Staff access: ONLY admin, staff, and lawyer (NOT client)
  if (staffOnly && (!(profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer') || profile?.role === 'client')) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Compliance access: ONLY admin, compliance_officer, and mlro (NOT client)
  if (complianceOnly && (!(profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro') || profile?.role === 'client')) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // Trial expired — non-dismissible modal (admins bypass)
  if (trialExpiredNeedPayment && profile?.role !== 'admin') {
    return <TrialExpiredModal />;
  }

  return (
    <>
      {showMfaNudge && !nudgeDismissed && mfaGracePeriodEnds && (
        <MfaNudgeBanner
          gracePeriodEnds={mfaGracePeriodEnds}
          onSetupNow={() => setShowMfaEnrollment(true)}
          onDismiss={() => setNudgeDismissed(true)}
        />
      )}
      {showMfaEnrollment && (
        <MfaEnrollmentPage
          gracePeriodEnds={mfaGracePeriodEnds}
          onComplete={() => { setShowMfaEnrollment(false); refreshMfaState(); }}
          onSkip={() => setShowMfaEnrollment(false)}
        />
      )}
      {isTrialing && !trialBannerDismissed && (profile?.role === 'management' || profile?.role === 'admin') && (
        <TrialBanner
          daysUntilTrialEnds={daysUntilTrialEnds}
          trialEndsAt={trialEndsAt}
        />
      )}
      {children}
    </>
  );
}

function RoleBasedRedirect() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // Route users to appropriate dashboard based on role
  if (profile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (profile?.role === 'management' || profile?.role === 'senior_partner') {
    return <Navigate to="/dashboard/management" replace />;
  } else if (profile?.role === 'staff' || profile?.role === 'lawyer') {
    return <Navigate to="/dashboard/staff" replace />;
  } else if (profile?.role === 'compliance_officer' || profile?.role === 'mlro') {
    return <Navigate to="/dashboard/compliance" replace />;
  } else {
    // Default to client dashboard
    return <Navigate to="/client/dashboard" replace />;
  }
}

function AppRoutes() {
  const { user, pendingMfaChallenge } = useAuth();

  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route
        path="/billing"
        element={
          <ProtectedRoute billingOnly={true}>
            <BillingPage />
          </ProtectedRoute>
        }
      />
      {/* Keep /auth mounted while MFA challenge is pending — user is still null at that point
          and Auth.jsx owns the challenge UI. Only redirect once user is fully authenticated. */}
      <Route path="/auth" element={(user && !pendingMfaChallenge) ? <Navigate to="/" /> : <Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly={true}>
            <SystemAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <ProtectedRoute adminOnly={true}>
            <SecurityDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminPaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/management"
        element={
          <ProtectedRoute managementOnly={true}>
            <ClientManagementDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/staff"
        element={
          <ProtectedRoute staffOnly={true}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/compliance"
        element={
          <ProtectedRoute complianceOnly={true}>
            <ComplianceOfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={<Navigate to="/client/dashboard" replace />}
      />
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessment/:id"
        element={
          <ProtectedRoute>
            <AssessmentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:id"
        element={
          <ProtectedRoute>
            <AssessmentReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc-client/:clientId"
        element={
          <ProtectedRoute>
            <KYCClientDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/str-alerts"
        element={
          <ProtectedRoute>
            <STRAlertDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/str-alerts"
        element={
          <ProtectedRoute adminOnly={true}>
            <STRAlertDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/control-assessment/:id"
        element={
          <ProtectedRoute>
            <ControlAssessmentForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-risk/:clientId"
        element={
          <ProtectedRoute>
            <IntegratedClientRiskView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/security/settings"
        element={
          <ProtectedRoute>
            <MfaSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
      {/* Multi-sector KYC/CDD routes */}
      <Route
        path="/accountant-kyc-form"
        element={
          <ProtectedRoute>
            <AccountantKycForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accountant-kyc-report/:id"
        element={
          <ProtectedRoute>
            <AccountantKycReport />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc-form"
        element={
          <ProtectedRoute>
            <KycCddForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc-form/:id"
        element={
          <ProtectedRoute>
            <KycCddForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc-report/:id"
        element={
          <ProtectedRoute>
            <KycCddReport />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#f7fafc'
        }}>
          <div style={{
            maxWidth: '600px',
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#e53e3e', marginBottom: '16px' }}>Application Error</h1>
            <p style={{ color: '#4a5568', marginBottom: '24px' }}>
              Something went wrong. Please refresh the page or contact support.
            </p>
            <pre style={{
              background: '#f7fafc',
              padding: '16px',
              borderRadius: '8px',
              overflow: 'auto',
              textAlign: 'left',
              fontSize: '12px',
              color: '#2d3748'
            }}>
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '24px',
                padding: '12px 32px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

