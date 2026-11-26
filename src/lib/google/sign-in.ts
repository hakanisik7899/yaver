import { createClient } from "@/lib/supabase/client";
import { GOOGLE_SCOPES } from "./scopes";

/** Starts Google sign-in in the browser; also used to reconnect a broken connection. */
export async function startGoogleSignIn(): Promise<{ error: boolean }> {
  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: GOOGLE_SCOPES,
      // offline + consent => Google returns a refresh token so Yaver can
      // work in the background (morning summary, bill scan, notifications).
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  return { error: !!error };
}
