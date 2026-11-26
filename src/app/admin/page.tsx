import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadAdminOverview, type AdminUserRow } from "@/lib/admin/overview";
import { currentAdminId } from "@/lib/admin/server";
import { PLAN_LABEL } from "@/lib/plans/plans";
import { USER_TZ } from "@/lib/time";
import { AppShell } from "../app-shell";
import { PlanControl } from "./plan-control";

export const metadata = { title: "Yönetim · Yaver" };

function day(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: USER_TZ, day: "numeric", month: "short" }).format(new Date(iso));
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
      {hint && <p className="text-[0.7rem] text-[var(--muted)]">{hint}</p>}
    </div>
  );
}

const GOOGLE: Record<AdminUserRow["google"], { text: string; className: string }> = {
  ok: { text: "Bağlı", className: "text-[var(--accent-2)]" },
  broken: { text: "Kopmuş", className: "text-amber-300" },
  missing: { text: "Yok", className: "text-[var(--muted)]" },
};

async function Overview() {
  // Not an admin: the page does not exist for them (checked before any data is read).
  if (!(await currentAdminId())) notFound();
  const { users, totals } = await loadAdminOverview();
  return (
    <>
      <section className="glass rise space-y-3 rounded-3xl p-5">
        <h2 className="font-medium">Kullanım özeti</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Kullanıcı" value={totals.users} hint={`${totals.pro} Pro`} />
          <Stat label="Aktif (bugün / 7 gün)" value={totals.activeToday} hint={`7 günde ${totals.active7d}`} />
          <Stat label="Mesaj bugün" value={totals.messagesToday} hint={`7 günde ${totals.messages7d}`} />
          <Stat label="Web araştırması bugün" value={totals.webToday} hint={`7 günde ${totals.web7d}`} />
        </div>
        {totals.brokenConnections > 0 && (
          <p className="text-sm text-amber-300">
            {totals.brokenConnections} kullanıcının Google bağlantısı kopmuş; yeniden bağlanmaları gerekiyor.
          </p>
        )}
      </section>

      <section className="glass rise space-y-3 rounded-3xl p-5" style={{ animationDelay: "80ms" }}>
        <h2 className="font-medium">Kullanıcılar</h2>
        <ul className="divide-y divide-[var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.email}</p>
                <p className="text-xs text-[var(--muted)]">
                  {u.name ? `${u.name} · ` : ""}katıldı {day(u.createdAt)} · son giriş {day(u.lastSignInAt)} · Google{" "}
                  <span className={GOOGLE[u.google].className}>{GOOGLE[u.google].text}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-4 text-xs text-[var(--muted)]">
                <span>
                  Mesaj <span className="font-medium text-[var(--fg)]">{u.messagesToday}</span> / {u.messages7d}
                </span>
                <span>
                  Web <span className="font-medium text-[var(--fg)]">{u.webToday}</span> / {u.web7d}
                </span>
                <span className="w-24">
                  <span className={u.plan === "pro" ? "font-medium text-[var(--accent-2)]" : ""}>{PLAN_LABEL[u.plan]}</span>
                  {u.plan === "pro" && u.proUntil && ` · ${day(u.proUntil)}'e kadar`}
                </span>
              </div>
              <PlanControl userId={u.id} email={u.email} current={u.plan} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--muted)]">Mesaj ve web sayıları: bugün / son 7 gün.</p>
      </section>
    </>
  );
}

export default function AdminPage() {
  return (
    <AppShell active="admin">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <Suspense fallback={<p className="glass rounded-3xl p-5 text-sm text-[var(--muted)]">Yükleniyor…</p>}>
          <Overview />
        </Suspense>
      </div>
    </AppShell>
  );
}
