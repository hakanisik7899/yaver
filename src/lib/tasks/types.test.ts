import { describe, expect, it } from "vitest";
import { groupOf, sortTasks } from "./types";

const t = (due_date: string | null, priority: "low" | "normal" | "high" = "normal", created_at = "2026-11-01") => ({
  due_date,
  priority,
  created_at,
});

describe("groupOf", () => {
  it("buckets by due date relative to today", () => {
    expect(groupOf(t("2026-11-20"), "2026-11-21")).toBe("overdue");
    expect(groupOf(t("2026-11-21"), "2026-11-21")).toBe("today");
    expect(groupOf(t("2026-11-25"), "2026-11-21")).toBe("upcoming");
    expect(groupOf(t(null), "2026-11-21")).toBe("someday");
  });
});

describe("sortTasks", () => {
  it("orders by due date, then priority, with undated tasks last", () => {
    const sorted = sortTasks([
      t(null, "high"),
      t("2026-11-25", "low"),
      t("2026-11-22", "normal"),
      t("2026-11-22", "high"),
    ]);
    expect(sorted.map((s) => `${s.due_date}:${s.priority}`)).toEqual([
      "2026-11-22:high",
      "2026-11-22:normal",
      "2026-11-25:low",
      "null:high",
    ]);
  });
});
