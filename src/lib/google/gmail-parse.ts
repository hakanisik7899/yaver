/** Pure helpers for Gmail API payloads (testable without network). */

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number; attachmentId?: string };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}

export function decodeBase64Url(data: string): string {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64").toString("utf8");
}

export function header(part: GmailPart | undefined, name: string): string {
  const h = part?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/** Rough HTML → text: drops tags, styles and scripts, decodes common entities. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Plain-text body: prefers text/plain parts, falls back to text/html. */
export function extractBody(payload: GmailPart | undefined): string {
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (p?: GmailPart) => {
    if (!p) return;
    if (p.body?.data && !p.filename) {
      if (p.mimeType === "text/plain") plain.push(decodeBase64Url(p.body.data));
      else if (p.mimeType === "text/html") html.push(decodeBase64Url(p.body.data));
    }
    p.parts?.forEach(walk);
  };
  walk(payload);
  if (plain.length) return plain.join("\n").trim();
  return htmlToText(html.join("\n"));
}

export interface PdfAttachment {
  attachmentId: string;
  filename: string;
  size: number;
}

/** PDF attachments that can be downloaded by id. */
export function pdfAttachments(payload: GmailPart | undefined): PdfAttachment[] {
  const out: PdfAttachment[] = [];
  const walk = (p?: GmailPart) => {
    if (!p) return;
    const isPdf = p.mimeType === "application/pdf" || /\.pdf$/i.test(p.filename ?? "");
    if (isPdf && p.filename && p.body?.attachmentId) {
      out.push({ attachmentId: p.body.attachmentId, filename: p.filename, size: p.body.size ?? 0 });
    }
    p.parts?.forEach(walk);
  };
  walk(payload);
  return out;
}

export const MAX_PDF_BYTES = 5 * 1024 * 1024;
const BILL_NAME = /fatura|e-?ar[sş]iv|ekstre|hesap.?[öo]zet|invoice|bill|statement/i;

/**
 * The PDF most likely to be the bill: small enough to send, preferring
 * names like "fatura", "e-arşiv", "ekstre". Null if none fits.
 */
export function pickBillPdf(pdfs: PdfAttachment[]): PdfAttachment | null {
  const sendable = pdfs.filter((p) => p.size > 0 && p.size <= MAX_PDF_BYTES);
  return sendable.find((p) => BILL_NAME.test(p.filename)) ?? sendable[0] ?? null;
}

export function attachmentNames(payload: GmailPart | undefined): string[] {
  const names: string[] = [];
  const walk = (p?: GmailPart) => {
    if (!p) return;
    if (p.filename) names.push(p.filename);
    p.parts?.forEach(walk);
  };
  walk(payload);
  return names;
}
