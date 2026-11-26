import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadAdminOverview, loadAdminTrends, TREND_DAYS, type AdminUserRow } from "@/lib/admin/overview";
import { DailyBars } from "./daily-bars";
import { currentAdminId } from "@/lib/admin/server";
import { PLAN_LABEL, TRIAL_DAYS } from "@/lib/plans/plans";
import { USER_TZ } from "@/lib/time";
import { AppShell } from "../app-shell";
import { CopyBox, FeedbackDone, WaitlistActions } from "./beta-controls";
import { PlanControl } from "./plan-control";

const SITE = "https://yaver-six.vercel.app";
const FEEDBACK_KIND = { bug: "🐞 Hata", idea: "💡 Öneri", other: "💬 Diğer" } as const;
const WAIT_STATUS = { pending: "Bekliyor", invited: "Davet edildi", rejected: "Reddedildi" } as const;
const INVITE_TEXT =
  `Merhaba! Yaver kapalı betasına davet edildin 🎉 ${SITE} adresini aç ve listeye yazdığın Gmail hesabıyla ` +
  `"Google ile devam et" de. Google "doğrulanmamış uygulama" uyarısı gösterirse "Gelişmiş → Yaver'e git" demen ` +
  `yeterli (beta olduğumuz için). İlk ${TRIAL_DAYS} gün Pro'nun tüm özellikleri açık. Görüşlerini uygulamadaki ` +
  `geri bildirim düğmesinden yazarsan çok sevinirim.`;

export const metadata = { title: "Yönetim · Yaver" };

function day(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: USER_TZ, day: "numeric", month: "short" }).format(new Date(iso));
}

const usdFmt = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(v: number) {
  return v > 0 && v < 0.01 ? "< $0,01" : usdFmt.format(v);
}

const SOURCE_LABEL: Record<string, string> = { chat: "Sohbet", briefing: "Sabah özeti", bill_scan: "Fatura tarama" };

function perMessage(t: Awaited<ReturnType<typeof loadAdminTrends>>) {
  const chat = t.bySource.find((b) => b.source === "chat")?.costUsd ?? 0;
  const messages = t.days.reduce((n, d) => n + d.messages, 0);
  return messages ? chat / messages : 0;
}

/** Average 30-day cost of current Pro users: what one Pro subscriber costs per month. */
function proMonthly(t: Awaited<ReturnType<typeof loadAdminTrends>>, users: AdminUserRow[]) {
  const pros = users.filter((u) => u.plan === "pro");
  if (!pros.length) return 0;
  return pros.reduce((n, u) => n + (t.perUser.get(u.id)?.costUsd ?? 0), 0) / pros.length;
}

