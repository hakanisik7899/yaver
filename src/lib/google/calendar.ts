import "server-only";
import { USER_TZ } from "@/lib/time";
import { getGoogleAccessToken } from "./oauth";

export interface CalendarEvent {
  title: string;
  /** RFC 3339 for timed events, YYYY-MM-DD for all-day events. */
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  attendeeCount?: number;
  hasVideoCall: boolean;
  /** "busy" blocks time; "free" (transparent) events do not. */
  busy: boolean;
}

interface GoogleEvent {
  status?: string;
  summary?: string;
  location?: string;
  transparency?: string;
  hangoutLink?: string;
  conferenceData?: unknown;
  attendees?: unknown[];
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export class CalendarWriteNotAllowedError extends Error {
  constructor() {
    super(
      "Takvime yazma izni yok. Yaver'e bu izni vermek için çıkış yapıp tekrar Google ile giriş yap.",
    );
  }
}

export interface NewEvent {
  title: string;
  /** RFC 3339 with offset. */
  start: string;
  end: string;
  description?: string;
  location?: string;
}

/**
 * Creates an event on the primary calendar. Never invites anyone: sending
 * invitations would email other people and needs its own sensitive tool.
 */
export async function createEvent(
  userId: string,
  event: NewEvent,
): Promise<{ id: string; link: string }> {
  const token = await getGoogleAccessToken(userId);
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: event.title,
        description: event.description,
        location: event.location,
        start: { dateTime: event.start, timeZone: USER_TZ },
        end: { dateTime: event.end, timeZone: USER_TZ },
      }),
    },
  );
  // 403 here means the token was granted before calendar.events was added.
  if (res.status === 403) throw new CalendarWriteNotAllowedError();
  if (!res.ok) throw new Error(`Etkinlik oluşturulamadı (${res.status})`);

  const json = (await res.json()) as { id: string; htmlLink: string };
  return { id: json.id, link: json.htmlLink };
}

/** Events on the user's primary calendar in [timeMin, timeMax). */
export async function listEvents(
  userId: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const token = await getGoogleAccessToken(userId);
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    timeZone: USER_TZ,
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Google Takvim okunamadı (${res.status})`);

  const json = (await res.json()) as { items?: GoogleEvent[] };
  return (json.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const allDay = !e.start?.dateTime;
      return {
        title: e.summary?.trim() || "(Başlıksız)",
        start: e.start?.dateTime ?? e.start?.date ?? "",
        end: e.end?.dateTime ?? e.end?.date ?? "",
        allDay,
        location: e.location,
        attendeeCount: e.attendees?.length,
        hasVideoCall: Boolean(e.hangoutLink || e.conferenceData),
        busy: e.transparency !== "transparent",
      };
    });
}
