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