function MoneyStat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-display text-2xl font-semibold">{money(value)}</p>
      {hint && <p className="text-[0.7rem] text-[var(--muted)]">{hint}</p>}
    </div>
  );
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
  const [{ users, totals, waitlist, feedback }, trends] = await Promise.all([loadAdminOverview(), loadAdminTrends()]);
  const pendingWait = waitlist.filter((w) => w.status === "pending");
  const decidedWait = waitlist.filter((w) => w.status !== "pending").slice(0, 30);
  const openFeedback = feedback.filter((f) => f.status === "new");
  const doneFeedback = feedback.filter((f) => f.status === "done").slice(0, 20);
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

      <section className="glass rise space-y-3 rounded-3xl p-5" style={{ animationDelay: "20ms" }}>
        <h2 className="font-medium">Son {TREND_DAYS} gün</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MoneyStat label={`Yapay zekâ maliyeti (${TREND_DAYS} gün)`} value={trends.costTotal} hint={`bugün ${money(trends.costToday)}`} />
          <MoneyStat
            label="Aktif kullanıcı başına"
            value={trends.activeUsers ? trends.costTotal / trends.activeUsers : 0}
            hint={`${trends.activeUsers} aktif kullanıcı`}
          />
          <MoneyStat
            label="Mesaj başına (sohbet)"
            value={perMessage(trends)}
            hint={`${trends.days.reduce((n, d) => n + d.messages, 0)} mesaj`}
          />
          <MoneyStat label="Pro kullanıcı başına / ay" value={proMonthly(trends, users)} hint={`${totals.pro} Pro kullanıcı`} />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <DailyBars
            title="Günlük maliyet"
            unit="usd"
            total={money(trends.costTotal)}
            data={trends.days.map((d) => ({ day: d.day, value: d.costUsd }))}
          />
          <DailyBars
            title="Günlük mesaj"
            unit="count"
            total={String(trends.days.reduce((n, d) => n + d.messages, 0))}
            data={trends.days.map((d) => ({ day: d.day, value: d.messages }))}
          />
          <DailyBars
            title="Günlük aktif kullanıcı"
            unit="count"
            total={`${trends.activeUsers} kişi`}
            data={trends.days.map((d) => ({ day: d.day, value: d.activeUsers }))}
          />
        </div>
        {trends.bySource.length > 0 && (
          <p className="text-xs text-[var(--muted)]">
            Maliyet dağılımı:{" "}
            {trends.bySource.map((b, i) => (
              <span key={b.source}>
                {i > 0 && " · "}
                {SOURCE_LABEL[b.source] ?? b.source}{" "}
                <span className="font-medium text-[var(--fg)]">{money(b.costUsd)}</span> ({b.calls} çağrı)
              </span>
            ))}
          </p>
        )}
        <p className="text-xs text-[var(--muted)]">
          Maliyet, her API yanıtının token sayılarından liste fiyatlarıyla hesaplanır (Anthropic faturasına yakın,
          kur ve vergi hariç). Kayıt bu sürümle başladı; önceki günlerde maliyet görünmez.
        </p>
      </section>

      <section className="glass rise space-y-3 rounded-3xl p-5" style={{ animationDelay: "40ms" }}>
        <h2 className="font-medium">
          Geri bildirimler{" "}
          {openFeedback.length > 0 && <span className="text-sm text-[var(--accent-2)]">· {openFeedback.length} yeni</span>}
        </h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Henüz geri bildirim yok.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {[...openFeedback, ...doneFeedback].map((f) => (
              <li key={f.id} className={`space-y-1.5 py-3 ${f.status === "done" ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--muted)]">
                    {FEEDBACK_KIND[f.kind]} · {f.email} · {day(f.createdAt)}
                    {f.page ? ` · ${f.page}` : ""}
                  </p>
                  <FeedbackDone id={f.id} done={f.status === "done"} />
                </div>
                <p className="whitespace-pre-wrap text-sm">{f.message}</p>
                {f.userAgent && <p className="truncate text-[0.7rem] text-[var(--muted)]">{f.userAgent}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass rise space-y-3 rounded-3xl p-5" style={{ animationDelay: "60ms" }}>
        <h2 className="font-medium">
          Beta bekleme listesi{" "}
          {pendingWait.length > 0 && <span className="text-sm text-[var(--accent-2)]">· {pendingWait.length} bekliyor</span>}
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Davet için: adresleri Google Cloud → Google Auth Platform → Audience → Test users&apos;a ekle, &quot;Davet
          ettim&quot;e bas ve kişiye davet mesajını gönder. Yeni kullanıcılar ilk girişte {TRIAL_DAYS} gün Pro alır. Liste
          sayfası: {SITE}/beta
        </p>
        {pendingWait.length > 0 && (
          <CopyBox label="Bekleyen adresler (Google Cloud'a toplu yapıştırmak için)" text={pendingWait.map((w) => w.email).join(", ")} rows={2} />
        )}
        <CopyBox label="Davet mesajı" text={INVITE_TEXT} rows={4} />
        {waitlist.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Listede henüz kimse yok.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {[...pendingWait, ...decidedWait].map((w) => (
              <li key={w.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="truncate">
                    {w.email}
                    {w.name ? <span className="text-[var(--muted)]"> · {w.name}</span> : null}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {day(w.createdAt)} · {WAIT_STATUS[w.status]}
                    {w.joined ? " · giriş yaptı ✓" : ""}
                  </p>
                  {w.note && <p className="mt-1 text-xs">&ldquo;{w.note}&rdquo;</p>}
                </div>
                <WaitlistActions id={w.id} status={w.status} />
              </li>
            ))}
          </ul>
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
                <span title={`Son ${TREND_DAYS} gün yapay zekâ maliyeti`}>
                  {money(trends.perUser.get(u.id)?.costUsd ?? 0)}
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
        <p className="text-xs text-[var(--muted)]">Mesaj ve web sayıları: bugün / son 7 gün. Tutar: son {TREND_DAYS} günün yapay zekâ maliyeti.</p>
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
