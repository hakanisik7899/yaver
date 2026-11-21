export type NotificationKind = "briefing" | "meetings" | "overdue_tasks" | "approvals";

export interface NotificationPrefs {
  briefing: boolean;
  meetings: boolean;
  overdue_tasks: boolean;
  approvals: boolean;
  quiet_start: string; // "HH:MM" local time
  quiet_end: string;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  briefing: true,
  meetings: true,
  overdue_tasks: true,
  approvals: true,
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

/** True once the quiet window has ended for the day (and before it starts again). */
export function isAfterMorning(now: string, prefs: Pick<NotificationPrefs, "quiet_start" | "quiet_end">): boolean {
  return !isQuietTime(now, prefs.quiet_start, prefs.quiet_end) && now >= prefs.quiet_end;
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
