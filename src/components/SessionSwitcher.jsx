import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TEST_USERS = [
  { id: 'jack', name: 'Jack Bower', email: 'jb@gmail.com', color: '#3b82f6', role: 'Management' },
  { id: 'anna', name: 'Anna Schmitz', email: 'as@gmail.com', color: '#10b981', role: 'Management' },
  { id: 'john', name: 'John D. Doe', email: 'jdd@gmail.com', color: '#f59e0b', role: 'Management' },
  { id: 'johndoe', name: 'John Doe', email: 'jd@gmail.com', color: '#ec4899', role: 'Compliance' },
  { id: 'sarah', name: 'Sarah John', email: 'sj@gmail.com', color: '#14b8a6', role: 'Staff' },
  { id: 'juma', name: 'Juma Ally', email: 'ja@gmail.com', color: '#8b5cf6', role: 'Staff' },
  { id: 'johndeep', name: 'John Deep', email: 'johndeep@gmail.com', color: '#f97316', role: 'Staff' },
];

export default function SessionSwitcher() {
  const { profile } = useAuth();
  const [currentSession, setCurrentSession] = useState(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    setCurrentSession(sessionId);
  }, []);

  const handleSessionChange = (sessionId) => {
    const url = new URL(window.location.href);
    if (sessionId) {
      url.searchParams.set('session', sessionId);
    } else {
      url.searchParams.delete('session');
    }
    window.location.href = url.toString();
  };

  const openNewTab = (sessionId) => {
    const url = new URL(window.location.href);
    if (sessionId) {
      url.searchParams.set('session', sessionId);
    } else {
      url.searchParams.delete('session');
    }
    window.open(url.toString(), '_blank');
  };

  const getCurrentUser = () => {
    return TEST_USERS.find(u => u.id === currentSession) || null;
  };

  const currentUser = getCurrentUser();

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 10000,
    }}>
      {/* Toggle Button */}
      <button
        onClick={() => setShowSwitcher(!showSwitcher)}
        style={{
          padding: '12px 16px',
          backgroundColor: currentUser?.color || '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '18px' }}>👤</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Testing as:</div>
          <div>{currentUser ? currentUser.name : 'Default'}</div>
        </div>
      </button>

      {/* Switcher Panel */}
      {showSwitcher && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          padding: '16px',
          minWidth: '320px',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#1f2937',
          }}>
            Multi-User Testing Mode
          </div>

          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '16px',
            lineHeight: '1.4',
          }}>
            Open multiple tabs with different users to test collaboration features
          </div>

          {/* Current Session Info */}
          {profile && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Currently Logged In:</div>
              <div style={{ color: '#6b7280' }}>
                {profile.full_name} ({profile.email})
              </div>
              <div style={{
                color: '#6366f1',
                fontWeight: '600',
                marginTop: '4px',
                fontSize: '12px',
              }}>
                Role: {profile.role?.toUpperCase() || 'N/A'}
              </div>
            </div>
          )}

          {/* Test User Sessions */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              marginBottom: '8px',
              color: '#374151',
            }}>
              Switch to:
            </div>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}>
            {TEST_USERS.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px',
                  marginBottom: '6px',
                  borderRadius: '8px',
                  backgroundColor: currentSession === user.id ? '#eff6ff' : 'white',
                  border: currentSession === user.id ? `2px solid ${user.color}` : '1px solid #e5e7eb',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#1f2937',
                  }}>
                    {user.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#6b7280',
                  }}>
                    {user.email}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: user.color,
                    fontWeight: '600',
                    marginTop: '2px',
                  }}>
                    {user.role}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleSessionChange(user.id)}
                    disabled={currentSession === user.id}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: currentSession === user.id ? '#e5e7eb' : user.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: currentSession === user.id ? 'not-allowed' : 'pointer',
                      opacity: currentSession === user.id ? 0.5 : 1,
                    }}
                  >
                    {currentSession === user.id ? 'Current' : 'Switch'}
                  </button>
                  <button
                    onClick={() => openNewTab(user.id)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      backgroundColor: 'white',
                      color: user.color,
                      border: `1px solid ${user.color}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                    title="Open in new tab"
                  >
                    ↗
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Quick Launch All */}
          <button
            onClick={() => {
              TEST_USERS.forEach(user => openNewTab(user.id));
            }}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              marginTop: '8px',
            }}
          >
            🚀 Open All Test Users in New Tabs
          </button>

          {/* Reset to Default */}
          {currentSession && (
            <button
              onClick={() => handleSessionChange(null)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                marginTop: '8px',
              }}
            >
              Reset to Default Session
            </button>
          )}

          {/* Instructions */}
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#92400e',
            lineHeight: '1.4',
          }}>
            <strong>How to test:</strong>
            <br />
            1. Click "Open All Test Users" to open 6 tabs
            <br />
            2. Log in each tab with the credentials shown
            <br />
            3. Password for all users: <strong>password123</strong>
            <br />
            4. Test role-specific features and dual approval
          </div>
        </div>
      )}
    </div>
  );
}
