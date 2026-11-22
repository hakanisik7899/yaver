/** Plans and their limits (pure; shared by server and UI). */

export type Plan = "free" | "pro";

export interface PlanLimits {
  /** Chat messages per Türkiye calendar day. */
  messages: number;
  /** Web searches (Anthropic server tool uses) per day. */
  webSearches: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { messages: 15, webSearches: 2 },
  pro: { messages: 150, webSearches: 20 },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Ücretsiz", pro: "Pro" };

/** Turkish reason the Tool Layer returns when a Pro-only tool is called on Free. */
export const PRO_ONLY_REASON =
  "Bu özellik Pro planda: Gmail (e-posta arama ve okuma, faturalar, yanıt taslağı). Ücretsiz planda kullanılamaz; Planım sayfasından ayrıntılara bakılabilir.";

export interface PlanRow {
  plan: string;
  pro_until: string | null;
}

/** Pro only while the row says so and its end date (if any) is in the future. */
export function effectivePlan(row: PlanRow | null | undefined, now = Date.now()): Plan {
  if (row?.plan !== "pro") return "free";
  if (row.pro_until && Date.parse(row.pro_until) <= now) return "free";
  return "pro";
}

/** How many web searches the next request may use (0 = don't offer the tool). */
export function webSearchAllowance(plan: Plan, usedToday: number, perRequestMax = 5): number {
  return Math.max(0, Math.min(perRequestMax, PLAN_LIMITS[plan].webSearches - usedToday));
}
