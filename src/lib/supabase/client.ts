import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client-side Supabase client
// Use this for browser/client components
// Lazy initialization to avoid build-time errors

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
    }

    _supabase = createClient(supabaseUrl, supabaseAnonKey);
    return _supabase;
}

// Re-export all types
export * from "./types";
