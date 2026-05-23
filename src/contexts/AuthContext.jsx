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
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN') {
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
    if (user?.id) {
      await loginTrackingService.endSession(user.id);
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, [user]);

  const hasActiveSubscription = useMemo(() => {
    if (!profile) return false;
    if (profile?.role === 'admin') return true;

    if (!organization) return false;
    if (!organization.is_active) return false;

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
  }), [user, profile, organization, loading, signUp, signIn, signOut, isEarlyClient, hasActiveSubscription, hasAccess, refreshProfile, revokedMessage]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
