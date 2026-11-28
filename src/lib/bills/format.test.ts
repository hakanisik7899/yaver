import { describe, expect, it } from "vitest";
import { dueLabel, formatMoney, shortDate } from "./format";

describe("shortDate", () => {
  it("formats in Türkiye time and tolerates missing values", () => {
    // 22:30 UTC on the 24th is already the 25th in Türkiye (UTC+3).
    expect(shortDate("2026-11-24T22:30:00Z")).toMatch(/^25 Kas/);
    expect(shortDate(null)).toBeNull();
    expect(shortDate("nope")).toBeNull();
  });
});

describe("formatMoney", () => {
  it("formats Turkish lira with Turkish separators", () => {
    expect(formatMoney(1234.5)).toMatch(/^₺?1\.234,50\s?₺?$/);
    expect(formatMoney("456.3")).toMatch(/456,30/);
  });
  it("handles missing amounts and unknown currencies", () => {
    expect(formatMoney(null)).toBe("tutar belirtilmemiş");
    expect(formatMoney(10, "XYZ")).toMatch(/10,00/);
  });
});

describe("dueLabel", () => {
  it("describes the due date relative to today", () => {
    expect(dueLabel("2026-11-22", "2026-11-22")).toBe("bugün");
    expect(dueLabel("2026-11-23", "2026-11-22")).toBe("yarın");
    expect(dueLabel("2026-11-25", "2026-11-22")).toBe("3 gün sonra");
    expect(dueLabel("2026-11-20", "2026-11-22")).toBe("2 gün gecikti");
    expect(dueLabel(null, "2026-11-22")).toBe("son tarih yok");
  });
});
