import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/** Thrown when the user has no usable Google connection; ask them to sign in again. */
export class GoogleNotConnectedError extends Error {
  constructor() {
    super("Google hesabı bağlı değil veya izin geri alınmış. Lütfen çıkış yapıp tekrar giriş yap.");
  }
}

// Access tokens live ~1h. Cache per server instance to avoid a token
// exchange on every tool call.
const cache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Revokes Yaver's Google access (at Google too) and forgets the stored
 * refresh token. The user reconnects by signing in again.
 */
export async function disconnectGoogle(userId: string): Promise<void> {
  const db = createAdminClient();
  const { data } = await db
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.refresh_token) {
    // Best effort: even if Google is unreachable we still delete our copy.
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: data.refresh_token }),
    }).catch((err) => console.error("Google revoke failed", err));
  }

  cache.delete(userId);
  const { error } = await db.from("google_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function getGoogleAccessToken(userId: string): Promise<string> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.token;

  const db = createAdminClient();
  const { data, error } = await db
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new GoogleNotConnectedError();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    // invalid_grant = user revoked access or the token expired.
    if (body.error === "invalid_grant") throw new GoogleNotConnectedError();
    throw new Error(`Google token yenilenemedi (${res.status})`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cache.set(userId, {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
  return json.access_token;
}
