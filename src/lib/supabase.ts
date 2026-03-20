import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

export type StampRow = {
  id: string;
  domain: string;
  tag_name: string;
  tag_style: string;
  link: string | null;
  description: string | null;
  nickname: string;
  email: string;
  verify_token: string;
  verified: boolean;
  created_at: string;
  verified_at: string | null;
};

export type ReminderRow = {
  id: string;
  domain: string;
  email: string;
  days_before: number;
  expiration_date: string | null;
  created_at: string;
};
