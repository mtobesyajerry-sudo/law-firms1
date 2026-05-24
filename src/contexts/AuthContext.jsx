import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { loginTrackingService } from '../services/loginTrackingService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEarlyClient, setIsEarlyClient] = useState(false);
  const [revokedMessage, setRevokedMessage] = useState(null);
  // MFA state
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaAssuranceLevel, setMfaAssuranceLevel] = useState(null); // 'aal1' | 'aal2'
  // True while the user has a valid aal1 session but must complete TOTP before we set `user`.
  // Keeping `user` null while this is true prevents App.jsx from redirecting away from /auth
  // before Auth.jsx's MfaChallenge screen has a chance to render and collect the code.
  const [pendingMfaChallenge, setPendingMfaChallenge] = useState(false);
  const pendingMfaUserRef = useRef(null); // holds the auth user object during the aal1→aal2 gap
  // Track the last session token we checked so we don't re-check on every render
  const lastCheckedSession = useRef(null);

  // Checks whether the current session has been administratively revoked.
  // Returns true and triggers a forced sign-out if revoked.
  const checkSessionRevocation = useCallback(async (session) => {
    if (!session?.user?.id || !session?.access_token) return false;
    // Avoid redundant checks for the same token
    if (lastCheckedSession.current === session.access_token) return false;
    lastCheckedSession.current = session.access_token;

    try {
      let jti = null;
      let sessionId = null;
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]));
        jti = payload.jti ?? null;
        sessionId = payload.session_id ?? null;
      } catch { /* non-fatal */ }

      const { data: revoked } = await supabase.rpc('is_session_revoked', {
        p_user_id: session.user.id,
        p_session_id: sessionId,
        p_jti: jti,
      });

      if (revoked) {
        setRevokedMessage('Your session has been ended by an administrator.');
        await supabase.auth.signOut();
        return true;
      }
    } catch (err) {
      console.error('Session revocation check error:', err);
    }
    return false;
  }, []);

  const checkIfEarlyClient = useCallback(async (userId) => {
    if (!userId) {
      setIsEarlyClient(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('is_early_client', { user_id: userId });

      if (error) {
        console.error('Error checking early client status:', error);
        setIsEarlyClient(false);
        return;
      }

      setIsEarlyClient(data === true);
      console.log('Early client status:', data);
    } catch (error) {
      console.error('Error checking early client:', error);
      setIsEarlyClient(false);
    }
  }, []);

  const checkMfaState = useCallback(async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasTOTP = (factors?.totp?.length ?? 0) > 0;
      setMfaEnrolled(hasTOTP);

      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setMfaAssuranceLevel(aalData?.currentLevel ?? 'aal1');
    } catch {
      setMfaEnrolled(false);
      setMfaAssuranceLevel('aal1');
    }
  }, []);

  const loadUserProfile = useCallback(async (userId, retryCount = 0) => {
    if (!userId) {
      setProfile(null);
      setOrganization(null);
      setIsEarlyClient(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data && retryCount < 5) {
        console.log(`Profile not found, retrying... (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return loadUserProfile(userId, retryCount + 1);
      }

      console.log('Loaded user profile:', data);
      setProfile(data);

      // Check MFA enrollment and assurance level
      await checkMfaState();

      // Check if user is an early client
      await checkIfEarlyClient(userId);

      if (data?.organization_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .maybeSingle();

        if (orgError) {
          console.error('Error loading organization:', orgError);
        } else {
          console.log('Loaded organization:', orgData);
          setOrganization(orgData);

          // Check if organization is suspended
          if (orgData && orgData.subscription_status === 'suspended' && data.role !== 'admin') {
            console.warn('Organization is suspended - logging out user');
            await supabase.auth.signOut();
            alert('Your organization access has been suspended due to non-payment. Please contact your administrator or support for assistance.');
            return;
          }
        }
      } else {
        setOrganization(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
      setOrganization(null);
      setIsEarlyClient(false);
    }
  }, [checkIfEarlyClient]);

  useEffect(() => {
    console.log('AuthContext: Initializing...');

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('AuthContext: Loading timeout - forcing completion');
      setLoading(false);
    }, 10000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('AuthContext: Initial session check', { session, error });
      if (error) {
        console.error('AuthContext: Session error', error);
      }
      if (session?.user) {
        const wasRevoked = await checkSessionRevocation(session);
        if (!wasRevoked) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        }
      } else {
        setUser(null);
      }
      clearTimeout(timeout);
      setLoading(false);
      console.log('AuthContext: Initialization complete');
    }).catch(err => {
      console.error('AuthContext: Fatal initialization error', err);
      clearTimeout(timeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const newUser = session?.user ?? null;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setOrganization(null);
          setIsEarlyClient(false);
          setMfaEnrolled(false);
          setMfaAssuranceLevel(null);
          setPendingMfaChallenge(false);
          pendingMfaUserRef.current = null;
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN') {
          if (newUser) {
            // Before exposing the user to the rest of the app, check whether they need to
            // complete a TOTP challenge (aal1 session with an enrolled aal2 factor).
            // If so, hold the user object in a ref and set pendingMfaChallenge — this keeps
            // `user` null so App.jsx does NOT redirect away from /auth while challenge is pending.
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1') {
              pendingMfaUserRef.current = newUser;
              setPendingMfaChallenge(true);
              setLoading(false);
              return; // do NOT setUser — keep user null until challenge is passed
            }
          }
          setUser(newUser);
          if (newUser) {
            setLoading(true);
            await loadUserProfile(newUser.id);
            setLoading(false);
          }
        }

        // Handle TOKEN_REFRESHED and INITIAL_SESSION without changing loading state
        // This prevents navigation during token refresh or page reload
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session) {
            const wasRevoked = await checkSessionRevocation(session);
            if (wasRevoked) return;
          }
          setUser(newUser);
          if (newUser) {
            await loadUserProfile(newUser.id);
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const signUp = useCallback(async (email, password, fullName = '') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const userId = user?.id ?? pendingMfaUserRef.current?.id;
    if (userId) {
      await loginTrackingService.endSession(userId);
    }
    pendingMfaUserRef.current = null;
    setPendingMfaChallenge(false);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, [user]);

  // Called by Auth.jsx after the TOTP challenge is successfully verified.
  // Promotes the held user object into real state so the app can proceed normally.
  const completeMfaChallenge = useCallback(async () => {
    const pendingUser = pendingMfaUserRef.current;
    pendingMfaUserRef.current = null;
    setPendingMfaChallenge(false);
    if (pendingUser) {
      setUser(pendingUser);
      setLoading(true);
      await loadUserProfile(pendingUser.id);
      setLoading(false);
    }
  }, [loadUserProfile]);

  // --- Trial state derived from organization ---
  const isTrialing = organization?.is_trialing === true;
  const trialEndsAt = organization?.trial_ends_at ?? null;
  const daysUntilTrialEnds = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000))
    : null;
  // Trial expired and no active paid subscription — show upgrade modal
  const trialExpiredNeedPayment = useMemo(() => {
    if (!organization) return false;
    if (!organization.has_used_trial) return false;
    if (organization.is_trialing) return false;
    // If subscription_expiry_date is null, treat as unlimited access (legacy)
    if (!organization.subscription_expiry_date) return false;
    return new Date(organization.subscription_expiry_date) <= new Date();
  }, [organization]);

  const hasActiveSubscription = useMemo(() => {
    if (!profile) return false;
    if (profile?.role === 'admin') return true;

    if (!organization) return false;
    if (!organization.is_active) return false;

    // Active trial counts as having subscription access
    if (organization.is_trialing) return true;

    // NULL subscription_expiry_date means unlimited/trial access
    if (!organization.subscription_expiry_date) return true;

    const expiryDate = new Date(organization.subscription_expiry_date);
    const now = new Date();
    return expiryDate > now;
  }, [profile, organization]);

  const hasAccess = useMemo(() => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;

    if (!profile.is_active) return false;

    if (!organization) return false;
    if (!organization.is_active) return false;

    return hasActiveSubscription;
  }, [profile, organization, hasActiveSubscription]);

  const refreshProfile = useCallback(() => {
    if (user?.id) {
      loadUserProfile(user.id);
    }
  }, [user?.id, loadUserProfile]);

  // Grace period helpers
  const mfaGracePeriodEnds = profile?.mfa_grace_period_ends ?? null;
  const mfaGraceExpired = mfaGracePeriodEnds
    ? new Date(mfaGracePeriodEnds) <= new Date()
    : false;
  // requiresMfaEnrollment = user has no MFA factor AND grace period has expired
  const requiresMfaEnrollment = !mfaEnrolled && mfaGraceExpired && !!user;
  // showMfaNudge = user has no MFA factor but still within grace period
  const showMfaNudge = !mfaEnrolled && !mfaGraceExpired && !!user && mfaGracePeriodEnds !== null;

  const value = useMemo(() => ({
    user,
    profile,
    organization,
    loading,
    signUp,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
    isClient: profile?.role === 'client',
    isEarlyClient,
    hasActiveSubscription,
    hasAccess,
    refreshProfile,
    revokedMessage,
    requiresPasswordChange: profile?.password_change_required === true,
    // Trial state
    isTrialing,
    trialEndsAt,
    daysUntilTrialEnds,
    trialExpiredNeedPayment,
    // MFA
    mfaEnrolled,
    mfaAssuranceLevel,
    mfaGracePeriodEnds,
    mfaGraceExpired,
    requiresMfaEnrollment,
    showMfaNudge,
    refreshMfaState: checkMfaState,
    // MFA challenge gate — true while user has aal1 session and needs TOTP to reach aal2
    pendingMfaChallenge,
    completeMfaChallenge,
  }), [user, profile, organization, loading, signUp, signIn, signOut, isEarlyClient, hasActiveSubscription, hasAccess, refreshProfile, revokedMessage, isTrialing, trialEndsAt, daysUntilTrialEnds, trialExpiredNeedPayment, mfaEnrolled, mfaAssuranceLevel, mfaGracePeriodEnds, mfaGraceExpired, requiresMfaEnrollment, showMfaNudge, checkMfaState, pendingMfaChallenge, completeMfaChallenge]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
