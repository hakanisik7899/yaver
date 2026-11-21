import { describe, expect, it } from "vitest";
import { computeFreeSlots } from "./free-slots";

const h = (hour: number, min = 0) => Date.UTC(2026, 10, 21, hour, min);

describe("computeFreeSlots", () => {
  it("returns the whole window when there are no events", () => {
    expect(computeFreeSlots([], h(8), h(20), 30)).toEqual([{ start: h(8), end: h(20) }]);
  });

  it("merges overlapping events and skips gaps shorter than the minimum", () => {
    const busy = [
      { start: h(9), end: h(10) },
      { start: h(9, 30), end: h(11) }, // overlaps the first
      { start: h(11, 15), end: h(12) }, // leaves a 15 min gap
      { start: h(14), end: h(15) },
    ];
    expect(computeFreeSlots(busy, h(8), h(18), 30)).toEqual([
      { start: h(8), end: h(9) },
      { start: h(12), end: h(14) },
      { start: h(15), end: h(18) },
    ]);
  });

  it("clips events that extend past the window", () => {
    const busy = [
      { start: h(6), end: h(9) },
      { start: h(19), end: h(23) },
    ];
    expect(computeFreeSlots(busy, h(8), h(20), 60)).toEqual([{ start: h(9), end: h(19) }]);
  });

  it("handles a nested event inside a longer one", () => {
    const busy = [
      { start: h(9), end: h(13) },
      { start: h(10), end: h(11) },
    ];
    expect(computeFreeSlots(busy, h(9), h(14), 30)).toEqual([{ start: h(13), end: h(14) }]);
  });
});
