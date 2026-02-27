import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
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

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(newUser);
          if (newUser) {
            setLoading(true);
            await loadUserProfile(newUser.id);
            setLoading(false);
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

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
  }), [user, profile, organization, loading, signUp, signIn, signOut, isEarlyClient, hasActiveSubscription, hasAccess, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
