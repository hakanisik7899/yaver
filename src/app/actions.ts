"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DATE_REGEX } from "@/lib/time";
import { geocode } from "@/lib/weather/open-meteo";
import { shortPlaceLabel } from "@/lib/weather/pick-place";
import { getOrCreateBriefing } from "@/lib/briefing/generate";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notifications/send";
import { getPlan } from "@/lib/plans/usage";
import { executeApprovedAction, rejectAction, registry } from "@/lib/tools";
import { createSupabaseActionStore } from "@/lib/tools/supabase-store";
import { allowedModes, defaultMode } from "@/lib/tools/policy";
import { getServerTool } from "@/lib/tools/server-tools";
import { disconnectGoogle } from "@/lib/google/oauth";

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) throw new Error("unauthorized");
  return id;
}

export async function deleteConversation(id: string) {
  if (!z.uuid().safeParse(id).success) return;
  await currentUserId();
  const supabase = await createClient();
  // RLS limits this to the user's own conversation; messages cascade.
  // Audit log entries stay (their conversation link is set to null).
  await supabase.from("ai_conversations").delete().eq("id", id);
  revalidatePath("/history");
}

const ModeChoice = z.enum(["auto", "ask", "deny"]);

/** Trust Center: per-tool permission. Choosing the default removes the row. */
export async function setToolPermission(toolName: string, mode: string) {
  // Client tools and Anthropic-run server tools (web search) alike.
  const tool = registry.get(toolName) ?? getServerTool(toolName);
  const parsed = ModeChoice.safeParse(mode);
  if (!tool || !parsed.success || !allowedModes(tool).includes(parsed.data)) {
    return { ok: false as const };
  }
  const userId = await currentUserId();
  const supabase = await createClient();

  const { error } =
    parsed.data === defaultMode(tool)
      ? await supabase.from("tool_permissions").delete().eq("tool_name", toolName)
      : await supabase.from("tool_permissions").upsert({
          user_id: userId,
          tool_name: toolName,
          mode: parsed.data,
          updated_at: new Date().toISOString(),
        });
  revalidatePath("/trust");
  return { ok: !error };
}

/**
 * Deletes the account and all of its data: revokes Google access, then
 * deletes the auth user; every table references auth.users with
 * "on delete cascade". The user confirms by typing their email address.
 */
export async function deleteMyAccount(confirmEmail: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const email = (data?.claims?.email as string | undefined)?.toLowerCase();
  if (!userId || !email) return { ok: false as const, message: "Oturum bulunamadı." };
  if (confirmEmail.trim().toLowerCase() !== email) {
    return { ok: false as const, message: "Yazdığın e-posta adresi hesabınla eşleşmiyor." };
  }

  try {
    await disconnectGoogle(userId);
  } catch (err) {
    // The token row is deleted with the user below anyway.
    console.error("deleteMyAccount: Google disconnect failed", err);
  }
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) {
    console.error("deleteMyAccount failed", error);
    return { ok: false as const, message: "Hesap silinemedi. Lütfen tekrar dene." };
  }
  await supabase.auth.signOut();
  redirect("/hesap-silindi");
}

export async function disconnectGoogleAccount() {
  const userId = await currentUserId();
  await disconnectGoogle(userId);
  revalidatePath("/trust");
}

const PushSub = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Registers this device for push. The endpoint is unique; re-subscribing moves it to this user. */
export async function savePushSubscription(sub: unknown, userAgent: string) {
  const parsed = PushSub.safeParse(sub);
  if (!parsed.success) return { ok: false as const };
  const userId = await currentUserId();
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: userAgent.slice(0, 300),
      },
      { onConflict: "endpoint" },
    );
  revalidatePath("/trust");
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string) {
  await currentUserId();
  const supabase = await createClient();
  // RLS: only the user's own device can be removed.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  revalidatePath("/trust");
}

export async function sendTestNotification() {
  const userId = await currentUserId();
  if ((await getPlan(userId)) !== "pro") return { ok: false, result: "pro_only" as const };
  const result = await notifyUser(
    userId,
    {
      kind: "test",
      refKey: crypto.randomUUID(),
      title: "Yaver bildirimleri açık",
      body: "Toplantılar, sabah özeti ve gecikmiş görevler için seni buradan uyaracağım.",
    },
    { force: true },
  );
  return { ok: result === "sent", result };
}

