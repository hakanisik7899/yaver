"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { executeApprovedAction, rejectAction, registry } from "@/lib/tools";
import { createSupabaseActionStore } from "@/lib/tools/supabase-store";

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) throw new Error("unauthorized");
  return id;
}

export async function approveAction(actionId: string) {
  const userId = await currentUserId();
  const outcome = await executeApprovedAction(registry, createSupabaseActionStore(), userId, actionId);
  revalidatePath("/");
  return outcome.status === "ok"
    ? { ok: true as const }
    : { ok: false as const, message: "message" in outcome ? outcome.message : "İşlem yapılamadı." };
}

export async function declineAction(actionId: string) {
  const userId = await currentUserId();
  const ok = await rejectAction(createSupabaseActionStore(), userId, actionId);
  revalidatePath("/");
  return { ok };
}
