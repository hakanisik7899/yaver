import type { NextRequest } from "next/server";
import { getOrCreateBriefing } from "@/lib/briefing/generate";
import { createAdminClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const CONCURRENCY = 3;

/**
 * Vercel Cron, 04:00 UTC = 07:00 Türkiye (see vercel.json).
 * Prepares today's briefing for every connected user so the card is ready
 * when they open the app. Users who already have one are skipped by
 * getOrCreateBriefing itself.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: users, error } = await db.from("google_connections").select("user_id");
  if (error) {
    console.error("cron: failed to list users", error);
    return Response.json({ error: "list_failed" }, { status: 500 });
  }

  const queue = users.map((u) => u.user_id as string);
  let ok = 0;
  let failed = 0;

  async function worker() {
    for (let userId = queue.shift(); userId; userId = queue.shift()) {
      try {
        const result = await getOrCreateBriefing(userId);
        if (result.ok) ok++;
        else failed++;
      } catch (err) {
        failed++;
        console.error("cron: briefing failed", userId, err);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return Response.json({ users: users.length, ok, failed });
}
