import "server-only";
import {
  attachmentNames,
  extractBody,
  header,
  pdfAttachments,
  type GmailPart,
  type PdfAttachment,
} from "./gmail-parse";
import { getGoogleAccessToken } from "./oauth";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export class GmailNotAllowedError extends Error {
  constructor(what = "E-postalarını okuma") {
    super(`${what} izni yok. Yaver'e bu izni vermek için çıkış yapıp tekrar Google ile giriş yap.`);
  }
}

async function gmailFetch(userId: string, path: string, init?: { method: "POST"; body: unknown }) {
  const token = await getGoogleAccessToken(userId);
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init ? { "Content-Type": "application/json" } : {}),
    },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { status?: string; errors?: { reason?: string }[] };
    };
    const reason = body.error?.errors?.[0]?.reason ?? body.error?.status;
    // The Gmail API is switched off in the Google Cloud project: not the
    // user's permission, so signing in again would not help.
    if (reason === "accessNotConfigured" || reason === "SERVICE_DISABLED") {
      throw new Error(
        "Gmail API, Google Cloud projesinde kapalı. Google Cloud Console → APIs & Services → Library → Gmail API → Enable ile açılmalı.",
      );
    }
    // Otherwise the token lacks the scope (granted before it was added or
    // unticked on the consent screen).
    throw new GmailNotAllowedError(init ? "Gmail'de taslak oluşturma" : undefined);
  }
  if (!res.ok) throw new Error(init ? `Gmail taslağı oluşturulamadı (${res.status})` : `Gmail okunamadı (${res.status})`);
  return res.json();
}

export interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

export interface EmailFull extends EmailSummary {
  body: string;
  attachments: string[];
  pdfs: PdfAttachment[];
}

/** Downloads one attachment; returns standard base64 (as the Claude API expects). */
export async function getAttachmentBase64(userId: string, messageId: string, attachmentId: string): Promise<string> {
  const json = (await gmailFetch(userId, `/messages/${messageId}/attachments/${attachmentId}`)) as { data?: string };
  if (!json.data) throw new Error("Ek indirilemedi.");
  // Gmail returns base64url; the Claude API wants standard base64.
  return json.data.replace(/-/g, "+").replace(/_/g, "/");
}

/** Message ids matching a Gmail search query (Gmail search syntax). */
export async function searchMessageIds(userId: string, query: string, max: number): Promise<string[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(max) });
  const json = (await gmailFetch(userId, `/messages?${params}`)) as { messages?: { id: string }[] };
  return (json.messages ?? []).map((m) => m.id);
}

export async function getEmailSummary(userId: string, id: string): Promise<EmailSummary> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Subject", "Date"]) params.append("metadataHeaders", h);
  const m = (await gmailFetch(userId, `/messages/${id}?${params}`)) as { id: string; snippet?: string; payload?: GmailPart };
  return {
    id: m.id,
    from: header(m.payload, "From"),
    subject: header(m.payload, "Subject"),
    date: header(m.payload, "Date"),
    snippet: m.snippet ?? "",
  };
}

/** Full message as text. `maxChars` caps the body sent onward to the model. */
export async function getEmail(userId: string, id: string, maxChars = 8000): Promise<EmailFull> {
  const m = (await gmailFetch(userId, `/messages/${id}?format=full`)) as {
    id: string;
    snippet?: string;
    payload?: GmailPart;
  };
  const body = extractBody(m.payload);
  return {
    id: m.id,
    from: header(m.payload, "From"),
    subject: header(m.payload, "Subject"),
    date: header(m.payload, "Date"),
    snippet: m.snippet ?? "",
    body: body.length > maxChars ? `${body.slice(0, maxChars)}\n[…kısaltıldı]` : body,
    attachments: attachmentNames(m.payload),
    pdfs: pdfAttachments(m.payload),
  };
}

export interface ReplyContext {
  threadId: string;
  subject: string;
  /** Where a reply goes by default: Reply-To, else From. */
  replyTo: string;
  /** Everyone on the original message (From, Reply-To, To, Cc). */
  participants: string;
  messageId: string;
  references: string;
}

/** Headers needed to answer a message inside its thread. */
export async function getReplyContext(userId: string, id: string): Promise<ReplyContext> {
  const params = new URLSearchParams({ format: "metadata" });
  for (const h of ["From", "Reply-To", "To", "Cc", "Subject", "Message-ID", "References"]) {
    params.append("metadataHeaders", h);
  }
  const m = (await gmailFetch(userId, `/messages/${encodeURIComponent(id)}?${params}`)) as {
    threadId: string;
    payload?: GmailPart;
  };
  const from = header(m.payload, "From");
  const replyTo = header(m.payload, "Reply-To");
  return {
    threadId: m.threadId,
    subject: header(m.payload, "Subject"),
    replyTo: replyTo || from,
    participants: [from, replyTo, header(m.payload, "To"), header(m.payload, "Cc")].join(", "),
    messageId: header(m.payload, "Message-ID"),
    references: header(m.payload, "References"),
  };
}

/** Saves a draft in the user's Gmail (Drafts folder, inside the thread). Never sends. */
export async function createDraft(userId: string, raw: string, threadId: string): Promise<{ id: string }> {
  const json = (await gmailFetch(userId, "/drafts", {
    method: "POST",
    body: { message: { raw, threadId } },
  })) as { id: string };
  return { id: json.id };
}
