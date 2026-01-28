import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
// Use this for server components and API routes

export function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseAnonKey);
}
