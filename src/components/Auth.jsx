import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { institutionCategories } from '../data/assessmentData';
import { loginTrackingService } from '../services/loginTrackingService';
import { auditService } from '../services/auditService';
import { validatePassword } from '../utils/security';
import MfaChallenge from './MfaChallenge';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [registrationType, setRegistrationType] = useState('new_firm');
  const [lawFirmName, setLawFirmName] = useState('');
  const [brelaRegistrationNumber, setBrelaRegistrationNumber] = useState('');
  const [firmEmail, setFirmEmail] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPersonDesignation, setContactPersonDesignation] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [sectorConfirmed, setSectorConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [dnfbpCategories, setDnfbpCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [existingOrgData, setExistingOrgData] = useState(null);
  const [brelaCheckLoading, setBrelaCheckLoading] = useState(false);
  const [requestedTier, setRequestedTier] = useState('small_firm');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstUser, setIsFirstUser] = useState(false);
  const [checkingFirstUser, setCheckingFirstUser] = useState(false);
  const [pendingProfile, setPendingProfile] = useState(null);
  const { signIn, revokedMessage, pendingMfaChallenge, completeMfaChallenge, signOut: authSignOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'register') {
      checkIfFirstUser();
      loadDnfbpCategories();
    }
  }, [mode]);

  const loadDnfbpCategories = async () => {
    const { data } = await supabase
      .from('dnfbp_framework_mappings')
      .select('category_value, category_label, framework_type')
      .eq('is_active', true)
      .not('category_label', 'is', null)
      .order('framework_type')
      .order('category_label');
    const categories = data || [];
    setDnfbpCategories(categories);
    if (categories.length > 0) {
      const lawFirm = categories.find(c => c.category_value === 'law_firm');
      setSelectedCategory(lawFirm ? 'law_firm' : categories[0].category_value);
    }
  };

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

  const checkOrganizationByBrela = async (brelaNumber) => {
    if (!brelaNumber || brelaNumber.length < 3) {
      setExistingOrgData(null);
      return;
    }

    setBrelaCheckLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_organization_by_brela', {
        brela_number: brelaNumber
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const org = data[0];
        if (org.can_accept_users) {
          setExistingOrgData(org);
          setLawFirmName(org.name);
          setFirmEmail(org.contact_email || '');
        } else {
          setExistingOrgData({ ...org, full: true });
        }
      } else {
        setExistingOrgData(null);
      }
    } catch (err) {
      console.error('Error checking organization:', err);
      setExistingOrgData(null);
    } finally {
      setBrelaCheckLoading(false);
    }
  };

  const navigateByRole = (role) => {
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'management' || role === 'senior_partner') navigate('/dashboard/management');
    else if (role === 'staff' || role === 'lawyer') navigate('/dashboard/staff');
    else if (role === 'compliance_officer' || role === 'mlro') navigate('/dashboard/compliance');
    else navigate('/client/dashboard');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // AuthContext.onAuthStateChange SIGNED_IN now checks AAL immediately.
      // If aal2 is required it sets pendingMfaChallenge=true and keeps user=null,
      // so this component stays mounted and the challenge UI renders below.
      // If no MFA is required, user becomes non-null and App.jsx navigates to dashboard.
      // Either way we stop here — nothing more to do in Auth.jsx after signIn succeeds.

      // Fetch profile for use in handleMfaSuccess (role-based redirect after challenge)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        let profile = null;
        let retries = 0;
        while (!profile && retries < 5) {
          const { data } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', authUser.id)
            .maybeSingle();
          if (data) { profile = data; } else {
            await new Promise(r => setTimeout(r, 500));
            retries++;
          }
        }
        setPendingProfile(profile);

        // Non-MFA path: log the successful login and navigate.
        // (For the MFA path, pendingMfaChallenge will be true so the challenge renders;
        // navigation happens in handleMfaSuccess instead.)
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1') {
          // MFA challenge pending — UI handled by pendingMfaChallenge in context
          setLoading(false);
          return;
        }

        await loginTrackingService.logLoginAttempt(email, true, authUser, null, false);
        await loginTrackingService.createSession(authUser.id);
        await auditService.logEvent({
          event_type: 'user_login_success',
          event_category: 'security',
          action_description: `User ${email} logged in successfully`,
          severity: 'info',
          resource_type: 'auth.session',
          resource_id: authUser.id,
        });
        navigateByRole(profile?.role);
      }
    } catch (err) {
      await loginTrackingService.logLoginAttempt(email, false, null, err.message, false);

      if (err.message === 'Invalid login credentials') {
        const { data: pendingRequest } = await supabase
          .from('management_user_registrations')
          .select('registration_status')
          .eq('user_email', email)
          .maybeSingle();

        if (pendingRequest) {
          if (pendingRequest.registration_status === 'pending') {
            setError('Your registration is pending approval. Please wait for an administrator to approve your account.');
          } else if (pendingRequest.registration_status === 'rejected') {
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

  const handleMfaSuccess = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await loginTrackingService.logLoginAttempt(email, true, authUser, null, true);
      await loginTrackingService.createSession(authUser.id);
      await auditService.logEvent({
        event_type: 'user_login_success',
        event_category: 'security',
        action_description: `User ${email} completed MFA (TOTP) and logged in`,
        severity: 'info',
        resource_type: 'auth.session',
        resource_id: authUser.id,
      });
    }
    // Promote the held user into AuthContext state, load profile, then navigate.
    await completeMfaChallenge();
    navigateByRole(pendingProfile?.role);
  };

  const handleMfaCancel = async () => {
    setPendingProfile(null);
    await authSignOut();
    setError('Sign-in cancelled.');
  };

  const FRAMEWORK_TO_SECTOR = {
    law_firm:   'law_firm',
    insurer:    'insurance',
    audit_firm: 'accounting',
    dnfbp:      'general_dnfbp',
  };
  const deriveSector = (frameworkType) => FRAMEWORK_TO_SECTOR[frameworkType] ?? 'general_dnfbp';
  const selectedCategoryRow = dnfbpCategories.find(c => c.category_value === selectedCategory);
  const derivedSector = deriveSector(selectedCategoryRow?.framework_type);
  const isLawFirm = derivedSector === 'law_firm';

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

    const pwCheck = validatePassword(password);
    if (!pwCheck.isValid) {
      setError(pwCheck.errors.join(' '));
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

          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (!existingProfile) {
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
        if (!brelaRegistrationNumber) {
          setError('Business Registration Number (BRELA) is required');
          setLoading(false);
          return;
        }

        if (!selectedCategory) {
          setError('Please select your DNFBP category');
          setLoading(false);
          return;
        }

        if (existingOrgData && existingOrgData.full) {
          setError('This organization already has the maximum of 3 users. Please contact your administrator.');
          setLoading(false);
          return;
        }

        if ((!existingOrgData || existingOrgData.full) && !lawFirmName) {
          setError('Organisation name is required for new registrations');
          setLoading(false);
          return;
        }

        if ((!existingOrgData || existingOrgData.full) && (!contactPersonName || !contactPersonDesignation || !mobileNumber)) {
          setError('Contact person details are required for new registrations');
          setLoading(false);
          return;
        }

        if (!termsAccepted || !privacyAccepted) {
          setError('Please accept all required consents to proceed');
          setLoading(false);
          return;
        }

        const CryptoJS = (await import('crypto-js')).default;
        const ENCRYPTION_KEY = 'user-registration-encryption-key-2026';
        const encryptedPassword = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();

        // Check if this is the first user for this BRELA number
        const { data: existingRegs } = await supabase
          .from('management_user_registrations')
          .select('id')
          .eq('brela_registration_number', brelaRegistrationNumber)
          .eq('registration_status', 'approved');

        const isPrimaryContact = existingRegs?.length === 0;

        const registrationData = {
          brela_registration_number: brelaRegistrationNumber,
          law_firm_name: existingOrgData && !existingOrgData.full ? existingOrgData.name : lawFirmName,
          firm_email: existingOrgData && !existingOrgData.full ? (existingOrgData.contact_email || firmEmail) : firmEmail,
          user_full_name: fullName,
          user_email: email,
          user_position: contactPersonDesignation || 'Management User',
          mobile_number: mobileNumber || '',
          encrypted_password: encryptedPassword,
          is_primary_contact: isPrimaryContact,
          sector_confirmed: sectorConfirmed,
          dnfbp_category: selectedCategory,
          sector: derivedSector,
          terms_accepted: termsAccepted,
          privacy_policy_accepted: privacyAccepted,
          registration_status: 'pending',
          requested_tier: existingOrgData && !existingOrgData.full ? null : requestedTier,
        };

        if (existingOrgData && !existingOrgData.full) {
          registrationData.existing_organization_id = existingOrgData.id;
        }

        const { error: insertError } = await supabase
          .from('management_user_registrations')
          .insert(registrationData);

        if (insertError) throw insertError;

        setSuccess('Registration request submitted successfully! An administrator will review your request and you will receive confirmation via email.');

        setLawFirmName('');
        setBrelaRegistrationNumber('');
        setFirmEmail('');
        setContactPersonName('');
        setContactPersonDesignation('');
        setMobileNumber('');
        setPassword('');
        setConfirmPassword('');
        setSelectedCategory('');
        setSectorConfirmed(false);
        setTermsAccepted(false);
        setPrivacyAccepted(false);

        setTimeout(() => {
          setMode('login');
          setSuccess('');
        }, 5000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingMfaChallenge) {
    return (
      <div style={styles.container}>
        <MfaChallenge onSuccess={handleMfaSuccess} onCancel={handleMfaCancel} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={mode === 'register' ? styles.cardLarge : styles.card}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 0 12px' }}>
          <Link to="/pricing" style={{ fontSize: '13px', fontWeight: '700', color: '#d4af37', textDecoration: 'none' }}>
            View Pricing →
          </Link>
        </div>
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <img src="/Iuris_new_compliance_1.png" alt="Iuris Compliance" style={{ maxWidth: '260px', height: 'auto' }} />
          </div>
          <p style={styles.subtitle}>Comprehensive AML/CFT Compliance Management for Designated Non-Financial Businesses and Professionals (DNFBPs)</p>
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

            {revokedMessage && (
              <div style={{ ...styles.error, background: '#fef3c7', color: '#92400e', borderColor: '#f59e0b' }}>
                {revokedMessage}
              </div>
            )}
            {error && <div style={styles.error}>{error}</div>}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Loading...' : 'Sign In'}
            </button>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: 'transparent',
              borderRadius: '10px',
              border: '2px solid #d4af37'
            }}>
              <div style={{
                fontSize: '14px',
                color: '#000000',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Don't have an account yet? Please Register to have access to the System.
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
                <div style={styles.sectionTitle}>Registration Details</div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>DNFBP Category *</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={styles.input}
                    required
                  >
                    <option value="">Select your category...</option>
                    {dnfbpCategories.map(c => (
                      <option key={c.category_value} value={c.category_value}>
                        {c.category_label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Business Registration Number (BRELA) *</label>
                  <input
                    type="text"
                    value={brelaRegistrationNumber}
                    onChange={(e) => {
                      setBrelaRegistrationNumber(e.target.value);
                      checkOrganizationByBrela(e.target.value);
                    }}
                    style={styles.input}
                    placeholder="Enter BRELA number to check for existing firm"
                    required
                  />
                  {brelaCheckLoading && (
                    <div style={styles.checkingText}>Checking for existing organization...</div>
                  )}
                  {existingOrgData && !existingOrgData.full && (
                    <div style={styles.existingOrgInfo}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Existing Firm Found:</strong> {existingOrgData.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#059669', marginBottom: '8px' }}>
                        You will be added to this firm ({existingOrgData.user_count}/3 users)
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginTop: '8px',
                        padding: '8px',
                        background: '#f8fafc',
                        borderRadius: '6px',
                        borderLeft: '3px solid #d4af37'
                      }}>
                        Firm information is already on file. You only need to enter your personal details below.
                      </div>
                    </div>
                  )}
                  {existingOrgData && existingOrgData.full && (
                    <div style={styles.warningBox}>
                      <strong>Firm Registration Full</strong>
                      <br />
                      This firm already has 3 registered users. Please contact your administrator.
                    </div>
                  )}
                </div>

                {(!existingOrgData || existingOrgData.full) && (
                  <>
                    <div style={styles.sectionTitle}>
                      {isLawFirm ? 'Law Firm Information' : 'Organisation Information'}
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        {isLawFirm ? 'Law Firm Name' : 'Organisation Name'} *
                      </label>
                      <input
                        type="text"
                        value={lawFirmName}
                        onChange={(e) => setLawFirmName(e.target.value)}
                        style={styles.input}
                        placeholder="Full registered name"
                        required
                      />
                    </div>
                  </>
                )}

                {(!existingOrgData || existingOrgData.full) && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Firm Email Address *</label>
                    <input
                      type="email"
                      value={firmEmail}
                      onChange={(e) => setFirmEmail(e.target.value)}
                      style={styles.input}
                      placeholder="Official firm email"
                      required
                    />
                  </div>
                )}

                {(!existingOrgData || existingOrgData.full) && (
                  <>
                    <div style={styles.sectionTitle}>Contact Person</div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Full Name *</label>
                      <input
                        type="text"
                        value={contactPersonName}
                        onChange={(e) => setContactPersonName(e.target.value)}
                        style={styles.input}
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Designation *</label>
                      <select
                        value={contactPersonDesignation}
                        onChange={(e) => setContactPersonDesignation(e.target.value)}
                        style={styles.input}
                        required
                      >
                        <option value="">Select designation</option>
                        {isLawFirm && <option value="Partner">Partner</option>}
                        {isLawFirm && <option value="Associate">Associate</option>}
                        <option value="Compliance Officer">Compliance Officer</option>
                        <option value="Administrator">Administrator</option>
                        {!isLawFirm && <option value="Director">Director</option>}
                        {!isLawFirm && <option value="Manager">Manager</option>}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Mobile Number *</label>
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        style={styles.input}
                        placeholder="Used for secure authentication and alerts"
                        required
                      />
                    </div>
                  </>
                )}

                {(!existingOrgData || existingOrgData.full) && (
                  <>
                    <div style={styles.sectionTitle}>Choose Your Plan</div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px' }}>
                      Start with a free 14-day trial — no payment required upfront.
                      Tiers reflect firm capacity (users and clients), not feature levels.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
                      {[
                        {
                          tier: 'small_firm',
                          label: 'Small Firm',
                          price: 'TZS 250,000 / month',
                          capacity: '12 users · 150 clients',
                          hint: 'For firms with up to 10 advocates',
                        },
                        {
                          tier: 'medium_firm',
                          label: 'Medium Firm',
                          price: 'TZS 600,000 / month',
                          capacity: '30 users · 600 clients',
                          hint: 'For firms with 11–30 advocates',
                        },
                        {
                          tier: 'large_firm',
                          label: 'Large Firm',
                          price: 'Contact for pricing',
                          capacity: 'Unlimited users & clients',
                          hint: 'For firms with 31+ advocates',
                        },
                      ].map(({ tier, label, price, capacity, hint }) => {
                        const isSelected = requestedTier === tier;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setRequestedTier(tier)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                              border: `2px solid ${isSelected ? '#d4af37' : '#e2e8f0'}`,
                              background: isSelected ? '#fffbeb' : '#f8fafc',
                              boxShadow: isSelected ? '0 0 0 2px rgba(212,175,55,0.15)' : 'none',
                              transition: 'all 0.15s', textAlign: 'left',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#0a1929', marginBottom: '2px' }}>
                                {label}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{hint}</div>
                              <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{capacity}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '12px' }}>
                              <div style={{ fontWeight: '700', fontSize: '13px', color: isSelected ? '#92400e' : '#2563eb' }}>
                                {price}
                              </div>
                              {isSelected && (
                                <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '600', marginTop: '3px' }}>
                                  Selected
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {requestedTier === 'large_firm' && (
                      <div style={{
                        padding: '10px 14px', background: '#eff6ff',
                        border: '1px solid #bfdbfe', borderRadius: '8px',
                        fontSize: '12px', color: '#1d4ed8', marginBottom: '4px',
                      }}>
                        Your trial will use Medium Firm capabilities. Our team will contact you during the trial
                        to discuss Large Firm pricing and onboarding.
                      </div>
                    )}
                  </>
                )}

                {selectedCategory && (
                  <div style={{
                    padding: '12px 16px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#15803d',
                    marginBottom: '8px',
                  }}>
                    <strong>Selected category:</strong>{' '}
                    {selectedCategoryRow?.category_label}
                    {derivedSector === 'general_dnfbp' && (
                      <div style={{ marginTop: '6px', color: '#92400e' }}>
                        Note: full AML assessment questionnaires for this category are coming soon.
                        You can still register and access client management features.
                      </div>
                    )}
                  </div>
                )}

                <div style={styles.sectionTitle}>Consent & Compliance</div>
                <div style={styles.consentBox}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      style={styles.checkbox}
                      required
                    />
                    <span style={styles.checkboxText}>
                      I accept the{' '}
                      <Link to="/terms" style={styles.consentLink}>
                        Terms and Conditions
                      </Link>
                    </span>
                  </label>

                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      style={styles.checkbox}
                      required
                    />
                    <span style={styles.checkboxText}>
                      I accept the{' '}
                      <Link to="/privacy" style={styles.consentLink}>
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                <div style={styles.securityAssurance}>
                  <div style={styles.securityIcon}>🔒</div>
                  <div style={styles.securityText}>
                    <strong>Security Assurance:</strong> This platform applies encryption, strict access control,
                    and institutional data isolation. All client information remains confidential and is accessible
                    only to authorised users within your firm.
                  </div>
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
    maxWidth: '600px',
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    cursor: 'pointer',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    cursor: 'pointer',
  },
  consentLink: {
    color: '#1e40af',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  checkboxText: {
    fontSize: '14px',
    color: '#334155',
    lineHeight: '1.5',
    flex: 1,
  },
  consentBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  securityAssurance: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f0fdf4',
    border: '2px solid #86efac',
    borderRadius: '8px',
    marginTop: '16px',
  },
  securityIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  securityText: {
    fontSize: '13px',
    color: '#15803d',
    lineHeight: '1.6',
  },
  checkingText: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  existingOrgInfo: {
    padding: '12px',
    backgroundColor: '#d1fae5',
    border: '2px solid #10b981',
    borderRadius: '8px',
    marginTop: '8px',
    fontSize: '14px',
    color: '#065f46',
    lineHeight: '1.5',
  },
  warningBox: {
    padding: '12px',
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    marginTop: '8px',
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.5',
  },
};
