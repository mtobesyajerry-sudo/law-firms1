import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from './Dashboard';
import LawyerDashboard from './LawyerDashboard';
import ComplianceOfficerDashboard from './ComplianceOfficerDashboard';
import LoadingSpinner from './LoadingSpinner';

export default function RoleDashboard() {
  const { profile, organization, signOut } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

  if (!profile) {
    return <LoadingSpinner fullPage />;
  }

  const role = profile.role?.toLowerCase();

  let dashboardContent;
  let headerTitle = 'Dashboard';

  switch (role) {
    case 'lawyer':
      dashboardContent = <LawyerDashboard />;
      headerTitle = 'Lawyer Dashboard';
      break;

    case 'compliance_officer':
      dashboardContent = <ComplianceOfficerDashboard />;
      headerTitle = 'Compliance Officer Dashboard';
      break;

    case 'mlro':
      dashboardContent = <ComplianceOfficerDashboard />;
      headerTitle = 'MLRO Dashboard';
      break;

    case 'senior_partner':
      dashboardContent = <ComplianceOfficerDashboard />;
      headerTitle = 'Senior Partner Dashboard';
      break;

    case 'admin':
    case 'client':
    default:
      return <Dashboard />;
  }

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{organization?.name || 'Organization'}</h1>
          <p style={styles.subtitle}>AML/CFT Compliance System</p>
          {profile?.first_name && (
            <p style={{ color: '#d4af37', fontSize: '16px', margin: '8px 0 0 0', fontWeight: '600' }}>
              Welcome, {profile.first_name}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={signOut}
            style={styles.signOutButton}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div style={styles.container}>
        {dashboardContent}
      </div>

      <footer style={styles.footer}>
        <div style={styles.footerLeft}>
          © 2026 All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #f8f9fa 0%, #e8eaed 100%)',
  },
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '32px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  title: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '16px',
    color: '#d4af37',
    fontWeight: '500',
  },
  signOutButton: {
    padding: '10px 24px',
    background: '#d4af37',
    color: '#0a1929',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
  },
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '32px',
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
  }
};
