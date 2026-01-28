import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase client factory
// Use this in server components and API routes
// Creates a new client per request to handle env vars properly

export function getServerSupabase(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    return createClient(supabaseUrl, supabaseAnonKey);
}

// Re-export for backwards compatibility
export const createServerClient = getServerSupabase;
