import { getOrCreateBriefing } from "@/lib/briefing/generate";
import { createClient } from "@/lib/supabase/server";
import { formatTime } from "@/lib/time";
import { RefreshBriefingButton } from "./refresh-briefing-button";

/** Flags events that already ended, read at request time (not cached). */
function markEnded<T extends { end: string; allDay: boolean }>(events: T[]) {
  const now = Date.now();
  return events.map((e) => ({ ...e, ended: !e.allDay && Date.parse(e.end) < now }));
}

function timeRange(e: { start: string; end: string; allDay: boolean }) {
  return e.allDay ? "Tüm gün" : `${formatTime(e.start)}–${formatTime(e.end)}`;
}

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

  if (!result.ok) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Bugünün özeti</h2>
          <RefreshBriefingButton />
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{result.message}</p>
      </section>
    );
  }

  const { ai, freeSlots, pendingCount } = result.briefing;
  const events = markEnded(result.briefing.events);

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-medium">Bugünün özeti</h2>
          <p className="text-sm leading-relaxed">{ai.overview}</p>
        </div>
        <RefreshBriefingButton />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Program · {events.length}
          </h3>
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Bugün takviminde etkinlik yok.</p>
          ) : (
            <ul className="space-y-1.5">
              {events.map((e, i) => {
                return (
                  <li key={i} className={`flex gap-3 text-sm ${e.ended ? "opacity-50" : ""}`}>
                    <span className="w-24 shrink-0 tabular-nums text-[var(--muted)]">{timeRange(e)}</span>
                    <span>{e.title}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {freeSlots.length > 0 && (
            <p className="pt-1 text-xs text-[var(--muted)]">
              Boş zaman:{" "}
              {freeSlots.map((s) => `${s.start}–${s.end}`).join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Öncelikler</h3>
          {ai.priorities.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Bugün öne çıkan bir iş görünmüyor.</p>
          ) : (
            <ol className="space-y-2">
              {ai.priorities.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="font-medium text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    {p.title}
                    <span className="block text-xs text-[var(--muted)]">{p.why}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {ai.suggestion && (
            <p className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm">💡 {ai.suggestion}</p>
          )}
          {pendingCount > 0 && (
            <p className="text-xs text-[var(--muted)]">{pendingCount} işlem onayını bekliyor.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function BriefingSkeleton() {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-medium">Bugünün özeti</h2>
      <p className="mt-2 animate-pulse text-sm text-[var(--muted)]">Yaver günün özetini hazırlıyor…</p>
    </section>
  );
}
