/**
 * Supabase Client Configuration
 * 
 * This file sets up the Supabase clients for use throughout the application.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://uelshvuhoqfbsfiyqdha.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbHNodnVob3FmYnNmaXlxZGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDEzNzgsImV4cCI6MjA4MzExNzM3OH0.8RK1JHgQ70YrOntSnqZq8SXvDvMK1YS-zT5ZC6o-W3Q";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbHNodnVob3FmYnNmaXlxZGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU0MTM3OCwiZXhwIjoyMDgzMTE3Mzc4fQ.Ui-e8Tj9dq7jSHkjDeHBuG8saMIkwG13fm-iMuDtelc";

/**
 * Public client instance
 * Uses anon key - respects Row Level Security (RLS)
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

/**
 * Admin client instance
 * Uses service role key - BYPASSES Row Level Security (RLS)
 * Use only for seeding or administrative tasks
 */
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
