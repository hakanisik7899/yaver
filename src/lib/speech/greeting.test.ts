import { describe, expect, it } from "vitest";
import { greetingText } from "./greeting";

describe("greetingText", () => {
  it("greets the signed-in user by first name", () => {
    expect(greetingText("Hakan")).toBe("Merhaba, Hakan! Ben asistanın Yaver! Bugün ne yapalım?");
    expect(greetingText("  Şükrü Can ")).toBe("Merhaba, Şükrü! Ben asistanın Yaver! Bugün ne yapalım?");
  });

  it("falls back to a plain hello without a usable name", () => {
    expect(greetingText(undefined)).toBe("Merhaba! Ben asistanın Yaver! Bugün ne yapalım?");
    expect(greetingText("")).toBe("Merhaba! Ben asistanın Yaver! Bugün ne yapalım?");
    expect(greetingText("😀")).toBe("Merhaba! Ben asistanın Yaver! Bugün ne yapalım?");
  });
});
