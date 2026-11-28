import { describe, expect, it } from "vitest";
import { billRefKey, billReminders, type DueBill } from "./bill-reminders";

const today = "2026-11-28";
const bill = (id: string, due_date: string, provider = id): DueBill => ({ id, provider, amount: 100, currency: "TRY", due_date });

describe("billReminders", () => {
  it("reminds 1-3 days before and again on the last day", () => {
    const out = billReminders([bill("enerjisa", "2026-11-30", "Enerjisa"), bill("igdas", "2026-11-28", "İGDAŞ")], today, new Set());
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe("Bugün son gün: İGDAŞ faturası");
    expect(out[0].refKeys).toEqual(["igdas:due"]);
    expect(out[1].title).toBe("Enerjisa faturası: son ödeme 2 gün sonra");
    expect(out[1].refKeys).toEqual(["enerjisa"]);
  });

  it("lists several bills of a stage in one notification, soonest first", () => {
    const out = billReminders([bill("b", "2026-12-01", "Turkcell"), bill("a", "2026-11-29", "Enerjisa")], today, new Set());
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("2 faturanın son ödeme günü yaklaşıyor");
    expect(out[0].body.split("\n")).toEqual([expect.stringMatching(/^Enerjisa · .* · yarın$/), expect.stringMatching(/^Turkcell · .* · 3 gün sonra$/)]);
    expect(out[0].refKeys).toEqual(["a", "b"]);
  });

  it("skips bills already reminded at that stage and ones outside the window", () => {
    const bills = [bill("a", "2026-11-29"), bill("b", "2026-11-28"), bill("far", "2026-12-05"), bill("late", "2026-11-27")];
    const out = billReminders(bills, today, new Set([billRefKey("a", "early"), billRefKey("b", "due")]));
    expect(out).toEqual([]);
  });
});
