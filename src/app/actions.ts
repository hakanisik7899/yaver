"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DATE_REGEX } from "@/lib/time";
import { getOrCreateBriefing } from "@/lib/briefing/generate";
import { createClient } from "@/lib/supabase/server";
import { executeApprovedAction, rejectAction, registry } from "@/lib/tools";
import { createSupabaseActionStore } from "@/lib/tools/supabase-store";
import { allowedModes, defaultMode } from "@/lib/tools/policy";
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
  const tool = registry.get(toolName);
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

export async function disconnectGoogleAccount() {
  const userId = await currentUserId();
  await disconnectGoogle(userId);
  revalidatePath("/trust");
}

export async function approveAction(actionId: string) {
  const userId = await currentUserId();
  const outcome = await executeApprovedAction(registry, createSupabaseActionStore(), userId, actionId);
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

export async function declineAction(actionId: string) {
  const userId = await currentUserId();
  const ok = await rejectAction(createSupabaseActionStore(), userId, actionId);
  revalidatePath("/");
  return { ok };
}
