import { formatMoney } from "@/lib/bills/format";
import { getOrCreateBriefing } from "@/lib/briefing/generate";
import { createClient } from "@/lib/supabase/server";
import { dayStart, formatTime, todayLocal } from "@/lib/time";
import { Card } from "./card";
import { RefreshBriefingButton } from "./refresh-briefing-button";

/** Flags events that already ended, read at request time (not cached). */
function markEnded<T extends { end: string; allDay: boolean }>(events: T[]) {
  const now = Date.now();
  return events.map((e) => ({ ...e, ended: !e.allDay && Date.parse(e.end) < now }));
}

function ProgressRing({ pct }: { pct: number | null }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const filled = pct === null ? 0 : (pct / 100) * c;
  return (
    <div className="relative h-[96px] w-[96px] shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5fd0ff" />
            <stop offset="1" stopColor="#3b7bff" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(110,150,255,0.14)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          style={{ filter: "drop-shadow(0 0 6px rgba(95,208,255,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold">{pct === null ? "—" : `${pct}%`}</span>
        <span className="text-[0.7rem] text-[var(--muted)]">tamamlandı</span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="font-display text-base font-semibold leading-tight">{value}</p>
    </div>
  );
}

/** Tasks for today's progress: due today or earlier and open, or completed today. */
async function todaysTaskCounts() {
  const supabase = await createClient();
  const today = todayLocal();
  const startUtc = new Date(dayStart(today)).toISOString();
  const [{ count: open }, { count: done }] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open").lte("due_date", today),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done").gte("completed_at", startUtc),
  ]);
  return { open: open ?? 0, done: done ?? 0 };
}

/**
 * "Bugün": the day's progress ring (real counts only) plus the morning
 * summary. One component so the summary is generated once per page.
 */
export async function BriefingCard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  let result;
  try {
    result = await getOrCreateBriefing(userId);
  } catch (err) {
    console.error("briefing failed", err);
    result = { ok: false as const, message: "Özet şu an hazırlanamadı. Biraz sonra tekrar dene." };
  }
  const taskCounts = await todaysTaskCounts();

  if (!result.ok) {
    return (
      <Card title="Bugün" persona="planner" delay={120} fill>
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-[var(--muted)]">{result.message}</p>
          <RefreshBriefingButton />
        </div>
      </Card>
    );
  }

  const { ai, freeSlots, pendingCount, bills = [] } = result.briefing;
  const billTotal = bills.reduce((sum, b) => sum + (b.amount ?? 0), 0);
  const events = markEnded(result.briefing.events);
  const timed = events.filter((e) => !e.allDay);
  const endedCount = timed.filter((e) => e.ended).length;

  const total = timed.length + taskCounts.open + taskCounts.done;
  const done = endedCount + taskCounts.done;
  const pct = total === 0 ? null : Math.round((done / total) * 100);

  return (
    <Card title="Bugün" persona="planner" delay={120} fill>
      <div className="flex items-center gap-4">
        <ProgressRing pct={pct} />
        <div className="grid flex-1 gap-1.5">
          <Stat label="Etkinlik" value={`${endedCount}/${timed.length}`} />
          <Stat label="Görev" value={`${taskCounts.done}/${taskCounts.open + taskCounts.done}`} />
          <Stat label="Onay bekleyen" value={String(pendingCount)} />
        </div>
      </div>
      {pct === null && <p className="mt-2 text-xs text-[var(--muted)]">Bugün için planlı etkinlik ya da görev yok.</p>}

      <div className="mt-4 flex items-start justify-between gap-3 border-t border-[var(--border)] pt-4">
        <p className="text-sm leading-relaxed">{ai.overview}</p>
        <RefreshBriefingButton />
      </div>

      {events.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {events.map((e, i) => (
            <li key={i} className={`flex gap-3 text-sm ${e.ended ? "opacity-45" : ""}`}>
              <span className="w-12 shrink-0 tabular-nums text-[var(--accent-2)]">
                {e.allDay ? "Gün" : formatTime(e.start)}
              </span>
              <span className={`min-w-0 truncate ${e.ended ? "line-through" : ""}`}>{e.title}</span>
            </li>
          ))}
        </ul>
      )}

      {ai.priorities.length > 0 && (
        <ol className="mt-4 space-y-2">
          {ai.priorities.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="font-display font-semibold text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                {p.title}
                <span className="block text-xs text-[var(--muted)]">{p.why}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {ai.suggestion && (
        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm">
          💡 {ai.suggestion}
        </p>
      )}

      {(freeSlots.length > 0 || bills.length > 0) && (
        <div className="mt-3 space-y-1 text-xs text-[var(--muted)]">
          {freeSlots.length > 0 && <p>Boş zaman: {freeSlots.map((s) => `${s.start}–${s.end}`).join(", ")}</p>}
          {bills.length > 0 && (
            <p>
              Bu hafta {bills.length} fatura{billTotal > 0 && ` · toplam ${formatMoney(billTotal)}`}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export function BriefingSkeleton() {
  return (
    <Card title="Bugün" persona="planner" delay={120} fill>
      <div className="flex items-center gap-4">
        <div className="h-[96px] w-[96px] animate-pulse rounded-full border-[10px] border-[var(--border)]" />
        <p className="text-sm text-[var(--muted)]">Yaver günün özetini hazırlıyor…</p>
      </div>
    </Card>
  );
}
