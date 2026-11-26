import { getConnectionHealth } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";
import { ReconnectButton } from "./reconnect-button";

/**
 * Floating notice when Yaver can no longer reach the user's Google account.
 * Fixed-position so it never changes the one-screen home layout.
 */
export async function ConnectionBanner() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const health = await getConnectionHealth(userId);
  if (!health.missing && !health.brokenAt) return null;

  return (
    <div
      role="alert"
      className="glass rise fixed inset-x-3 top-3 z-50 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-amber-400/40 px-4 py-3 shadow-2xl sm:top-5"
    >
      <span className="text-lg" aria-hidden="true">
        ⚠️
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Google bağlantın koptu.</span>{" "}
        <span className="text-[var(--muted)]">
          Takvim ve e-postaların okunamıyor; sabah özeti ve bildirimler durdu.
        </span>
      </p>
      <ReconnectButton />
    </div>
  );
}
