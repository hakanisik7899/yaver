import { daysUntil, dueLabel, formatMoney } from "../bills/format";

/** First reminder this many days before the last payment date. */
export const BILL_LEAD_DAYS = 3;

export interface DueBill {
  id: string;
  provider: string;
  amount: number | string | null;
  currency: string;
  due_date: string;
}

export interface BillReminder {
  /** One notification_log key per bill, so each bill is sent once per stage. */
  refKeys: string[];
  title: string;
  body: string;
}

/**
 * Dedupe key of a bill reminder. The early stage keeps the bare bill id
 * (what earlier versions used), so bills already reminded are not sent again.
 */
export function billRefKey(id: string, stage: "early" | "due"): string {
  return stage === "early" ? id : `${id}:due`;
}

/**
 * Builds at most two pushes from unpaid bills: one for bills whose last
 * payment day is today, one for bills due within BILL_LEAD_DAYS. Several
 * bills in a stage are listed in one notification instead of one each.
 * Bills whose key is in `sent` were already reminded at that stage.
 */
export function billReminders(bills: DueBill[], today: string, sent: Set<string>): BillReminder[] {
  const byDue = [...bills].sort((a, b) => a.due_date.localeCompare(b.due_date));
  const dueToday = byDue.filter((b) => daysUntil(b.due_date, today) === 0 && !sent.has(billRefKey(b.id, "due")));
  const soon = byDue.filter((b) => {
    const d = daysUntil(b.due_date, today);
    return d >= 1 && d <= BILL_LEAD_DAYS && !sent.has(billRefKey(b.id, "early"));
  });

  const out: BillReminder[] = [];
  if (dueToday.length) {
    const [first] = dueToday;
    out.push({
      refKeys: dueToday.map((b) => billRefKey(b.id, "due")),
      title: dueToday.length === 1 ? `Bugün son gün: ${first.provider} faturası` : `Bugün son ödeme günü: ${dueToday.length} fatura`,
      body:
        dueToday.length === 1
          ? `Tutar: ${formatMoney(first.amount, first.currency)}. Ödediysen Yaver'de "Ödendi" olarak işaretle.`
          : dueToday.map((b) => `${b.provider} · ${formatMoney(b.amount, b.currency)}`).join("\n"),
    });
  }
  if (soon.length) {
    const [first] = soon;
    out.push({
      refKeys: soon.map((b) => billRefKey(b.id, "early")),
      title:
        soon.length === 1
          ? `${first.provider} faturası: son ödeme ${dueLabel(first.due_date, today)}`
          : `${soon.length} faturanın son ödeme günü yaklaşıyor`,
      body:
        soon.length === 1
          ? `Tutar: ${formatMoney(first.amount, first.currency)}`
          : soon.map((b) => `${b.provider} · ${formatMoney(b.amount, b.currency)} · ${dueLabel(b.due_date, today)}`).join("\n"),
    });
  }
  return out;
}
