import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** Per-request client acting as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  // With Cache Components, cookies() alone may still allow a runtime
  // prerender; the Supabase client reads Date.now() while loading the
  // session, which Next rejects there. Everything after this is request-time.
  await connection();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component: cookies are read-only there.
            // Session refresh is handled by src/proxy.ts.
          }
        },
      },
    },
  );
}

/**
 * Privileged client that bypasses RLS. Server-only; use solely for
 * tables the user must never read directly (e.g. Google refresh tokens).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
