import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://eccdphuupctvdayyenhl.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_8JlfIOAaxD_ePc0yoG7qYA_wC5QkNWq';

const envUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  localStorage.getItem('docvault_supabase_url') ||
  DEFAULT_SUPABASE_URL;

const envKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  localStorage.getItem('docvault_supabase_key') ||
  DEFAULT_SUPABASE_KEY;

export let supabase: SupabaseClient | null = null;

try {
  if (envUrl && envKey) {
    supabase = createClient(envUrl, envKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }
} catch (err) {
  console.warn('Failed to initialize Supabase client:', err);
  supabase = null;
}

export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

export const updateSupabaseCredentials = (url: string, key: string) => {
  localStorage.setItem('docvault_supabase_url', url.trim());
  localStorage.setItem('docvault_supabase_key', key.trim());
  try {
    supabase = createClient(url.trim(), key.trim());
    return true;
  } catch (err) {
    console.error('Invalid Supabase configuration', err);
    return false;
  }
};
