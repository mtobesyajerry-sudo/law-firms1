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
import AssessmentForm from './components/AssessmentForm';
import AssessmentReport from './components/AssessmentReport';
import KYCClientDetails from './components/KYCClientDetails';
import STRAlertDashboard from './components/STRAlertDashboard';
import ControlAssessmentForm from './components/ControlAssessmentForm';
import IntegratedClientRiskView from './components/IntegratedClientRiskView';

function ProtectedRoute({ children, adminOnly = false, managementOnly = false, staffOnly = false, complianceOnly = false }) {
  const { user, profile, loading, signOut, isEarlyClient } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#718096'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
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
  if (managementOnly && !(profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'senior_partner' || profile?.role === 'partner' || (profile?.role === 'client' && isEarlyClient))) {
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
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        color: '#718096'
      }}>
        Loading...
      </div>
    );
  }

  // Route users to appropriate dashboard based on role
  if (profile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  } else if (profile?.role === 'management' || profile?.role === 'senior_partner' || profile?.role === 'partner') {
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
            <ManagementDashboard />
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
  console.log('=== App component rendering ===');

  // Add a safety check to ensure the component is actually running
  React.useEffect(() => {
    console.log('=== App component mounted ===');
    return () => console.log('=== App component unmounting ===');
  }, []);

  try {
    return (
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Error rendering App:', error);
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
          <h1 style={{ color: '#e53e3e', marginBottom: '16px' }}>App Initialization Error</h1>
          <p style={{ color: '#4a5568', marginBottom: '16px' }}>
            The application failed to initialize.
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
            {error.toString()}
          </pre>
        </div>
      </div>
    );
  }
}
