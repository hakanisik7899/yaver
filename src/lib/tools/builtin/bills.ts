import "server-only";
import { z } from "zod";
import { ensureDailyBillScan } from "@/lib/bills/scan";
import { createAdminClient } from "@/lib/supabase/server";
import { DATE_REGEX } from "@/lib/time";
import { defineTool } from "../registry";

const BILL_COLUMNS = "id, provider, category, amount, currency, due_date, period, status, paid_at";

export const listBills = defineTool({
  name: "list_bills",
  // Gmail features are Pro only.
  requiresPro: true,
  label: "Faturaları okuma",
  description:
    "Lists the user's bills found in their email (provider, amount, last payment date, paid " +
    "or not). Use for questions like 'bu hafta hangi faturalarım var' or when planning payments. " +
    "Runs today's email scan first if it has not run yet.",
  kind: "read",
  input: z.strictObject({
    status: z.enum(["unpaid", "all"]).describe("Usually unpaid"),
    due_on_or_before: z.string().regex(DATE_REGEX).optional().describe("Only bills due by this day, YYYY-MM-DD"),
  }),
  summarize: (i) => `Faturalar okundu (${i.status === "unpaid" ? "ödenmemiş" : "tümü"})`,
  async execute(ctx, i) {
    let scan: string;
    try {
      const r = await ensureDailyBillScan(ctx.userId);
      scan = r.status === "scanned" ? `today's scan checked ${r.checked} new emails` : `scan skipped: ${r.reason}`;
    } catch (err) {
      console.error("list_bills: scan failed", err);
      scan = "scan failed; showing bills found earlier";
    }

    let q = createAdminClient().from("bills").select(BILL_COLUMNS).eq("user_id", ctx.userId);
    if (i.status === "unpaid") q = q.eq("status", "unpaid");
    if (i.due_on_or_before) q = q.lte("due_date", i.due_on_or_before);
    const { data, error } = await q.order("due_date", { ascending: true, nullsFirst: false }).limit(50);
    if (error) throw error;
    return { scan, count: data.length, bills: data };
  },
});

export const markBillPaid = defineTool({
  name: "mark_bill_paid",
  // Gmail features are Pro only.
  requiresPro: true,
  label: "Faturayı ödendi işaretleme",
  description:
    "Marks a bill as paid (or unpaid again) in Yaver's list. It does NOT pay anything; it only " +
    "records that the user paid. Runs immediately and can be undone. Get the id from list_bills.",
  kind: "write",
  autoByDefault: true,
  reversible: true,
  input: z.strictObject({
    bill_id: z.uuid().describe("Id from list_bills"),
    paid: z.boolean().describe("true = paid, false = mark unpaid again"),
  }),
  summarize: (i) => (i.paid ? "Fatura ödendi olarak işaretlendi" : "Fatura ödenmedi olarak işaretlendi"),
  async execute(ctx, i) {
    const { data, error } = await createAdminClient()
      .from("bills")
      .update(i.paid ? { status: "paid", paid_at: new Date().toISOString() } : { status: "unpaid", paid_at: null })
      .eq("id", i.bill_id)
      .eq("user_id", ctx.userId)
      .select(BILL_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Fatura bulunamadı.");
    return { updated: true, bill: data };
  },
});
