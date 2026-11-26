import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { costUsd, tokenCounts, type UsageLike } from "./cost";

export type UsageSource = "chat" | "briefing" | "bill_scan";

interface ResponseLike {
  model: string;
  usage: UsageLike & { iterations?: unknown };
}

/** Per-attempt usage when a server-side fallback ran; otherwise the top-level usage. */
function attempts(res: ResponseLike): { model: string; usage: UsageLike }[] {
  const it = res.usage.iterations;
  if (Array.isArray(it) && it.length > 0 && it.every((e) => e && typeof e === "object" && "input_tokens" in e)) {
    return it.map((e: UsageLike & { model?: string }) => ({ model: e.model ?? res.model, usage: e }));
  }
  return [{ model: res.model, usage: res.usage }];
}

/**
 * Logs what one API response cost. Never throws: usage tracking must not
 * break a chat turn or a briefing. `webSearches` overrides the count in usage
 * (the agent loop counts server_tool_use blocks itself).
 */
export async function recordApiUsage(
  userId: string | null,
  source: UsageSource,
  res: ResponseLike,
  webSearches?: number,
): Promise<void> {
  try {
    const rows = attempts(res).map((a, i, all) => {
      const t = tokenCounts(a.usage);
      // Searches belong to the attempt that produced the returned message (the last).
      if (webSearches !== undefined) t.webSearches = i === all.length - 1 ? webSearches : 0;
      return {
        user_id: userId,
        day: todayLocal(),
        source,
        model: a.model,
        input_tokens: t.input,
        output_tokens: t.output,
        cache_read_tokens: t.cacheRead,
        cache_write_tokens: t.cacheWrite5m + t.cacheWrite1h,
        web_searches: t.webSearches,
        cost_usd: Number(costUsd(a.model, t).toFixed(6)),
      };
    });
    const { error } = await createAdminClient().from("ai_usage_log").insert(rows);
    if (error) console.error("recordApiUsage failed", error);
  } catch (err) {
    console.error("recordApiUsage failed", err);
  }
}
