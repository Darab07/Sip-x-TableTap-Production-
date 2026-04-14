import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined);

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined);

const isSecretLikeKey = (key: string | undefined) =>
  Boolean(key && key.trim().toLowerCase().startsWith("sb_secret_"));

if (isSecretLikeKey(supabaseAnonKey)) {
  throw new Error(
    "Security misconfiguration: client Supabase key must be anon/publishable, never service-role/secret.",
  );
}

export const hasSupabaseBrowserClient = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseBrowser = hasSupabaseBrowserClient
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
