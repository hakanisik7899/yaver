import { dueLabel, formatMoney } from "@/lib/bills/format";
import { createClient } from "@/lib/supabase/server";
import { todayLocal } from "@/lib/time";
import { MarkBillPaidButton } from "./bill-controls";

const CATEGORY_ICON: Record<string, string> = {
  elektrik: "⚡",
  dogalgaz: "🔥",
  su: "💧",
  gsm: "📱",
  internet: "🌐",
  kredi_karti: "💳",
  aidat: "🏠",
  diger: "🧾",
};

export async function BillsPanel() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bills")
    .select("id, provider, category, amount, currency, due_date")
    .eq("status", "unpaid")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(20);

  const today = todayLocal();
  if (!data?.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Ödenmemiş fatura görünmüyor. Yaver fatura e-postalarını her sabah tarar; hemen kontrol etmek için
        sohbette &quot;Faturalarım neler?&quot; diye sorabilirsin.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.map((b) => {
        const label = dueLabel(b.due_date, today);
        const urgent = b.due_date !== null && b.due_date <= today;
        return (
          <li key={b.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="truncate">
                <span aria-hidden="true">{CATEGORY_ICON[b.category] ?? "🧾"} </span>
                {b.provider}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {formatMoney(b.amount, b.currency)} ·{" "}
                <span className={urgent ? "text-red-500" : ""}>{label}</span>
              </p>
            </div>
            <MarkBillPaidButton id={b.id} />
          </li>
        );
      })}
    </ul>
  );
}
