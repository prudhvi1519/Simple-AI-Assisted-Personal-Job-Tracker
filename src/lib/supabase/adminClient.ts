import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with Service Role privileges.
 * This MUST only be used in server-side contexts (Route Handlers, Server Actions, Middleware).
 * NEVER expose this to the client.
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase URL or Service Role Key");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
