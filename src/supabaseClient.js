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

// DEV ONLY — never shipped to production (Vite tree-shakes this block entirely in prod build)
if (import.meta.env.DEV) {
  window.__supabase = supabase;
}
