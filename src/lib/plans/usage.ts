import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { effectivePlan, PLAN_LIMITS, type Plan } from "./plans";

export async function getPlan(userId: string): Promise<Plan> {
  const { data, error } = await createAdminClient()
    .from("user_plans")
    .select("plan, pro_until")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("getPlan failed", error);
  return effectivePlan(data);
}

export interface Usage {
  messages: number;
  webSearches: number;
}

export async function getUsageToday(userId: string): Promise<Usage> {
  const { data } = await createAdminClient()
    .from("usage_daily")
    .select("messages, web_searches")
    .eq("user_id", userId)
    .eq("day", todayLocal())
    .maybeSingle();
  return { messages: data?.messages ?? 0, webSearches: data?.web_searches ?? 0 };
}

/** Takes one chat message from today's allowance; false when the limit is reached. */
export async function consumeMessage(userId: string, plan: Plan): Promise<{ ok: boolean; used: number }> {
  const { data, error } = await createAdminClient().rpc("consume_message", {
    p_user: userId,
    p_day: todayLocal(),
    p_limit: PLAN_LIMITS[plan].messages,
  });
  if (error) {
    // Fail open: a counter outage (or migration 0009 not run yet) must not
    // lock everyone out of chat. Logged so it gets noticed.
    console.error("consumeMessage failed; allowing the message", error);
    return { ok: true, used: 0 };
  }
  const n = data as number;
  return n < 0 ? { ok: false, used: PLAN_LIMITS[plan].messages } : { ok: true, used: n };
}

/** Records usage; negative values give it back (e.g. a failed turn). */
export async function addUsage(userId: string, delta: { messages?: number; webSearches?: number }) {
  const { error } = await createAdminClient().rpc("add_usage", {
    p_user: userId,
    p_day: todayLocal(),
    p_messages: delta.messages ?? 0,
    p_web_searches: delta.webSearches ?? 0,
  });
  if (error) console.error("addUsage failed", error);
}
