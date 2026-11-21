export interface Interval {
  start: number; // epoch ms
  end: number;
}

/**
 * Free gaps of at least `minMinutes` inside [windowStart, windowEnd],
 * given busy intervals (which may overlap or extend past the window).
 */
export function computeFreeSlots(
  busy: Interval[],
  windowStart: number,
  windowEnd: number,
  minMinutes: number,
): Interval[] {
  const minMs = minMinutes * 60_000;
  const clipped = busy
    .map((b) => ({ start: Math.max(b.start, windowStart), end: Math.min(b.end, windowEnd) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const free: Interval[] = [];
  let cursor = windowStart;
  for (const b of clipped) {
    if (b.start - cursor >= minMs) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (windowEnd - cursor >= minMs) free.push({ start: cursor, end: windowEnd });
  return free;
}
