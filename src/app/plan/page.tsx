import { Suspense } from "react";
import { PLAN_LABEL, PLAN_LIMITS, type Plan } from "@/lib/plans/plans";
import { getPlanDetails, getUsageToday } from "@/lib/plans/usage";
import { USER_TZ } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "../app-shell";

export const metadata = { title: "Planım · Yaver" };

const FEATURES: { name: string; free: boolean }[] = [
  { name: "Sohbet, takvim okuma ve onaylı etkinlik ekleme", free: true },
  { name: "Sabah özeti, görevler, hava durumu", free: true },
  { name: "Sesli komut ve sesli sohbet", free: true },
  { name: "Web araştırması ve hafta sonu planı", free: true },
  { name: "Gmail: e-posta arama ve okuma", free: false },
  { name: "Fatura takibi (e-posta ve PDF)", free: false },
  { name: "E-postaya yanıt taslağı", free: false },
  { name: "Proaktif bildirimler", free: false },
];

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-[var(--muted)]">
          <span className="font-medium text-[var(--fg)]">{Math.min(used, limit)}</span> / {limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--chip)]">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-red-400" : "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

async function CurrentPlan() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const [{ plan, proUntil }, usage] = await Promise.all([getPlanDetails(userId), getUsageToday(userId)]);
  const limits = PLAN_LIMITS[plan];

  return (
    <>
      <section className="glass rise space-y-4 rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-xl font-semibold">Planım</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              plan === "pro"
                ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white"
                : "border border-[var(--border-strong)]"
            }`}
          >
            {PLAN_LABEL[plan]}
          </span>
        </div>
        {proUntil && (
          <p className="text-sm text-[var(--muted)]">
            Pro süren{" "}
            <span className="font-medium text-[var(--fg)]">
              {new Intl.DateTimeFormat("tr-TR", { timeZone: USER_TZ, day: "numeric", month: "long" }).format(new Date(proUntil))}
            </span>{" "}
            tarihinde bitiyor; sonra Ücretsiz plana geçersin.
          </p>
        )}
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Bugünkü kullanım</h2>
          <Meter label="Mesaj" used={usage.messages} limit={limits.messages} />
          <Meter label="Web araştırması" used={usage.webSearches} limit={limits.webSearches} />
          <p className="text-xs text-[var(--muted)]">Haklar her gece 00:00&apos;da (Türkiye saati) yenilenir.</p>
        </div>
      </section>

      <section className="glass rise space-y-4 rounded-3xl p-5" style={{ animationDelay: "80ms" }}>
        <h2 className="font-display text-lg font-semibold">Planlar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["free", "pro"] as Plan[]).map((p) => (
            <div
              key={p}
              className={`space-y-3 rounded-2xl border p-4 ${
                p === plan ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold">{PLAN_LABEL[p]}</h3>
                {p === plan && <span className="text-xs text-[var(--accent-2)]">Şu anki planın</span>}
              </div>
              <p className="text-sm text-[var(--muted)]">
                Günde {PLAN_LIMITS[p].messages} mesaj · {PLAN_LIMITS[p].webSearches} web araştırması
              </p>
              <ul className="space-y-1.5 text-sm">
                {FEATURES.map((f) => {
                  const included = p === "pro" || f.free;
                  return (
                    <li key={f.name} className={`flex gap-2 ${included ? "" : "text-[var(--muted)] line-through opacity-60"}`}>
                      <span aria-hidden="true">{included ? "✓" : "–"}</span>
                      <span>{f.name}</span>
                      <span className="sr-only">{included ? "dahil" : "dahil değil"}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {plan === "free" && (
          <p className="text-sm text-[var(--muted)]">
            Online ödeme yakında açılacak. Şimdilik Pro plan, beta kullanıcılarına Yaver ekibi tarafından tanımlanıyor.
          </p>
        )}
      </section>
    </>
  );
}

export default function PlanPage() {
  return (
    <AppShell active="plan">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <Suspense fallback={<p className="glass rounded-3xl p-5 text-sm text-[var(--muted)]">Yükleniyor…</p>}>
          <CurrentPlan />
        </Suspense>
      </div>
    </AppShell>
  );
}
