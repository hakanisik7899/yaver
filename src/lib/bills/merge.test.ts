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
  status: "unpaid",
  ...over,
});

describe("needsPdf", () => {
  it("asks for the PDF when the text misses the amount or date", () => {
    expect(needsPdf(null)).toBe(true);
    expect(needsPdf(bill({ due_date: "2026-11-30" }))).toBe(true);
    expect(needsPdf(bill({ amount: 742.18 }))).toBe(true);
    expect(needsPdf(bill({ amount: 742.18, due_date: "2026-11-30" }))).toBe(false);
  });

  it("does not need a due date for an already charged receipt", () => {
    const receipt = bill({ provider: "Anthropic, PBC", category: "diger", currency: "USD", status: "paid" });
    expect(needsPdf({ ...receipt, amount: 21.6 })).toBe(false);
    expect(needsPdf(receipt)).toBe(true);
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

  it("keeps the bill paid if either side says it was charged", () => {
    expect(mergeBills(bill({ status: "paid" }), bill({ amount: 20 }))?.status).toBe("paid");
    expect(mergeBills(bill({}), bill({ amount: 20, status: "paid" }))?.status).toBe("paid");
    expect(mergeBills(bill({}), bill({ amount: 20 }))?.status).toBe("unpaid");
  });

  it("uses whichever side exists", () => {
    const only = bill({ amount: 1 });
    expect(mergeBills(null, only)).toBe(only);
    expect(mergeBills(only, null)).toBe(only);
    expect(mergeBills(null, null)).toBeNull();
  });
});
