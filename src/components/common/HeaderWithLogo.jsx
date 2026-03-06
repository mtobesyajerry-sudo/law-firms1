import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../supabaseClient';

export default function HeaderWithLogo({ title, subtitle, showPasswordChange = true }) {
  const { signOut } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

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

  return (
    <>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={styles.logoContainer}>
            <img
              src="/Iuris_Peritis_New_Logo.png"
              alt="Iuris Peritis Logo"
              style={styles.logo}
            />
          </div>
          <div>
            <h1 style={styles.title}>{title || 'Law Firm AML Compliance System'}</h1>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {showPasswordChange && (
            <button
              onClick={() => setShowChangePassword(true)}
              style={styles.iconButton}
              title="Change Password"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </button>
          )}
          <button onClick={signOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </header>

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
    </>
  );
}

const styles = {
  header: {
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
    padding: '24px 32px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    borderBottom: '3px solid #d4af37',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  logo: {
    maxWidth: '180px',
    height: 'auto',
  },
  title: {
    margin: 0,
    fontSize: '28px',
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
  iconButton: {
    padding: '10px 14px',
    background: 'transparent',
    color: '#d4af37',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: 'white',
    border: '2px solid #d4af37',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
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
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d3748',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
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
  primaryButton: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    color: '#0a1929',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
  },
};
