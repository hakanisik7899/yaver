import "server-only";
import { getOrCreateBriefing } from "@/lib/briefing/generate";
import { listEvents } from "@/lib/google/calendar";
import { getConnectionHealth, GoogleNotConnectedError } from "@/lib/google/oauth";
import { getPlan } from "@/lib/plans/usage";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureDailyBillScan } from "@/lib/bills/scan";
import { addDays, formatTime, nextDayStart, todayLocal } from "@/lib/time";
import { BILL_LEAD_DAYS, billRefKey, billReminders, type DueBill } from "./bill-reminders";
import { registry } from "@/lib/tools";
import { effectiveMode } from "@/lib/tools/policy";
import type { PermissionMode } from "@/lib/tools/types";
import { eventsStartingSoon, inDaytime, inMorningWindow, type NotificationPrefs } from "./rules";
import { getPrefs, localTimeHHMM, notifyUser, type SendResult } from "./send";

const MEETING_LEAD_MINUTES = 20;
const APPROVAL_WAIT_MINUTES = 60;
const CONCURRENCY = 3;

/**
 * Runs every few minutes (Supabase pg_cron -> /api/cron/notify).
 * These are background checks, not model actions, so they read data
 * directly instead of through the Tool Layer (which would flood the audit
 * log with reads). They still honour Trust Center switches: if the user
 * turned a read tool off, the matching check does not read that data.
 * Every notification sent is recorded in notification_log.
 */
