import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

const getSupabaseUrl = () =>
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const getServiceRoleKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

const isLikelyPublicKey = (key: string) => {
  const normalized = key.trim();
  // Legacy anon keys are JWT-shaped; modern publishable keys start with sb_publishable_.
  return (
    normalized.startsWith("sb_publishable_") ||
    (normalized.startsWith("eyJ") && normalized.split(".").length === 3)
  );
};

export const getSupabaseAdmin = () => {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const url = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  if (isLikelyPublicKey(serviceRoleKey)) {
    throw new Error(
      "Invalid Supabase admin key configuration: SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY must be a server secret key, not an anon/publishable key.",
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};

export const assertSupabaseAdmin = () => {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL (or VITE_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) on the server.",
    );
  }
  return client;
};
