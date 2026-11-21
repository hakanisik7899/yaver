import "server-only";
import { z } from "zod";
import { createEvent, listEvents } from "@/lib/google/calendar";
import { computeFreeSlots } from "@/lib/google/free-slots";
import {
  DATE_REGEX,
  TIME_REGEX,
  USER_UTC_OFFSET,
  dayStart,
  daySpan,
  formatTime,
  nextDayStart,
} from "@/lib/time";
import { defineTool } from "../registry";

const MAX_RANGE_DAYS = 31;

export const listCalendarEvents = defineTool({
  name: "list_calendar_events",
  description:
    "Lists events on the user's Google Calendar between two dates (inclusive, " +
    "user's local time). Use for questions about meetings, schedule or plans. " +
    `At most ${MAX_RANGE_DAYS} days per call.`,
  kind: "read",
  input: z.strictObject({
    start_date: z.string().regex(DATE_REGEX).describe("First day, YYYY-MM-DD"),
    end_date: z.string().regex(DATE_REGEX).describe("Last day, YYYY-MM-DD"),
  }),
  summarize: (i) => `Takvim okundu: ${i.start_date} – ${i.end_date}`,
  async execute(ctx, i) {
    const span = daySpan(i.start_date, i.end_date);
    if (span < 1) throw new Error("end_date, start_date'ten önce olamaz.");
    if (span > MAX_RANGE_DAYS) throw new Error(`En fazla ${MAX_RANGE_DAYS} günlük aralık okunabilir.`);

    const events = await listEvents(ctx.userId, dayStart(i.start_date), nextDayStart(i.end_date));
    return { count: events.length, events };
  },
});

export const findFreeSlots = defineTool({
  name: "find_free_slots",
  description:
    "Finds free time blocks on one day of the user's calendar, within working " +
    "hours (default 08:00–20:00). Use to suggest when to schedule work, sport, " +
    "preparation or family time.",
  kind: "read",
  input: z.strictObject({
    date: z.string().regex(DATE_REGEX).describe("Day to check, YYYY-MM-DD"),
    min_minutes: z.number().int().min(10).max(600).describe("Minimum slot length in minutes"),
    day_start: z.string().regex(TIME_REGEX).optional().describe("Window start HH:MM, default 08:00"),
    day_end: z.string().regex(TIME_REGEX).optional().describe("Window end HH:MM, default 20:00"),
  }),
  summarize: (i) => `Boş zamanlar hesaplandı: ${i.date}`,
  async execute(ctx, i) {
    const from = i.day_start ?? "08:00";
    const to = i.day_end ?? "20:00";
    const windowStart = Date.parse(`${i.date}T${from}:00${USER_UTC_OFFSET}`);
    const windowEnd = Date.parse(`${i.date}T${to}:00${USER_UTC_OFFSET}`);
    if (windowEnd <= windowStart) throw new Error("day_end, day_start'tan sonra olmalı.");

    const events = await listEvents(ctx.userId, dayStart(i.date), nextDayStart(i.date));
    const busy = events
      .filter((e) => e.busy && !e.allDay)
      .map((e) => ({ start: Date.parse(e.start), end: Date.parse(e.end) }));

    const slots = computeFreeSlots(busy, windowStart, windowEnd, i.min_minutes).map((s) => ({
      start: formatTime(new Date(s.start).toISOString()),
      end: formatTime(new Date(s.end).toISOString()),
      minutes: Math.round((s.end - s.start) / 60_000),
    }));
    return { date: i.date, window: `${from}–${to}`, slots };
  },
});

const turkishDay = (date: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(`${date}T00:00:00Z`));

export const createCalendarEvent = defineTool({
  name: "create_calendar_event",
  description:
    "Proposes adding an event to the user's Google Calendar. The event is NOT " +
    "created immediately: it goes to the user's approval list and is created " +
    "only after they approve. No one is invited. Before proposing, check the " +
    "day with list_calendar_events and mention any overlap to the user.",
  kind: "write",
  reversible: true,
  input: z.strictObject({
    title: z.string().trim().min(1).max(200).describe("Event title, in the user's language"),
    date: z.string().regex(DATE_REGEX).describe("Day, YYYY-MM-DD"),
    start_time: z.string().regex(TIME_REGEX).describe("Start, HH:MM local time"),
    end_time: z.string().regex(TIME_REGEX).describe("End, HH:MM local time, same day"),
    location: z.string().max(300).optional().describe("Place, if the user gave one"),
    description: z.string().max(2000).optional().describe("Notes for the event"),
  }).refine((i) => i.end_time > i.start_time, {
    message: "end_time must be after start_time on the same day",
    path: ["end_time"],
  }),
  summarize: (i) =>
    `Takvime ekle: ${i.title} — ${turkishDay(i.date)}, ${i.start_time}–${i.end_time}`,
  async execute(ctx, i) {
    const created = await createEvent(ctx.userId, {
      title: i.title,
      start: `${i.date}T${i.start_time}:00${USER_UTC_OFFSET}`,
      end: `${i.date}T${i.end_time}:00${USER_UTC_OFFSET}`,
      location: i.location,
      description: i.description,
    });
    return { created: true, eventId: created.id, link: created.link };
  },
});
