export type NotificationKind = "briefing" | "meetings" | "overdue_tasks" | "approvals" | "bills";

export interface NotificationPrefs {
  briefing: boolean;
  meetings: boolean;
  overdue_tasks: boolean;
  approvals: boolean;
  bills: boolean;
  quiet_start: string; // "HH:MM" local time
  quiet_end: string;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  briefing: true,
  meetings: true,
  overdue_tasks: true,
  approvals: true,
  bills: true,
  quiet_start: "22:00",
  quiet_end: "07:00",
};

/** Postgres returns "22:00:00"; keep "HH:MM". */
export function normalizePrefs(row: Partial<NotificationPrefs> | null | undefined): NotificationPrefs {
  const p = { ...DEFAULT_PREFS, ...(row ?? {}) };
  return { ...p, quiet_start: p.quiet_start.slice(0, 5), quiet_end: p.quiet_end.slice(0, 5) };
}

/**
 * Whether `now` ("HH:MM", user's local time) falls in the quiet window.
 * Handles windows that cross midnight (22:00–07:00). Equal start and end
 * means no quiet hours.
 */
export function isQuietTime(now: string, start: string, end: string): boolean {
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * The morning summary goes out only in the morning: from the end of quiet
 * hours until noon (or for 3 hours if quiet hours end after noon). If the
 * window is missed, nothing is sent that day; a "good morning" at night
 * is worse than none.
 */
export function inMorningWindow(now: string, prefs: Pick<NotificationPrefs, "quiet_start" | "quiet_end">): boolean {
  if (isQuietTime(now, prefs.quiet_start, prefs.quiet_end)) return false;
  const start = prefs.quiet_end;
  const end = start < "12:00" ? "12:00" : addMinutes(start, 180);
  return now >= start && now < end;
}

/** Daytime window for non-urgent daily reminders (e.g. overdue tasks). */
export function inDaytime(now: string, from = "09:00", to = "21:00"): boolean {
  return now >= from && now < to;
}

export interface UpcomingEventInput {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  busy: boolean;
}

/** Timed, busy events starting within the next `withinMinutes` (not already started). */
export function eventsStartingSoon<T extends UpcomingEventInput>(
  events: T[],
  nowMs: number,
  withinMinutes: number,
): T[] {
  const until = nowMs + withinMinutes * 60_000;
  return events.filter((e) => {
    if (e.allDay || !e.busy) return false;
    const start = Date.parse(e.start);
    return start > nowMs && start <= until;
  });
}
