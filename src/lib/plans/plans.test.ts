import { describe, expect, it } from "vitest";
import { effectivePlan, webSearchAllowance } from "./plans";

describe("effectivePlan", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");
  it("defaults to free", () => {
    expect(effectivePlan(null, now)).toBe("free");
    expect(effectivePlan({ plan: "free", pro_until: null }, now)).toBe("free");
    expect(effectivePlan({ plan: "enterprise", pro_until: null }, now)).toBe("free");
  });
  it("is pro without an end date or before it", () => {
    expect(effectivePlan({ plan: "pro", pro_until: null }, now)).toBe("pro");
    expect(effectivePlan({ plan: "pro", pro_until: "2026-12-01T00:00:00Z" }, now)).toBe("pro");
  });
  it("falls back to free after the end date", () => {
    expect(effectivePlan({ plan: "pro", pro_until: "2026-11-22T11:59:59Z" }, now)).toBe("free");
  });
});

describe("webSearchAllowance", () => {
  it("caps by the per-request maximum and what is left today", () => {
    expect(webSearchAllowance("free", 0)).toBe(2);
    expect(webSearchAllowance("free", 1)).toBe(1);
    expect(webSearchAllowance("free", 2)).toBe(0);
    expect(webSearchAllowance("free", 5)).toBe(0);
    expect(webSearchAllowance("pro", 0)).toBe(5);
    expect(webSearchAllowance("pro", 18)).toBe(2);
  });
});
