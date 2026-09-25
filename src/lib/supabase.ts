import { createClient } from "@supabase/supabase-js";

// Only the public URL and the public (anon) key are ever used in the browser.
// Row Level Security in the database is what protects the data — never rely on this key
// for secrecy, and never put the service-role key or any AI provider key in frontend code.
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Fails loudly in dev instead of silently making requests to "undefined".
  // Never falls back to a hardcoded/demo project URL.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values.",
  );
}

export const supabase = createClient(supabaseUrl ?? "http://localhost:0", supabaseAnonKey ?? "missing-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
