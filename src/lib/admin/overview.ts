import "server-only";
import { effectivePlan, type Plan } from "@/lib/plans/plans";
import { createAdminClient } from "@/lib/supabase/server";
import { addDays, todayLocal } from "@/lib/time";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  plan: Plan;
  proUntil: string | null;
  google: "ok" | "broken" | "missing";
  messagesToday: number;
  messages7d: number;
  webToday: number;
  web7d: number;
}

export interface AdminOverview {
  users: AdminUserRow[];
  totals: {
    users: number;
    pro: number;
    activeToday: number;
    active7d: number;
    messagesToday: number;
    messages7d: number;
    webToday: number;
    web7d: number;
    brokenConnections: number;
  };
}

/** Everything the admin page shows. Server only: reads across all users. */
export async function loadAdminOverview(): Promise<AdminOverview> {
  const db = createAdminClient();
  const today = todayLocal();
  const weekStart = addDays(today, -6);

  const [usersRes, plansRes, connRes, usageRes] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("user_plans").select("user_id, plan, pro_until"),
    // Never select refresh_token here.
    db.from("google_connections").select("user_id, broken_at"),
    db.from("usage_daily").select("user_id, day, messages, web_searches").gte("day", weekStart),
  ]);
  if (usersRes.error) throw usersRes.error;

  const plans = new Map((plansRes.data ?? []).map((p) => [p.user_id as string, p]));
  const conns = new Map((connRes.data ?? []).map((c) => [c.user_id as string, c]));
  const usage = new Map<string, { mt: number; m7: number; wt: number; w7: number }>();
  for (const u of usageRes.data ?? []) {
    const row = usage.get(u.user_id) ?? { mt: 0, m7: 0, wt: 0, w7: 0 };
    row.m7 += u.messages;
    row.w7 += u.web_searches;
    if (u.day === today) {
      row.mt += u.messages;
      row.wt += u.web_searches;
    }
    usage.set(u.user_id, row);
  }

  const users: AdminUserRow[] = usersRes.data.users.map((u) => {
    const p = plans.get(u.id);
    const c = conns.get(u.id);
    const use = usage.get(u.id) ?? { mt: 0, m7: 0, wt: 0, w7: 0 };
    const meta = (u.user_metadata ?? {}) as { full_name?: string };
    return {
      id: u.id,
      email: u.email ?? "(e-posta yok)",
      name: meta.full_name ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      plan: effectivePlan(p ? { plan: p.plan, pro_until: p.pro_until } : null),
      proUntil: (p?.pro_until as string | null) ?? null,
      google: !c ? "missing" : c.broken_at ? "broken" : "ok",
      messagesToday: use.mt,
      messages7d: use.m7,
      webToday: use.wt,
      web7d: use.w7,
    };
  });
  users.sort((a, b) => b.messages7d - a.messages7d || b.createdAt.localeCompare(a.createdAt));

  const sum = (f: (u: AdminUserRow) => number) => users.reduce((n, u) => n + f(u), 0);
  return {
    users,
    totals: {
      users: users.length,
      pro: users.filter((u) => u.plan === "pro").length,
      activeToday: users.filter((u) => u.messagesToday > 0).length,
      active7d: users.filter((u) => u.messages7d > 0).length,
      messagesToday: sum((u) => u.messagesToday),
      messages7d: sum((u) => u.messages7d),
      webToday: sum((u) => u.webToday),
      web7d: sum((u) => u.web7d),
      brokenConnections: users.filter((u) => u.google === "broken").length,
    },
  };
}
