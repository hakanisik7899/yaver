import "server-only";
import { getAttachmentBase64, getEmail, GmailNotAllowedError, searchMessageIds } from "@/lib/google/gmail";
import { pickBillPdf } from "@/lib/google/gmail-parse";
import { mergeBills, needsPdf } from "./merge";
import { GoogleNotConnectedError } from "@/lib/google/oauth";
import { createAdminClient } from "@/lib/supabase/server";
import { dayStart, todayLocal } from "@/lib/time";
import { effectiveMode } from "@/lib/tools/policy";
import type { PermissionMode } from "@/lib/tools/types";
import { extractBill } from "./extract";

// Turkish bill wording; sent/drafts/promotions excluded.
// Also matches mails whose only bill content is a PDF named like an invoice.
const BILL_QUERY =
  'newer_than:45d (fatura OR "son ödeme" OR ekstre OR "e-arşiv" OR "e-fatura" OR "dönem borcu" OR "ödenecek tutar" OR filename:fatura OR filename:ekstre OR filename:arsiv) -in:sent -in:drafts -category:promotions';
const SEARCH_LIMIT = 30;
const MAX_NEW_PER_RUN = 15; // caps model calls (cost) per user per run

export type ScanResult =
  | { status: "scanned"; checked: number; bills: number }
  | { status: "skipped"; reason: "already_today" | "denied" | "no_permission" | "not_connected" };

/**
 * search_emails is a read tool: it is off only if the user set "deny".
 * (Checked directly rather than via the registry, which imports this
 * module through the list_bills tool.)
 */
async function emailReadsAllowed(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("tool_permissions")
    .select("mode")
    .eq("user_id", userId)
    .eq("tool_name", "search_emails")
    .maybeSingle();
  return effectiveMode({ kind: "read" }, data?.mode as PermissionMode | undefined) !== "deny";
}

/**
 * Scans recent bill emails once per local day (or now with `force`) and
 * stores new bills. Background work, not a model action: reads Gmail
 * directly but honours a Trust Center denial of email reads. Each email is
 * sent to the extraction model at most once (email_scan_log).
 */
export async function ensureDailyBillScan(userId: string, { force = false } = {}): Promise<ScanResult> {
  const db = createAdminClient();
  if (!(await emailReadsAllowed(userId))) return { status: "skipped", reason: "denied" };

  // Claim today's scan atomically so concurrent triggers run it once.
  const now = new Date().toISOString();
  let claim = db.from("google_connections").update({ bills_scanned_at: now }).eq("user_id", userId);
  // UTC ISO string: a "+03:00" offset could be mangled in the query string.
  const todayStartUtc = new Date(dayStart(todayLocal())).toISOString();
  if (!force) claim = claim.or(`bills_scanned_at.is.null,bills_scanned_at.lt.${todayStartUtc}`);
  const { data: claimed, error } = await claim.select("user_id");
  if (error) throw error;
  if (!claimed?.length) return force ? { status: "skipped", reason: "not_connected" } : { status: "skipped", reason: "already_today" };

  let ids: string[];
  try {
    ids = await searchMessageIds(userId, BILL_QUERY, SEARCH_LIMIT);
  } catch (err) {
    // Release today's claim so the scan runs again once access is fixed
    // (e.g. after re-login or enabling the Gmail API), not only tomorrow.
    await db.from("google_connections").update({ bills_scanned_at: null }).eq("user_id", userId);
    if (err instanceof GmailNotAllowedError) return { status: "skipped", reason: "no_permission" };
    if (err instanceof GoogleNotConnectedError) return { status: "skipped", reason: "not_connected" };
    throw err;
  }
  if (ids.length === 0) return { status: "scanned", checked: 0, bills: 0 };

  const { data: seen } = await db
    .from("email_scan_log")
    .select("message_id")
    .eq("user_id", userId)
    .in("message_id", ids);
  const seenIds = new Set((seen ?? []).map((r) => r.message_id as string));
  const fresh = ids.filter((id) => !seenIds.has(id)).slice(0, MAX_NEW_PER_RUN);

  let bills = 0;
  for (const id of fresh) {
    let result: "bill" | "not_bill" | "error" = "not_bill";
    try {
      const email = await getEmail(userId, id, 6000);
      let bill = await extractBill(email);
      // Many providers put the amount/date only in the attached PDF.
      const pdf = needsPdf(bill) ? pickBillPdf(email.pdfs) : null;
      if (pdf) {
        const base64 = await getAttachmentBase64(userId, id, pdf.attachmentId);
        bill = mergeBills(bill, await extractBill(email, { filename: pdf.filename, base64 }));
      }
      if (bill) {
        const { error: insertError } = await db
          .from("bills")
          .upsert({ user_id: userId, source_message_id: id, ...bill }, { onConflict: "user_id,source_message_id", ignoreDuplicates: true });
        if (insertError) throw insertError;
        result = "bill";
        bills++;
      }
    } catch (err) {
      console.error("bill scan: message failed", id, err);
      result = "error";
    }
    // Errors are not logged, so a transient failure is retried next scan.
    if (result !== "error") {
      await db.from("email_scan_log").upsert({ user_id: userId, message_id: id, result });
    }
  }
  return { status: "scanned", checked: fresh.length, bills };
}
