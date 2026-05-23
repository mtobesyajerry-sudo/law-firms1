import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
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
import { validatePassword } from './utils/security';

// Shown when profile.password_change_required = true.
// The user cannot reach any other route until they set a compliant password.
function ForcePasswordChange() {
  const { signOut, refreshProfile } = useAuth();
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
      const { data: { user } } = await supabase.auth.getUser();
      // Record new password hash in history to enable reuse prevention
      const encoded = new TextEncoder().encode(pw);
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
      const pwHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      await supabase.from('password_history').insert({ user_id: user.id, password_hash: pwHash });
      // Clear the forced-change flag
      await supabase.from('user_profiles')
        .update({ password_change_required: false })
        .eq('id', user.id);
      refreshProfile();
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

function ProtectedRoute({ children, adminOnly = false, managementOnly = false, staffOnly = false, complianceOnly = false }) {
  const { user, profile, loading, signOut, isEarlyClient, requiresPasswordChange } = useAuth();

  if (loading) {
    const isInitialLoad = !sessionStorage.getItem('app_mounted');
    if (isInitialLoad) {
      sessionStorage.setItem('app_mounted', 'true');
      return <LoadingSpinner fullPage />;
    }
    return <LoadingSpinner fullPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Block all navigation until a forced password change is completed
  if (requiresPasswordChange) {
    return <ForcePasswordChange />;
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

  return children;
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
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
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
      <Route path="*" element={<Navigate to="/" />} />
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

