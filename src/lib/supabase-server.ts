import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRequiredEnv, getSupabaseServiceRoleKey } from "./env";

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      getRequiredEnv("SUPABASE_URL"),
      getSupabaseServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return supabaseAdmin;
}
