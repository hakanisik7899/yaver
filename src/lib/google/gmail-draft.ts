/** Pure helpers for building Gmail reply drafts (testable without network). */

const EMAIL_RE = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Lower-cased email addresses found in address headers (From, To, Cc...). */
export function addressesIn(...headers: string[]): string[] {
  const found = headers.flatMap((h) => h.match(EMAIL_RE) ?? []);
  return [...new Set(found.map((a) => a.toLowerCase()))];
}

/** Header values must never carry line breaks (header injection). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

/** "Re: <subject>", without stacking prefixes (Re:, RE:, Ynt:, Cvp:, AW:, Fwd: stays). */
export function replySubject(subject: string): string {
  const s = oneLine(subject);
  if (/^(re|ynt|cvp|aw|sv)\s*:/i.test(s)) return s;
  return s ? `Re: ${s}` : "Re:";
}

/** RFC 2047 encoded-word for non-ASCII header text (UTF-8, base64). */
export function encodeHeader(text: string): string {
  const s = oneLine(text);
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}

export interface ReplyDraft {
  to: string;
  subject: string;
  body: string;
  /** Message-ID of the email being answered, so Gmail threads the reply. */
  inReplyTo?: string;
  references?: string;
}

/** Full RFC 2822 message, base64url-encoded as Gmail's `raw` field expects. */
export function buildReplyRaw(d: ReplyDraft): string {
  const headers = [
    `To: ${oneLine(d.to)}`,
    `Subject: ${encodeHeader(d.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  const inReplyTo = d.inReplyTo ? oneLine(d.inReplyTo) : "";
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    const refs = oneLine(d.references ?? "");
    headers.push(`References: ${refs.includes(inReplyTo) ? refs : oneLine(`${refs} ${inReplyTo}`)}`);
  }
  const body = Buffer.from(d.body.replace(/\r?\n/g, "\r\n"), "utf8")
    .toString("base64")
    .replace(/.{76}/g, "$&\r\n");
  const message = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(message, "utf8").toString("base64url");
}
