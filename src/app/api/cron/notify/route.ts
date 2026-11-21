import type { NextRequest } from "next/server";
import { runNotificationChecks } from "@/lib/notifications/check";

export const maxDuration = 120;

/**
 * Called every 5 minutes by Supabase pg_cron (Vercel Hobby cron is daily
 * only). Authenticated with CRON_SECRET, like /api/cron/briefings.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runNotificationChecks();
  return Response.json(result);
}
