import { describe, expect, it } from "vitest";
import type { ExtractedBill } from "./extract";
import { mergeBills, needsPdf } from "./merge";

const bill = (over: Partial<ExtractedBill>): ExtractedBill => ({
  provider: "İGDAŞ",
  category: "dogalgaz",
  amount: null,
  currency: "TRY",
  due_date: null,
  period: null,
  ...over,
});

describe("needsPdf", () => {
  it("asks for the PDF when the text misses the amount or date", () => {
    expect(needsPdf(null)).toBe(true);
    expect(needsPdf(bill({ due_date: "2026-11-30" }))).toBe(true);
    expect(needsPdf(bill({ amount: 742.18 }))).toBe(true);
    expect(needsPdf(bill({ amount: 742.18, due_date: "2026-11-30" }))).toBe(false);
  });
});

describe("mergeBills", () => {
  it("fills missing fields from the PDF and keeps what the text already had", () => {
    const fromText = bill({ due_date: "2026-11-30", category: "diger" });
    const fromPdf = bill({ amount: 742.18, due_date: "2026-12-01", period: "Kasım 2026" });
    expect(mergeBills(fromText, fromPdf)).toEqual(
      bill({ amount: 742.18, due_date: "2026-11-30", period: "Kasım 2026", category: "dogalgaz" }),
    );
  });

  it("uses whichever side exists", () => {
    const only = bill({ amount: 1 });
    expect(mergeBills(null, only)).toBe(only);
    expect(mergeBills(only, null)).toBe(only);
    expect(mergeBills(null, null)).toBeNull();
  });
});
