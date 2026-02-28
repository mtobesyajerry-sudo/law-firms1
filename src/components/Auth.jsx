import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Tanzania Law Firm Registration Form State
  const [formData, setFormData] = useState({
    lawFirmName: '',
    brelaRegistrationNumber: '',
    firmEmail: '',
    contactPersonName: '',
    contactPersonDesignation: 'Partner',
    mobileNumber: '',
    registerPassword: '',
    confirmPassword: '',
    sectorConfirmed: false,
    termsAccepted: false,
    privacyPolicyAccepted: false,
    dataProcessingConsent: false,
    amlCftConsent: false
  });

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateRegistrationForm = () => {
    if (!formData.lawFirmName.trim()) {
      setError('Law firm name is required');
      return false;
    }

    if (!formData.brelaRegistrationNumber.trim()) {
      setError('BRELA registration number is required');
      return false;
    }

    if (!formData.firmEmail.trim() || !formData.firmEmail.includes('@')) {
      setError('Valid firm email is required');
      return false;
    }

    if (!formData.contactPersonName.trim()) {
      setError('Contact person name is required');
      return false;
    }

    if (!formData.mobileNumber.trim()) {
      setError('Mobile number is required');
      return false;
    }

    if (formData.registerPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (formData.registerPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (!formData.sectorConfirmed) {
      setError('Please confirm you are a licensed law firm in Tanzania');
      return false;
    }

    if (!formData.termsAccepted || !formData.privacyPolicyAccepted ||
        !formData.dataProcessingConsent || !formData.amlCftConsent) {
      setError('Please accept all required consents');
      return false;
    }

    return true;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateRegistrationForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.firmEmail,
        password: formData.registerPassword,
        options: {
          data: {
            full_name: formData.contactPersonName,
            user_type: 'law_firm_tanzania'
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { data: existingOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('name', formData.lawFirmName)
          .maybeSingle();

        let organizationId;

        if (existingOrg) {
          organizationId = existingOrg.id;
        } else {
          const { data: newOrg, error: orgError } = await supabase
            .from('organizations')
            .insert([{
              name: formData.lawFirmName,
              type: 'law_firm',
              country: 'Tanzania'
            }])
            .select()
            .single();

          if (orgError) throw orgError;
          organizationId = newOrg.id;
        }

        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              email: formData.firmEmail,
              full_name: formData.contactPersonName,
              role: 'client',
              position: formData.contactPersonDesignation,
              organization_id: organizationId,
              organization_name: formData.lawFirmName,
              is_active: true
            });

          if (profileError) throw profileError;
        }

        const { error: regError } = await supabase
          .from('law_firm_registrations')
          .insert([{
            user_id: authData.user.id,
            organization_id: organizationId,
            law_firm_name: formData.lawFirmName,
            tls_registration_number: null,
            brela_registration_number: formData.brelaRegistrationNumber,
            firm_email: formData.firmEmail,
            contact_person_name: formData.contactPersonName,
            contact_person_designation: formData.contactPersonDesignation,
            mobile_number: formData.mobileNumber,
            sector_confirmed: formData.sectorConfirmed,
            terms_accepted: formData.termsAccepted,
            privacy_policy_accepted: formData.privacyPolicyAccepted,
            data_processing_consent: formData.dataProcessingConsent,
            aml_cft_consent: formData.amlCftConsent,
            registration_status: 'active'
          }]);

        if (regError) throw regError;

        const { error: onboardingError } = await supabase
          .from('onboarding_progress')
          .insert([{
            user_id: authData.user.id,
            organization_id: organizationId,
            current_step: 1
          }]);

        if (onboardingError) throw onboardingError;

        await signIn(formData.firmEmail, formData.registerPassword);
        navigate('/onboarding');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={mode === 'register' ? styles.cardLarge : styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            {mode === 'login' ? 'Law Firm AML Compliance System' : 'Tanzania Law Firm Registration'}
          </h1>
          <p style={styles.subtitle}>
            {mode === 'login'
              ? 'Comprehensive AML/CFT Compliance Management for Legal Professionals'
              : 'Professional AML/CFT Compliance Management for Legal Practitioners'
            }
          </p>
        </div>

        <div style={styles.tabContainer}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
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
            }}
            style={{
              ...styles.tab,
              ...(mode === 'register' ? styles.tabActive : {})
            }}
          >
            Tanzania Law Firm Registration
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
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Law Firm Information</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Law Firm Name *</label>
                <input
                  type="text"
                  name="lawFirmName"
                  value={formData.lawFirmName}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Full registered name"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>BRELA Registration Number *</label>
                <input
                  type="text"
                  name="brelaRegistrationNumber"
                  value={formData.brelaRegistrationNumber}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Required"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Firm Email Address *</label>
                <input
                  type="email"
                  name="firmEmail"
                  value={formData.firmEmail}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="official@lawfirm.co.tz"
                  required
                />
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Contact Person</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  name="contactPersonName"
                  value={formData.contactPersonName}
                  onChange={handleChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Designation *</label>
                  <select
                    name="contactPersonDesignation"
                    value={formData.contactPersonDesignation}
                    onChange={handleChange}
                    style={styles.input}
                    required
                  >
                    <option value="Partner">Partner</option>
                    <option value="Associate">Associate</option>
                    <option value="Compliance Officer">Compliance Officer</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Senior Partner">Senior Partner</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mobile Number *</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="+255..."
                    required
                  />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Account Security</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password *</label>
                <input
                  type="password"
                  name="registerPassword"
                  value={formData.registerPassword}
                  onChange={handleChange}
                  style={styles.input}
                  minLength={8}
                  required
                />
                <p style={styles.hint}>Minimum 8 characters</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={styles.input}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Confirmations</h2>

              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="sectorConfirmed"
                    checked={formData.sectorConfirmed}
                    onChange={handleChange}
                    style={styles.checkbox}
                    required
                  />
                  <span>
                    We confirm that we are a law firm or advocate licensed in Tanzania *
                  </span>
                </label>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Consent & Compliance</h2>

              <div style={styles.checkboxGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    style={styles.checkbox}
                    required
                  />
                  <span>I accept the Terms and Conditions *</span>
                </label>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="privacyPolicyAccepted"
                    checked={formData.privacyPolicyAccepted}
                    onChange={handleChange}
                    style={styles.checkbox}
                    required
                  />
                  <span>I accept the Privacy Policy *</span>
                </label>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="dataProcessingConsent"
                    checked={formData.dataProcessingConsent}
                    onChange={handleChange}
                    style={styles.checkbox}
                    required
                  />
                  <span>
                    I consent to secure processing of personal data under the Personal Data Protection Act *
                  </span>
                </label>

                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="amlCftConsent"
                    checked={formData.amlCftConsent}
                    onChange={handleChange}
                    style={styles.checkbox}
                    required
                  />
                  <span>I consent to AML/CFT risk-based compliance tools *</span>
                </label>
              </div>
            </div>

            <div style={styles.securityAssurance}>
              <div style={styles.securityIcon}>🔒</div>
              <p style={styles.securityText}>
                <strong>Security Assurance:</strong> This platform applies encryption, strict access control,
                and institutional data isolation. All client information remains confidential and is accessible
                only to authorised users within your firm.
              </p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={styles.button}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
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
    maxWidth: '800px',
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
    fontSize: '14px',
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
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
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
  section: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e3a8a',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '2px solid #1e3a8a',
  },
  hint: {
    fontSize: '12px',
    color: '#718096',
    margin: '4px 0 0 0',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '14px',
    color: '#0a1929',
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0,
  },
  securityAssurance: {
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  securityIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  securityText: {
    margin: 0,
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.6',
  },
};
