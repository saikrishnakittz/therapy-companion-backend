import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, isSupabaseConfigured } from './env';

let publicClientInstance: SupabaseClient | null = null;

/**
 * Returns a shared public Supabase client using SUPABASE_ANON_KEY.
 * Suitable for public actions and auth token verification (e.g. supabase.auth.getUser(token)).
 * Does NOT use service-role key and respects RLS.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!publicClientInstance) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    publicClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return publicClientInstance;
};

/**
 * Creates an authenticated Supabase client for a specific user request using their JWT.
 * Every database operation executed through this client runs in PostgreSQL with
 * `auth.uid()` set to the verified user's ID, strictly enforcing Row Level Security (RLS).
 *
 * Never uses service-role credentials.
 */
export const createAuthenticatedClient = (accessToken: string): SupabaseClient => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
      },
    },
  });
};

export { isSupabaseConfigured };
