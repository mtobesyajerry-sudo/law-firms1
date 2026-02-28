import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { institutionCategories } from '../data/assessmentData';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [size, setSize] = useState('medium');
  const [dnfbpCategory, setDnfbpCategory] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [checkingFirstUser, setCheckingFirstUser] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'register') {
      checkIfFirstUser();
    }
  }, [mode]);

  const checkIfFirstUser = async () => {
    setCheckingFirstUser(true);
    try {
      const { data, error } = await supabase.rpc('get_user_count');

      if (error) throw error;

      setIsFirstUser(data === 0);
    } catch (err) {
      console.error('Error checking first user:', err);
      setIsFirstUser(false);
    } finally {
      setCheckingFirstUser(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let profile = null;
        let retries = 0;

        while (!profile && retries < 5) {
          const { data } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (data) {
            profile = data;
          } else {
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
          }
        }

        navigate('/admin/dashboard');
      }
    } catch (err) {
      if (err.message === 'Invalid login credentials') {
        const { data: pendingRequest } = await supabase
          .from('registration_requests')
          .select('status')
          .eq('email', email)
          .maybeSingle();

        if (pendingRequest) {
          if (pendingRequest.status === 'pending') {
            setError('Your registration is pending approval. Please wait for an administrator to approve your account.');
          } else if (pendingRequest.status === 'rejected') {
            setError('Your registration was rejected. Please contact support for more information.');
          } else {
            setError('Invalid email or password. Please try again.');
          }
        } else {
          setError('Invalid email or password. Please check your credentials and try again.');
        }
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data: userCount, error: countError } = await supabase.rpc('get_user_count');

      if (countError) throw countError;

      if (userCount === 0) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if profile exists, if not create it
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!existingProfile) {
            // Create new profile for first user (admin)
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: authData.user.id,
                email: email,
                role: 'admin',
                full_name: fullName,
                is_active: true,
                organization_id: null
              });

            if (insertError) {
              console.error('Profile insert error:', insertError);
              throw insertError;
            }
          } else {
            // Update existing profile
            const { error: profileError } = await supabase
              .from('user_profiles')
              .update({
                role: 'admin',
                full_name: fullName
              })
              .eq('id', authData.user.id);

            if (profileError) {
              console.error('Profile update error:', profileError);
            }
          }

          setSuccess('System administrator account created successfully! Redirecting to dashboard...');

          setTimeout(async () => {
            await signIn(email, password);
            navigate('/admin/dashboard');
          }, 2000);
        }
      } else {
        const { error: insertError } = await supabase
          .from('registration_requests')
          .insert([{
            full_name: fullName,
            email: email,
            organization_name: organizationName,
            business_type: businessType,
            size: size,
            dnfbp_category: dnfbpCategory || null,
            status: 'pending'
          }]);

        if (insertError) throw insertError;

        setSuccess('Registration request submitted successfully! An administrator will review your request. You will receive an email when approved and can then login.');

        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setOrganizationName('');
        setBusinessType('');
        setSize('medium');
        setDnfbpCategory('');

        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={mode === 'register' ? styles.cardLarge : styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Law Firm AML Compliance System</h1>
          <p style={styles.subtitle}>Comprehensive AML/CFT Compliance Management for Legal Professionals</p>
        </div>

        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            style={{
              ...styles.tab,
              ...(mode === 'login' ? styles.tabActive : {})
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
            style={{
              ...styles.tab,
              ...(mode === 'register' ? styles.tabActive : {})
            }}
          >
            Register
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                minLength={6}
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Loading...' : 'Sign In'}
            </button>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#475569',
                textAlign: 'center'
              }}>
                Contact your administrator to request an account
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            {isFirstUser && (
              <div style={styles.infoBox}>
                <svg style={styles.infoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p style={styles.infoText}>
                  You are registering as the first user and will be granted system administrator privileges.
                </p>
              </div>
            )}

            <div style={styles.sectionTitle}>
              {isFirstUser ? 'Administrator Information' : 'User Information'}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
                minLength={6}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                required
                minLength={6}
              />
            </div>

            {!isFirstUser && (
              <>
                <div style={styles.sectionTitle}>Law Firm Information</div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Firm Name *</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    style={styles.input}
                    placeholder="e.g., Smith & Associates Law Firm"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Practice Areas *</label>
                  <input
                    type="text"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    style={styles.input}
                    placeholder="e.g., Corporate Law, Real Estate, Litigation"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Firm Size *</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    style={styles.input}
                    required
                  >
                    <option value="small">Small (1-10 lawyers)</option>
                    <option value="medium">Medium (11-50 lawyers)</option>
                    <option value="large">Large (51+ lawyers)</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Firm Type</label>
                  <select
                    value={dnfbpCategory}
                    onChange={(e) => setDnfbpCategory(e.target.value)}
                    style={styles.input}
                  >
                    <option value="">Select Category (Optional)</option>
                    {institutionCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button type="submit" disabled={loading || checkingFirstUser} style={styles.button}>
              {loading ? 'Submitting...' : isFirstUser ? 'Create Administrator Account' : 'Submit Registration Request'}
            </button>

            {!isFirstUser && (
              <p style={styles.disclaimer}>
                Note: Your registration request must be approved by an administrator before you can login.
                You will receive an email notification once your account is approved.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 50%, #0d1f33 100%)',
    padding: '20px',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    maxWidth: '450px',
    width: '100%',
    padding: '40px',
    border: '2px solid #d4af37',
  },
  cardLarge: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    maxWidth: '600px',
    width: '100%',
    padding: '40px',
    border: '2px solid #d4af37',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#4a5568',
    margin: 0,
    fontWeight: '500',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e8eaed',
  },
  tab: {
    flex: 1,
    padding: '12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    color: '#718096',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    color: '#0a1929',
    borderBottomColor: '#d4af37',
    fontWeight: '700',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#0a1929',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: '#f8f9fa',
  },
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#0a1929',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
  },
  error: {
    padding: '12px',
    background: '#fed7d7',
    color: '#c53030',
    borderRadius: '8px',
    fontSize: '14px',
  },
  success: {
    padding: '12px',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    fontSize: '14px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    marginTop: '12px',
    marginBottom: '8px',
    borderBottom: '2px solid #d4af37',
    paddingBottom: '8px',
  },
  disclaimer: {
    fontSize: '13px',
    color: '#718096',
    textAlign: 'center',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  infoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  infoIcon: {
    width: '24px',
    height: '24px',
    flexShrink: 0,
    color: '#1e40af',
  },
  infoText: {
    margin: 0,
    fontSize: '14px',
    color: '#1e40af',
    fontWeight: '600',
    lineHeight: '1.5',
  },
};
