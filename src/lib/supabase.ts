import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

// createClient throws synchronously if given an empty URL, which would crash
// the whole app at import time when Supabase isn't configured. Fall back to a
// placeholder so the client can be constructed; callers must check
// hasSupabaseEnv before relying on it actually working.
export const supabase = createClient(
  hasSupabaseEnv ? supabaseUrl : "https://placeholder.supabase.co",
  hasSupabaseEnv ? supabaseAnonKey : "placeholder-anon-key"
);
