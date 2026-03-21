import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase admin client (service role).
 * Uses REST/HTTP under the hood — works from any environment including Replit,
 * where direct TCP connections to Supabase are blocked.
 *
 * Required secrets:
 *   SUPABASE_URL         – e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY – service_role key from Supabase project settings
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    console.error(
      "[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. " +
        "Add them as secrets in your project settings.",
    );
    return null;
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}
