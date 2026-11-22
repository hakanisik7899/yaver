import { describe, expect, it } from "vitest";
import { addressesIn, buildReplyRaw, encodeHeader, replySubject } from "./gmail-draft";

const decode = (raw: string) => Buffer.from(raw, "base64url").toString("utf8");

describe("addressesIn", () => {
  it("collects unique lower-cased addresses from several headers", () => {
    expect(
      addressesIn('"Ayşe Yılmaz" <Ayse@Firma.com.tr>', "ben@gmail.com, Ali <ali@x.io>", "ayse@firma.com.tr"),
    ).toEqual(["ayse@firma.com.tr", "ben@gmail.com", "ali@x.io"]);
  });
  it("returns nothing for empty headers", () => {
    expect(addressesIn("", "")).toEqual([]);
  });
});

describe("replySubject", () => {
  it("adds Re: once", () => {
    expect(replySubject("Toplantı")).toBe("Re: Toplantı");
    expect(replySubject("RE: Toplantı")).toBe("RE: Toplantı");
    expect(replySubject("Ynt: Teklif")).toBe("Ynt: Teklif");
  });
  it("keeps forwards as the subject of a reply", () => {
    expect(replySubject("Fwd: Rapor")).toBe("Re: Fwd: Rapor");
  });
  it("strips line breaks", () => {
    expect(replySubject("a\r\nBcc: x@y.com")).toBe("Re: a Bcc: x@y.com");
  });
});

describe("encodeHeader", () => {
  it("leaves ASCII alone and encodes Turkish text", () => {
    expect(encodeHeader("Re: Meeting")).toBe("Re: Meeting");
    const enc = encodeHeader("Re: Toplantı");
    expect(enc).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    expect(Buffer.from(enc.slice(10, -2), "base64").toString("utf8")).toBe("Re: Toplantı");
  });
});

describe("buildReplyRaw", () => {
  it("builds a threaded UTF-8 plain-text message", () => {
    const msg = decode(
      buildReplyRaw({
        to: "ayse@firma.com.tr",
        subject: "Re: Toplantı",
        body: "Merhaba Ayşe Hanım,\nPerşembe uygun.\n\nHakan",
        inReplyTo: "<abc@mail.gmail.com>",
        references: "<root@x>",
      }),
    );
    const [head, body] = msg.split("\r\n\r\n");
    expect(head).toContain("To: ayse@firma.com.tr");
    expect(head).toContain("In-Reply-To: <abc@mail.gmail.com>");
    expect(head).toContain("References: <root@x> <abc@mail.gmail.com>");
    expect(head).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString("utf8")).toBe(
      "Merhaba Ayşe Hanım,\r\nPerşembe uygun.\r\n\r\nHakan",
    );
  });
  it("does not repeat the parent id already in References", () => {
    const msg = decode(buildReplyRaw({ to: "a@b.co", subject: "Re: x", body: "ok", inReplyTo: "<p@x>", references: "<r@x> <p@x>" }));
    expect(msg).toContain("References: <r@x> <p@x>\r\n");
  });
  it("omits threading headers without a parent id and blocks header injection", () => {
    const msg = decode(buildReplyRaw({ to: "a@b.co\r\nBcc: evil@x.com", subject: "x", body: "ok" }));
    expect(msg).not.toContain("In-Reply-To");
    expect(msg).not.toMatch(/\r\nBcc:/);
  });
});
