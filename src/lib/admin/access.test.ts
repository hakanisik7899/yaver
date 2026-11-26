import { describe, expect, it } from "vitest";
import { isAdminEmail } from "./access";

describe("isAdminEmail", () => {
  it("matches case-insensitively in a comma-separated list", () => {
    expect(isAdminEmail("Ben@Gmail.com", "ben@gmail.com, diger@x.io")).toBe(true);
    expect(isAdminEmail("diger@x.io", "ben@gmail.com,diger@x.io")).toBe(true);
  });
  it("denies everyone when the list is empty or the email is missing", () => {
    expect(isAdminEmail("ben@gmail.com", "")).toBe(false);
    expect(isAdminEmail("ben@gmail.com", " , ")).toBe(false);
    expect(isAdminEmail(undefined, "ben@gmail.com")).toBe(false);
  });
  it("does not match partial addresses", () => {
    expect(isAdminEmail("en@gmail.com", "ben@gmail.com")).toBe(false);
  });
});
