import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from Vite environment variables or dynamic localStorage settings
const meta = import.meta as any;
const envUrl = meta.env?.VITE_SUPABASE_URL || localStorage.getItem('docvault_supabase_url') || '';
const envKey = meta.env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('docvault_supabase_key') || '';

export let supabase: SupabaseClient | null = null;

if (envUrl && envKey) {
  try {
    supabase = createClient(envUrl, envKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabase = null;
  }
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
