import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables');
}

// Get session identifier from URL to support multiple simultaneous user sessions
const getSessionKey = () => {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session');
  return sessionId ? `sb-session-${sessionId}` : 'supabase.auth.token';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: getSessionKey(),
  }
});

// DEV/STAGING ONLY — remove window.__supabase before production deployment.
// This enables DevTools-based security verification testing.
// Not gated on import.meta.env.DEV because Bolt WebContainer sets DEV=false even in dev server mode.
if (typeof window !== 'undefined') {
  window.__supabase = supabase;
}
