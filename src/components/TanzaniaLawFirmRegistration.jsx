import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const TanzaniaLawFirmRegistration = () => {
  const navigate = useNavigate();
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    lawFirmName: '',
    brelaRegistrationNumber: '',
    firmEmail: '',
    contactPersonName: '',
    contactPersonDesignation: 'Partner',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
    sectorConfirmed: false,
    termsAccepted: false,
    privacyPolicyAccepted: false,
    dataProcessingConsent: false,
    amlCftConsent: false
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('system_branding')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      setBranding(data);
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
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

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { data: existingRequest } = await supabase
        .from('law_firm_registrations')
        .select('id, registration_status')
        .eq('firm_email', formData.firmEmail)
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.registration_status === 'pending') {
          setError('A registration request with this email is already pending approval.');
          setLoading(false);
          return;
        }
        if (existingRequest.registration_status === 'active') {
          setError('An account with this email already exists. Please login.');
          setLoading(false);
          return;
        }
      }

      const CryptoJS = (await import('crypto-js')).default;
      const encryptedPassword = CryptoJS.AES.encrypt(
        formData.password,
        import.meta.env.VITE_ENCRYPTION_KEY || 'fallback-key'
      ).toString();

      const { error: regError } = await supabase
        .from('law_firm_registrations')
        .insert([{
          user_id: null,
          organization_id: null,
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
          registration_status: 'pending',
          encrypted_password: encryptedPassword
        }]);

      if (regError) throw regError;

      setSuccess('Registration submitted successfully! Your request will be reviewed by our administrators. You will receive an email notification once your account is approved.');

      setTimeout(() => {
        navigate('/auth');
      }, 4000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          {branding?.company_logo_url && (
            <div style={{ marginBottom: '16px' }}>
              <img
                src={branding.company_logo_url}
                alt={branding.company_name}
                style={{
                  maxHeight: '80px',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>
          )}
          <h1 style={styles.title}>Tanzania Law Firm Registration</h1>
          <p style={styles.subtitle}>
            Professional AML/CFT Compliance Management for Legal Practitioners
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
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
                name="password"
                value={formData.password}
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
          {success && <div style={styles.success}>{success}</div>}

          <button
            type="submit"
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>

          <div style={styles.loginLink}>
            Already have an account?{' '}
            <a href="/auth" style={styles.link}>
              Sign In
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a1929 0%, #1a2f45 50%, #0d1f33 100%)',
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    maxWidth: '800px',
    width: '100%',
    padding: '40px',
    border: '2px solid #d4af37'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '2px solid #d4af37'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#0a1929',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#4a5568',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  section: {
    background: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e3a8a',
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: '2px solid #1e3a8a'
  },
  formGroup: {
    marginBottom: '16px',
    flex: 1
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0a1929',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #cbd5e0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  hint: {
    fontSize: '12px',
    color: '#718096',
    margin: '4px 0 0 0'
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '14px',
    color: '#0a1929',
    cursor: 'pointer'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0
  },
  securityAssurance: {
    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  securityIcon: {
    fontSize: '32px',
    flexShrink: 0
  },
  securityText: {
    margin: 0,
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: '1.6'
  },
  error: {
    padding: '12px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #ef4444'
  },
  success: {
    padding: '12px',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #10b981'
  },
  submitButton: {
    padding: '16px',
    fontSize: '18px',
    fontWeight: '700',
    color: '#0a1929',
    background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 12px rgba(212,175,55,0.4)'
  },
  loginLink: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#718096'
  },
  link: {
    color: '#1e40af',
    textDecoration: 'none',
    fontWeight: '600'
  }
};

export default TanzaniaLawFirmRegistration;
