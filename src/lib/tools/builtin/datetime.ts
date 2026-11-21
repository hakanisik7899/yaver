import { z } from "zod";
import { USER_TZ } from "@/lib/time";
import { defineTool } from "../registry";

export const getCurrentDatetime = defineTool({
  name: "get_current_datetime",
  label: "Tarih ve saati okuma",
  description:
    "Returns the current date, time and weekday in the user's time zone. " +
    "Call this before reasoning about 'today', 'tomorrow' or 'this week'.",
  kind: "read",
  input: z.strictObject({}),
  summarize: () => "Güncel tarih ve saat okundu",
  async execute() {
    const now = new Date();
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("tr-TR", { timeZone: USER_TZ, ...opts }).format(now);
    return {
      iso: now.toISOString(),
      // en-CA formats as YYYY-MM-DD, the format the calendar tools expect.
      date: new Intl.DateTimeFormat("en-CA", { timeZone: USER_TZ }).format(now),
      timeZone: USER_TZ,
      readable: fmt({ year: "numeric", month: "long", day: "numeric", weekday: "long" }),
      time: fmt({ hour: "2-digit", minute: "2-digit" }),
    };
  },
});
