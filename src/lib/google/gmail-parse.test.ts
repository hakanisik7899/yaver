import { describe, expect, it } from "vitest";
import { attachmentNames, extractBody, header, htmlToText, MAX_PDF_BYTES, pdfAttachments, pickBillPdf } from "./gmail-parse";

describe("pdfAttachments / pickBillPdf", () => {
  const payload = {
    mimeType: "multipart/mixed",
    parts: [
      { mimeType: "text/plain", body: { data: "eA" } },
      { mimeType: "application/pdf", filename: "kampanya.pdf", body: { attachmentId: "a1", size: 2000 } },
      { mimeType: "application/octet-stream", filename: "E-Arsiv_Fatura_2026.PDF", body: { attachmentId: "a2", size: 90_000 } },
      { mimeType: "image/png", filename: "logo.png", body: { attachmentId: "a3", size: 500 } },
    ],
  };

  it("finds PDFs by mime type or extension", () => {
    expect(pdfAttachments(payload).map((p) => p.attachmentId)).toEqual(["a1", "a2"]);
  });

  it("prefers bill-like names and skips oversized files", () => {
    expect(pickBillPdf(pdfAttachments(payload))?.attachmentId).toBe("a2");
    expect(pickBillPdf([{ attachmentId: "big", filename: "fatura.pdf", size: MAX_PDF_BYTES + 1 }])).toBeNull();
    expect(pickBillPdf([{ attachmentId: "x", filename: "belge.pdf", size: 100 }])?.attachmentId).toBe("x");
    expect(pickBillPdf([])).toBeNull();
  });

  it("prefers the invoice over the receipt in English mails (e.g. Anthropic, PBC)", () => {
    const pdfs = [
      { attachmentId: "r", filename: "Receipt-2481-0093.pdf", size: 40_000 },
      { attachmentId: "i", filename: "Invoice-AB12CD-0007.pdf", size: 40_000 },
    ];
    expect(pickBillPdf(pdfs)?.attachmentId).toBe("i");
    expect(pickBillPdf([{ attachmentId: "x", filename: "brosur.pdf", size: 9 }, pdfs[0]])?.attachmentId).toBe("r");
  });
});

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
