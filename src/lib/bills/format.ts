/** "1234.5", "TRY" -> "1.234,50 ₺" (Turkish formatting). */
export function formatMoney(amount: number | string | null, currency = "TRY"): string {
  if (amount === null || amount === "") return "tutar belirtilmemiş";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "tutar belirtilmemiş";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(n);
  } catch {
    return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n)} ${currency}`;
  }
}

/** Days from `today` to `due` (both YYYY-MM-DD); negative if overdue. */
export function daysUntil(due: string, today: string): number {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** "bugün", "yarın", "3 gün sonra", "2 gün gecikti". */
export function dueLabel(due: string | null, today: string): string {
  if (!due) return "son tarih yok";
  const d = daysUntil(due, today);
  if (d === 0) return "bugün";
  if (d === 1) return "yarın";
  if (d > 1) return `${d} gün sonra`;
  return `${-d} gün gecikti`;
}
