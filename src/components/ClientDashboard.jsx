import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import LoadingSpinner from './LoadingSpinner';

export default function ClientDashboard() {
  const { profile, organization, signOut, loading, isEarlyClient } = useAuth();
  const navigate = useNavigate();
  const [hasOrgManagementAccess, setHasOrgManagementAccess] = useState(false);
  const [trialAccess, setTrialAccess] = useState({
    staff: false,
    compliance: false,
    staffExpiry: null,
    complianceExpiry: null
  });

  // CRITICAL: Redirect admin users immediately - before any other logic
  useEffect(() => {
    if (profile?.role === 'admin') {
      console.log('[ClientDashboard] Admin user detected, redirecting to /admin/dashboard', {
        role: profile.role,
        organization: organization,
        loading: loading
      });
      navigate('/admin/dashboard', { replace: true });
    }
  }, [profile, organization, loading, navigate]);

  useEffect(() => {
    const checkAccess = async () => {
      // Skip access check for admin users - they don't need organization
      if (profile?.role === 'admin') return;

      if (!profile?.id || !organization?.id) return;

      const now = new Date();
      const staffExpiry = profile.trial_staff_access_until ? new Date(profile.trial_staff_access_until) : null;
      const complianceExpiry = profile.trial_compliance_access_until ? new Date(profile.trial_compliance_access_until) : null;

      setTrialAccess({
        staff: staffExpiry && staffExpiry > now,
        compliance: complianceExpiry && complianceExpiry > now,
        staffExpiry: staffExpiry,
        complianceExpiry: complianceExpiry
      });

      const { data: orgAccess } = await supabase
        .from('organization_user_access')
        .select('*')
        .eq('user_id', profile.id)
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .maybeSingle();

      setHasOrgManagementAccess(!!orgAccess);
    };

    checkAccess();
  }, [profile, organization]);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // If admin user, show loading while redirecting (regardless of organization)
  if (profile?.role === 'admin') {
    console.log('[ClientDashboard] Rendering redirect screen for admin user');
    return <LoadingSpinner fullPage />;
  }

  // Role-based access control - strictly enforced
  // Management: admin, management, senior_partner, OR authorized org users, OR early client (automatic for first 3 users in org)
  const hasManagementAccess = profile?.role === 'admin' || profile?.role === 'management' || profile?.role === 'senior_partner' || hasOrgManagementAccess || isEarlyClient;

  // Staff: Only admin, staff, and lawyer roles (NOT client) OR trial access
  const hasStaffAccess = ((profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'lawyer') && profile?.role !== 'client') || trialAccess.staff;

  // Compliance: Only admin, compliance_officer, and mlro roles (NOT client) OR trial access
  const hasComplianceAccess = ((profile?.role === 'admin' || profile?.role === 'compliance_officer' || profile?.role === 'mlro') && profile?.role !== 'client') || trialAccess.compliance;

  const dashboardSections = [
    {
      id: 'management',
      title: 'Management',
      icon: '📊',
      description: 'Strategic oversight, analytics, and compliance intelligence',
      gradient: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
      hasAccess: hasManagementAccess,
      route: '/dashboard/management',
      features: ['Compliance Intelligence', 'Analytics & Reports', 'System Overview', 'User Management', 'Approve Role Requests']
    },
    {
      id: 'compliance',
      title: 'Compliance',
      icon: '🛡️',
      description: 'Risk assessment, STR alerts, and compliance monitoring',
      gradient: 'linear-gradient(135deg, #991b1b, #dc2626)',
      hasAccess: hasComplianceAccess,
      route: '/dashboard/compliance',
      features: ['Institutional Risk Assessment', 'STR Alerts', 'Compliance Intelligence', 'Risk Monitoring']
    },
    {
      id: 'staff',
      title: 'Staff',
      icon: '👥',
      description: 'Client management, KYC operations, and matter handling',
      gradient: 'linear-gradient(135deg, #065f46, #10b981)',
      hasAccess: hasStaffAccess,
      route: '/dashboard/staff',
      features: ['Client KYC Management', 'Matter Management', 'Document Management', 'Workflow Tracking']
    }
  ];

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
              {organization?.name || 'Organization'}
            </h1>
            {profile?.first_name && (
              <p style={{ color: '#d4af37', fontSize: '18px', margin: '12px 0 0 0', fontWeight: '600' }}>
                Welcome, {profile.first_name}
              </p>
            )}
          </div>
          <button
            onClick={signOut}
            style={{
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid #d4af37',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
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

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px 32px',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        marginBottom: '32px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#0a1929',
            margin: '0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>🏢</span>
            Organization Information
          </h2>
          {organization && (
            <div style={{
              padding: '8px 16px',
              background: organization.is_active
                ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                : 'linear-gradient(135deg, #fee2e2, #fecaca)',
              borderRadius: '20px',
              border: `2px solid ${organization.is_active ? '#10b981' : '#ef4444'}`,
              fontSize: '13px',
              fontWeight: '700',
              color: organization.is_active ? '#065f46' : '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{organization.is_active ? '✓' : '✕'}</span>
              {organization.is_active ? 'Active Organization' : 'Inactive Organization'}
            </div>
          )}
        </div>

        {organization ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>Organization Name</th>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>Business Type</th>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>Organization Size</th>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>DNFBP Category</th>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>Account Status</th>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>Subscription Expiry</th>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 100%)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    borderBottom: '2px solid #d4af37',
                    letterSpacing: '0.5px'
                  }}>Max Users</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{
                  borderBottom: '1px solid #e8eaed'
                }}>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px'
                  }}>
                    <strong>{organization.name}</strong>
                    {organization.contact_email && (
                      <div style={{ fontSize: '12px', color: '#718096', marginTop: '3px' }}>
                        {organization.contact_email}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px'
                  }}>{organization.business_type || '-'}</td>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px',
                    textTransform: 'capitalize'
                  }}>{organization.size || '-'}</td>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px'
                  }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-block',
                      background: '#dbeafe',
                      color: '#1e40af',
                      textTransform: 'capitalize'
                    }}>
                      {(organization.law_firm_type || organization.business_type)?.replace('_', ' ') || '-'}
                    </span>
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px'
                  }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-block',
                      background: organization.is_active ? '#d1fae5' : '#fee2e2',
                      color: organization.is_active ? '#065f46' : '#991b1b'
                    }}>
                      {organization.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px'
                  }}>
                    {organization.subscription_expiry_date ? (
                      <>
                        {new Date(organization.subscription_expiry_date).toLocaleDateString()}
                        <span style={{
                          marginLeft: '8px',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: new Date(organization.subscription_expiry_date) > new Date() ? '#d1fae5' : '#fee2e2',
                          color: new Date(organization.subscription_expiry_date) > new Date() ? '#065f46' : '#991b1b'
                        }}>
                          {new Date(organization.subscription_expiry_date) > new Date() ? 'Active' : 'Expired'}
                        </span>
                      </>
                    ) : '-'}
                  </td>
                  <td style={{
                    padding: '10px 12px',
                    color: '#2d3748',
                    fontSize: '14px'
                  }}>{organization.max_users || 'Unlimited'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        border: '2px solid #d4af37',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        marginBottom: '32px'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: '#0a1929',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '28px' }}>🎯</span>
            Dashboard Sections
          </h2>
          {profile?.first_name && (
            <p style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#d4af37', fontWeight: '600' }}>
              Welcome, {profile.first_name}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
            Access your authorized dashboard sections below
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}>
          {dashboardSections.map((section) => (
            <div
              key={section.id}
              style={{
                background: section.hasAccess ? section.gradient : '#f8fafc',
                borderRadius: '16px',
                padding: '28px',
                border: section.hasAccess ? '2px solid #d4af37' : '2px solid #cbd5e1',
                boxShadow: section.hasAccess ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.05)',
                cursor: section.hasAccess ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s',
                opacity: section.hasAccess ? 1 : 0.6,
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => section.hasAccess && navigate(section.route)}
              onMouseEnter={(e) => {
                if (section.hasAccess) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.25)';
                }
              }}
              onMouseLeave={(e) => {
                if (section.hasAccess) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                }
              }}
            >
              {!section.hasAccess && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  padding: '6px 12px',
                  background: '#fee2e2',
                  border: '2px solid #dc2626',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  🔒 Locked
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: section.hasAccess ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  border: section.hasAccess ? '2px solid rgba(255,255,255,0.3)' : '2px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  marginBottom: '16px',
                  backdropFilter: section.hasAccess ? 'blur(10px)' : 'none'
                }}>
                  {section.icon}
                </div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '24px',
                  fontWeight: '800',
                  color: section.hasAccess ? 'white' : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'center'
                }}>
                  {section.title}
                  {section.id === 'staff' && trialAccess.staff && (
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      background: '#fbbf24',
                      color: '#78350f',
                      borderRadius: '6px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Trial {Math.ceil((trialAccess.staffExpiry - new Date()) / (1000 * 60 * 60 * 24))}d
                    </span>
                  )}
                  {section.id === 'compliance' && trialAccess.compliance && (
                    <span style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      background: '#fbbf24',
                      color: '#78350f',
                      borderRadius: '6px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Trial {Math.ceil((trialAccess.complianceExpiry - new Date()) / (1000 * 60 * 60 * 24))}d
                    </span>
                  )}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: section.hasAccess ? 'rgba(255,255,255,0.9)' : '#64748b'
                }}>
                  {section.description}
                </p>
              </div>

              <div style={{
                marginBottom: '20px',
                paddingTop: '20px',
                borderTop: section.hasAccess ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0'
              }}>
                {section.features.map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: section.hasAccess ? 'rgba(255,255,255,0.95)' : '#64748b'
                    }}
                  >
                    <span style={{
                      fontSize: '16px',
                      opacity: section.hasAccess ? 1 : 0.5
                    }}>
                      {section.hasAccess ? '✓' : '•'}
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              {section.hasAccess ? (
                <div style={{
                  padding: '14px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '14px',
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}>
                  Open Dashboard →
                </div>
              ) : (
                <div style={{
                  padding: '14px',
                  background: '#f1f5f9',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '13px',
                  color: '#64748b'
                }}>
                  Contact Admin to Register
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
