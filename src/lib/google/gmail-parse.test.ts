import { describe, expect, it } from "vitest";
import { attachmentNames, extractBody, header, htmlToText } from "./gmail-parse";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("extractBody", () => {
  it("prefers text/plain and decodes Turkish characters", () => {
    const payload = {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64url("Fatura tutarı: 456,30 TL\nSon ödeme: 25.11.2026") } },
        { mimeType: "text/html", body: { data: b64url("<p>ignored</p>") } },
      ],
    };
    expect(extractBody(payload)).toBe("Fatura tutarı: 456,30 TL\nSon ödeme: 25.11.2026");
  });

  it("falls back to HTML converted to text, skipping attachments", () => {
    const payload = {
      mimeType: "multipart/mixed",
      parts: [
        { mimeType: "text/html", body: { data: b64url("<style>x{}</style><div>Tutar&nbsp;<b>120 TL</b></div><br>Teşekkürler") } },
        { mimeType: "application/pdf", filename: "fatura.pdf", body: { size: 1000 } },
      ],
    };
    expect(extractBody(payload)).toBe("Tutar 120 TL\nTeşekkürler");
    expect(attachmentNames(payload)).toEqual(["fatura.pdf"]);
  });
});

describe("header / htmlToText", () => {
  it("reads headers case-insensitively", () => {
    expect(header({ headers: [{ name: "Subject", value: "Kasım faturanız" }] }, "subject")).toBe("Kasım faturanız");
  });
  it("drops scripts", () => {
    expect(htmlToText("<script>alert(1)</script>Merhaba")).toBe("Merhaba");
  });
});
