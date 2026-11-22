import type { ExtractedBill } from "./extract";

/** Fills fields missing from the email text with values read from the PDF. */
export function mergeBills(fromText: ExtractedBill | null, fromPdf: ExtractedBill | null): ExtractedBill | null {
  if (!fromText) return fromPdf;
  if (!fromPdf) return fromText;
  return {
    provider: fromText.provider,
    category: fromText.category !== "diger" ? fromText.category : fromPdf.category,
    amount: fromText.amount ?? fromPdf.amount,
    currency: fromText.amount !== null ? fromText.currency : fromPdf.currency,
    due_date: fromText.due_date ?? fromPdf.due_date,
    period: fromText.period ?? fromPdf.period,
  };
}

/** The text alone was not enough to track the bill (missing amount or date). */
export function needsPdf(bill: ExtractedBill | null): boolean {
  return bill === null || bill.amount === null || bill.due_date === null;
}
