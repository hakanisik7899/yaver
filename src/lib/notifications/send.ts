import "server-only";
// web-push has no default export under Turbopack; use named imports.
import { sendNotification, setVapidDetails } from "web-push";
import { createAdminClient } from "@/lib/supabase/server";
import { USER_TZ } from "@/lib/time";
import { isQuietTime, normalizePrefs, type NotificationKind, type NotificationPrefs } from "./rules";

let configured = false;
function configure() {
  if (configured) return;
  setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export function localTimeHHMM(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: USER_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const { data } = await createAdminClient()
    .from("notification_prefs")
    .select("briefing, meetings, overdue_tasks, approvals, bills, quiet_start, quiet_end")
    .eq("user_id", userId)
    .maybeSingle();
  return normalizePrefs(data);
}

export interface PushMessage {
  kind: NotificationKind | "test";
  /** Dedupe key within the kind, e.g. "<event id>:<start>" or a date. */
  refKey: string;
  title: string;
  body: string;
  /** Where a tap on the notification leads. */
  url?: string;
}

/** "nothing": no notification was due; "failed": could not prepare it. */
export type SendResult = "sent" | "no_devices" | "duplicate" | "disabled" | "quiet" | "nothing" | "failed";

/**
 * Sends a push to all of the user's devices, at most once per kind+refKey.
 * Respects the user's per-kind switches and quiet hours unless `force`
 * (used for the test notification).
 */
export async function notifyUser(
  userId: string,
  msg: PushMessage,
  { force = false, prefs }: { force?: boolean; prefs?: NotificationPrefs } = {},
): Promise<SendResult> {
  const db = createAdminClient();

  if (!force) {
    const p = prefs ?? (await getPrefs(userId));
    if (msg.kind !== "test" && !p[msg.kind]) return "disabled";
    if (isQuietTime(localTimeHHMM(), p.quiet_start, p.quiet_end)) return "quiet";
  }

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return "no_devices";

  // Claim the send first: the unique key makes concurrent runs send once.
  const { error: claimError } = await db.from("notification_log").insert({
    user_id: userId,
    kind: msg.kind,
    ref_key: msg.refKey,
    title: msg.title,
    body: msg.body,
  });
  if (claimError) {
    if (claimError.code === "23505") return "duplicate";
    throw claimError;
  }

  configure();
  const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? "/", tag: `${msg.kind}:${msg.refKey}` });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60, urgency: msg.kind === "meetings" ? "high" : "normal" },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: the browser dropped this subscription; forget it.
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("push failed", status, err);
        }
      }
    }),
  );
  return "sent";
}
