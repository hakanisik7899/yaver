import { describe, expect, it } from "vitest";
import { dueLabel, formatMoney } from "./format";

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
