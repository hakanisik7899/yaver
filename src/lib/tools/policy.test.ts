import { describe, expect, it } from "vitest";
import { allowedModes, decide, defaultMode, effectiveMode } from "./policy";
import type { PermissionMode } from "./types";

const read = { kind: "read" as const };
const write = { kind: "write" as const };
const internal = { kind: "write" as const, autoByDefault: true };
const sensitive = { kind: "write" as const, sensitive: true };

describe("Trust Center modes", () => {
  it("offers on/off for reads and never auto for sensitive writes", () => {
    expect(allowedModes(read)).toEqual(["auto", "deny"]);
    expect(allowedModes(write)).toEqual(["auto", "ask", "deny"]);
    expect(allowedModes(sensitive)).toEqual(["ask", "deny"]);
  });

  it("reports the default the policy applies without a user setting", () => {
    expect(defaultMode(read)).toBe("auto");
    expect(defaultMode(write)).toBe("ask");
    expect(defaultMode(internal)).toBe("auto");
    expect(defaultMode(sensitive)).toBe("ask");
    expect(defaultMode({ ...internal, sensitive: true })).toBe("ask");
  });

  it("shows exactly what decide() enforces, for every tool and setting", () => {
    const modes: (PermissionMode | undefined)[] = [undefined, "auto", "ask", "deny"];
    for (const tool of [read, write, internal, sensitive]) {
      for (const m of modes) {
        const d = decide(tool, m);
        const expected = d.run === "deny" ? "deny" : d.run === "ask" ? "ask" : "auto";
        expect(effectiveMode(tool, m)).toBe(expected);
      }
      expect(effectiveMode(tool, undefined)).toBe(defaultMode(tool));
    }
  });

  it("ignores a stored 'auto' on a sensitive tool", () => {
    expect(effectiveMode(sensitive, "auto")).toBe("ask");
  });
});
