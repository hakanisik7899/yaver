/**
 * Yaver is Turkey-first. Türkiye has used fixed UTC+3 with no DST since
 * 2016, so a constant offset is exact. Revisit when users in other time
 * zones arrive (store a per-user tz in the profile).
 */
export const USER_TZ = "Europe/Istanbul";
export const USER_UTC_OFFSET = "+03:00";

/** "2026-11-21" -> start of that day in the user's zone, as RFC 3339. */
export function dayStart(date: string): string {
  return `${date}T00:00:00${USER_UTC_OFFSET}`;
}

/** "2026-11-21" -> start of the next day in the user's zone, as RFC 3339. */
export function nextDayStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.toISOString().slice(0, 10)}T00:00:00${USER_UTC_OFFSET}`;
}

/** Days between two YYYY-MM-DD dates, inclusive. */
export function daySpan(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Formats an instant as "HH:MM" in the user's zone. */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: USER_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "2026-11-21" + 3 -> "2026-11-24". */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in the user's zone, YYYY-MM-DD. */
export function todayLocal(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: USER_TZ }).format(new Date());
}

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
