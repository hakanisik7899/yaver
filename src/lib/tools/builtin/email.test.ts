import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/google/gmail", () => ({}));
vi.mock("@/lib/google/gmail-draft", () => ({}));
import { createEmailReplyDraft } from "./email";

describe("create_email_reply_draft input", () => {
  it("accepts a plain address and rejects anything else", () => {
    const ok = { message_id: "m1", to: "ayse@firma.com.tr", body: "Merhaba" };
    expect(createEmailReplyDraft.input.safeParse(ok).success).toBe(true);
    expect(createEmailReplyDraft.input.safeParse({ ...ok, to: "Ayşe <ayse@firma.com.tr>" }).success).toBe(false);
    expect(createEmailReplyDraft.input.safeParse({ ...ok, to: "a@b.co\r\nBcc: x@y.z" }).success).toBe(false);
  });
  it("is sensitive and never auto", () => {
    expect(createEmailReplyDraft.kind).toBe("write");
    expect(createEmailReplyDraft.sensitive).toBe(true);
  });
});