export async function runNotificationChecks(now = new Date()) {
  const db = createAdminClient();
  const { data: rows } = await db.from("push_subscriptions").select("user_id");
  const users = [...new Set((rows ?? []).map((r) => r.user_id as string))];

  const summary: Record<string, number> = {};
  const count = (r: SendResult | "error") => (summary[r] = (summary[r] ?? 0) + 1);

  const queue = [...users];
  async function worker() {
    for (let userId = queue.shift(); userId; userId = queue.shift()) {
      try {
        for (const r of await checkUser(userId, now)) count(r);
      } catch (err) {
        count("error");
        console.error("notify: user check failed", userId, err);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { users: users.length, ...summary };
}

async function allowedReads(userId: string) {
  const { data } = await createAdminClient()
    .from("tool_permissions")
    .select("tool_name, mode")
    .eq("user_id", userId);
  const stored = new Map((data ?? []).map((r) => [r.tool_name as string, r.mode as PermissionMode]));
  const allowed = (name: string) => {
    const tool = registry.get(name);
    return !!tool && effectiveMode(tool, stored.get(name)) !== "deny";
  };
  return {
    calendar: allowed("list_calendar_events"),
    tasks: allowed("list_tasks"),
    bills: allowed("list_bills"),
  };
}

async function checkUser(userId: string, now: Date): Promise<SendResult[]> {
  // Proactive notifications are a Pro feature.
  if ((await getPlan(userId)) !== "pro") return [];

  // Google rejected the token: one notice per break (daytime); the checks
  // that need Google are skipped until the user reconnects.
  const health = await getConnectionHealth(userId);
  const googleOk = !health.brokenAt;
  const prefs = await getPrefs(userId);
  const time = localTimeHHMM(now);
  const today = todayLocal();
  const reads = await allowedReads(userId);
  const results: SendResult[] = [];

  if (!googleOk && inDaytime(time)) {
    results.push(
      await notifyUser(userId, {
        kind: "connection",
        refKey: health.brokenAt!,
        title: "Google bağlantın koptu",
        body: "Takvim ve e-postalarını okuyamıyorum. Yaver'i açıp \"Yeniden bağlan\"a dokunman yeterli.",
        url: "/",
      }),
    );
  }
  if (googleOk && prefs.meetings && reads.calendar) results.push(...(await meetingReminders(userId, now, today, prefs)));
  if (googleOk && prefs.briefing && reads.calendar && inMorningWindow(time, prefs)) {
    results.push(await briefingReady(userId, today, prefs));
  }
  if (prefs.overdue_tasks && reads.tasks && inDaytime(time)) {
    results.push(await overdueTasks(userId, today, prefs));
  }
  if (prefs.bills && reads.bills && inDaytime(time)) {
    // Bills already found are still reminded while Google is disconnected.
    results.push(...(await billsDueSoon(userId, today, prefs, googleOk)));
  }
  if (prefs.approvals) results.push(...(await waitingApprovals(userId, now, prefs)));
  return results;
}

/**
 * Unpaid bills: a reminder BILL_LEAD_DAYS before the last payment date and
 * one on the day itself, several bills listed in one push. Runs today's
 * email scan first (once a day, normally already done by the 07:00
 * briefing), so new bills are found even if the user never opens the app.
 */
async function billsDueSoon(userId: string, today: string, prefs: NotificationPrefs, googleOk: boolean) {
  if (googleOk) {
    try {
      await ensureDailyBillScan(userId);
    } catch (err) {
      console.error("notify: bill scan failed", userId, err);
    }
  }

  const db = createAdminClient();
  const { data } = await db
    .from("bills")
    .select("id, provider, amount, currency, due_date")
    .eq("user_id", userId)
    .eq("status", "unpaid")
    .gte("due_date", today)
    .lte("due_date", addDays(today, BILL_LEAD_DAYS))
    .limit(20);
  const bills = (data ?? []) as DueBill[];
  if (!bills.length) return [];

  const keys = bills.flatMap((b) => [billRefKey(b.id, "early"), billRefKey(b.id, "due")]);
  const { data: logged } = await db
    .from("notification_log")
    .select("ref_key")
    .eq("user_id", userId)
    .eq("kind", "bills")
    .in("ref_key", keys);
  const sent = new Set((logged ?? []).map((r) => r.ref_key as string));

  return Promise.all(
    billReminders(bills, today, sent).map(({ refKeys: [refKey, ...extraRefKeys], title, body }) =>
      notifyUser(userId, { kind: "bills", refKey, extraRefKeys, title, body, url: "/" }, { prefs }),
    ),
  );
}

async function meetingReminders(userId: string, now: Date, today: string, prefs: NotificationPrefs) {
  let events;
  try {
    // Today plus tomorrow covers reminders shortly after midnight.
    events = await listEvents(userId, now.toISOString(), nextDayStart(today));
  } catch (err) {
    if (err instanceof GoogleNotConnectedError) return [];
    throw err;
  }
  const soon = eventsStartingSoon(events, now.getTime(), MEETING_LEAD_MINUTES);
  return Promise.all(
    soon.map((e) => {
      const minutes = Math.max(1, Math.round((Date.parse(e.start) - now.getTime()) / 60_000));
      return notifyUser(
        userId,
        {
          kind: "meetings",
          refKey: `${e.id}:${e.start}`,
          title: `${minutes} dk sonra: ${e.title}`,
          body: `${formatTime(e.start)}${e.location ? ` · ${e.location}` : ""}${e.hasVideoCall ? " · görüntülü görüşme" : ""}`,
          url: "/",
        },
        { prefs },
      );
    }),
  );
}

async function briefingReady(userId: string, today: string, prefs: NotificationPrefs): Promise<SendResult> {
  // Skip the Claude call entirely if today's notification already went out.
  const { count } = await createAdminClient()
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "briefing")
    .eq("ref_key", today);
  if (count) return "duplicate";

  const result = await getOrCreateBriefing(userId);
  if (!result.ok) return "failed";
  const { ai, events } = result.briefing;
  return notifyUser(
    userId,
    {
      kind: "briefing",
      refKey: today,
      title: "Günaydın! Bugünün özeti hazır",
      body: ai.overview || `Bugün ${events.length} etkinliğin var.`,
      url: "/",
    },
    { prefs },
  );
}

async function overdueTasks(userId: string, today: string, prefs: NotificationPrefs): Promise<SendResult> {
  const { data } = await createAdminClient()
    .from("tasks")
    .select("title")
    .eq("user_id", userId)
    .eq("status", "open")
    .lt("due_date", today)
    .limit(20);
  if (!data?.length) return "nothing";
  const first = data[0].title as string;
  return notifyUser(
    userId,
    {
      kind: "overdue_tasks",
      refKey: today,
      title: data.length === 1 ? "Gecikmiş bir görevin var" : `${data.length} gecikmiş görevin var`,
      body: data.length === 1 ? first : `${first} ve ${data.length - 1} görev daha`,
      url: "/",
    },
    { prefs },
  );
}

async function waitingApprovals(userId: string, now: Date, prefs: NotificationPrefs) {
  const cutoff = new Date(now.getTime() - APPROVAL_WAIT_MINUTES * 60_000).toISOString();
  const { data } = await createAdminClient()
    .from("pending_actions")
    .select("id, summary")
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .limit(5);
  return Promise.all(
    (data ?? []).map((a) =>
      notifyUser(
        userId,
        { kind: "approvals", refKey: a.id, title: "Onayını bekleyen bir işlem var", body: a.summary, url: "/" },
        { prefs },
      ),
    ),
  );
}
