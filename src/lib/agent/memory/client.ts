import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client. Uses service role — never import this from client code.
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (set in .env.local).

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