const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Prefs = z.object({
  briefing: z.boolean(),
  meetings: z.boolean(),
  overdue_tasks: z.boolean(),
  approvals: z.boolean(),
  bills: z.boolean(),
  quiet_start: TIME,
  quiet_end: TIME,
});

export async function saveNotificationPrefs(input: unknown) {
  const parsed = Prefs.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const userId = await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: userId, ...parsed.data, updated_at: new Date().toISOString() });
  revalidatePath("/trust");
  return { ok: !error };
}

export async function approveAction(actionId: string) {
  const userId = await currentUserId();
  const outcome = await executeApprovedAction(
    registry,
    createSupabaseActionStore(),
    userId,
    actionId,
    await getPlan(userId),
  );
  revalidatePath("/");
  return outcome.status === "ok"
    ? { ok: true as const }
    : { ok: false as const, message: "message" in outcome ? outcome.message : "İşlem yapılamadı." };
}

export async function refreshBriefing() {
  const userId = await currentUserId();
  await getOrCreateBriefing(userId, { force: true });
  revalidatePath("/");
}

const NewTask = z.object({
  title: z.string().trim().min(1).max(200),
  due_date: z.union([z.string().regex(DATE_REGEX), z.literal("")]).optional(),
});

/** Direct user action from the tasks panel (not the agent, so no audit entry). */
export async function addTask(input: { title: string; due_date?: string }) {
  const parsed = NewTask.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Görev başlığı gerekli." };
  const userId = await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    title: parsed.data.title,
    due_date: parsed.data.due_date || null,
  });
  if (error) return { ok: false as const, message: "Görev eklenemedi." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function setTaskDone(taskId: string, done: boolean) {
  if (!z.uuid().safeParse(taskId).success) return { ok: false as const };
  await currentUserId();
  const supabase = await createClient();
  // RLS limits the update to the signed-in user's own task.
  const { error } = await supabase
    .from("tasks")
    .update(done ? { status: "done", completed_at: new Date().toISOString() } : { status: "open", completed_at: null })
    .eq("id", taskId);
  revalidatePath("/");
  return { ok: !error };
}

/** Direct user action from the bills panel; records payment, pays nothing. */
export async function setBillPaid(billId: string, paid: boolean) {
  if (!z.uuid().safeParse(billId).success) return { ok: false as const };
  await currentUserId();
  const supabase = await createClient();
  // RLS limits the update to the signed-in user's own bill.
  const { error } = await supabase
    .from("bills")
    .update(paid ? { status: "paid", paid_at: new Date().toISOString() } : { status: "unpaid", paid_at: null })
    .eq("id", billId);
  revalidatePath("/");
  return { ok: !error };
}

/** Saves the weather card's city after checking that it exists. */
export async function setWeatherCity(input: string) {
  const city = z.string().trim().min(2).max(80).safeParse(input);
  if (!city.success) return { ok: false as const, message: "Şehir adı 2-80 karakter olmalı." };
  const userId = await currentUserId();

  let place;
  try {
    place = await geocode(city.data);
  } catch {
    return { ok: false as const, message: "Konum servisine ulaşılamadı, tekrar dene." };
  }
  if (!place) return { ok: false as const, message: `"${city.data}" bulunamadı.` };

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_settings")
    // Store "Place, Province" so the card re-resolves exactly this place.
    .upsert({ user_id: userId, weather_city: shortPlaceLabel(place), updated_at: new Date().toISOString() });
  if (error) {
    console.error("setWeatherCity failed", error);
    // PGRST205 / 42P01: the user_settings table (migration 0008) is missing.
    const missingTable = error.code === "PGRST205" || error.code === "42P01";
    return {
      ok: false as const,
      message: missingTable
        ? "Şehir kaydedilemedi: ayar tablosu henüz kurulmamış (0008 migration)."
        : "Şehir kaydedilemedi. Tekrar dene.",
    };
  }
  revalidatePath("/");
  return { ok: true as const };
}

export async function declineAction(actionId: string) {
  const userId = await currentUserId();
  const ok = await rejectAction(createSupabaseActionStore(), userId, actionId);
  revalidatePath("/");
  return { ok };
}
