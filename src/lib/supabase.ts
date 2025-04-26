// @ts-ignore - Ignoring missing type declarations for @supabase/supabase-js
import { createClient } from '@supabase/supabase-js';
// @ts-ignore - Ignoring missing type declarations
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

// Initialize Supabase client
// @ts-ignore - Ignoring process.env type errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// @ts-ignore - Ignoring process.env type errors
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'alkaforge-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Authentication functions
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      callback(session?.user || null);
    }
  );
  
  return () => {
    data.subscription.unsubscribe();
  };
};

export { supabase };
export type { User }; 