import { describe, expect, it } from "vitest";
import { eventsStartingSoon, isAfterMorning, isQuietTime, normalizePrefs } from "./rules";

describe("isQuietTime", () => {
  it("handles windows that cross midnight", () => {
    expect(isQuietTime("23:30", "22:00", "07:00")).toBe(true);
    expect(isQuietTime("03:00", "22:00", "07:00")).toBe(true);
    expect(isQuietTime("07:00", "22:00", "07:00")).toBe(false);
    expect(isQuietTime("12:00", "22:00", "07:00")).toBe(false);
  });

  it("handles same-day windows and disabled quiet hours", () => {
    expect(isQuietTime("13:30", "13:00", "14:00")).toBe(true);
    expect(isQuietTime("14:00", "13:00", "14:00")).toBe(false);
    expect(isQuietTime("03:00", "00:00", "00:00")).toBe(false);
  });
});

describe("isAfterMorning", () => {
  const prefs = { quiet_start: "22:00", quiet_end: "07:00" };
  it("is true from the end of quiet hours until they start again", () => {
    expect(isAfterMorning("06:59", prefs)).toBe(false);
    expect(isAfterMorning("07:00", prefs)).toBe(true);
    expect(isAfterMorning("21:59", prefs)).toBe(true);
    expect(isAfterMorning("22:30", prefs)).toBe(false);
  });
});

describe("normalizePrefs", () => {
  it("fills defaults and trims Postgres seconds", () => {
    expect(normalizePrefs({ quiet_start: "23:00:00", meetings: false })).toMatchObject({
      quiet_start: "23:00",
      quiet_end: "07:00",
      meetings: false,
      briefing: true,
    });
  });
});

describe("eventsStartingSoon", () => {
  const now = Date.parse("2026-11-23T09:50:00+03:00");
  const ev = (id: string, start: string, extra = {}) => ({ id, title: id, start, allDay: false, busy: true, ...extra });

  it("returns timed busy events starting within the window, not ones already started", () => {
    const events = [
      ev("started", "2026-11-23T09:45:00+03:00"),
      ev("soon", "2026-11-23T10:00:00+03:00"),
      ev("edge", "2026-11-23T10:10:00+03:00"),
      ev("later", "2026-11-23T10:11:00+03:00"),
      ev("allday", "2026-11-23", { allDay: true }),
      ev("free", "2026-11-23T10:00:00+03:00", { busy: false }),
    ];
    expect(eventsStartingSoon(events, now, 20).map((e) => e.id)).toEqual(["soon", "edge"]);
  });
});
