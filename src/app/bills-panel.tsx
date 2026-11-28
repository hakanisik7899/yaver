import { dueLabel, formatMoney, shortDate } from "@/lib/bills/format";
import Link from "next/link";
import { getPlan } from "@/lib/plans/usage";
import { createClient } from "@/lib/supabase/server";
import { addDays, dayStart, todayLocal } from "@/lib/time";
import { MarkBillPaidButton, MarkBillUnpaidButton } from "./bill-controls";

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
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  if ((await getPlan(userId)) !== "pro") {
    return (
      <p className="text-sm text-[var(--muted)]">
        Fatura takibi Pro planda: Yaver fatura e-postalarını her sabah tarar, son ödeme günü yaklaşınca haber verir.{" "}
        <Link href="/plan" className="text-[var(--accent-2)] hover:underline">
          Planım →
        </Link>
      </p>
    );
  }
  const today = todayLocal();
  const [{ data }, { data: recent }] = await Promise.all([
    supabase
      .from("bills")
      .select("id, provider, category, amount, currency, due_date")
      .eq("status", "unpaid")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    // Paid in the last 45 days (the scan window), incl. auto-charged invoices.
    supabase
      .from("bills")
      .select("id, provider, category, amount, currency, period, paid_at")
      .eq("status", "paid")
      .gte("paid_at", new Date(dayStart(addDays(today, -45))).toISOString())
      .order("paid_at", { ascending: false })
      .limit(5),
  ]);

  if (!data?.length && !recent?.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Ödenmemiş fatura görünmüyor. Yaver fatura e-postalarını her sabah tarar; hemen kontrol etmek için
        sohbette &quot;Faturalarım neler?&quot; diye sorabilirsin.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data?.length ? <UnpaidList bills={data} today={today} /> : <p className="text-sm text-[var(--muted)]">Ödenmemiş fatura yok.</p>}
      {recent?.length ? (
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Son faturalar</h3>
          <ul className="space-y-2">
            {recent.map((b) => {
              const paidOn = shortDate(b.paid_at);
              return (
                <li key={b.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="truncate text-[var(--muted)]">
                      <span aria-hidden="true">{CATEGORY_ICON[b.category] ?? "🧾"} </span>
                      {b.provider}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatMoney(b.amount, b.currency)} · <span className="text-emerald-400">ödendi</span>
                      {paidOn ? ` · ${paidOn}` : ""}
                      {b.period ? ` · ${b.period}` : ""}
                    </p>
                  </div>
                  <MarkBillUnpaidButton id={b.id} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

interface UnpaidBill {
  id: string;
  provider: string;
  category: string;
  amount: number | string | null;
  currency: string;
  due_date: string | null;
}

function UnpaidList({ bills, today }: { bills: UnpaidBill[]; today: string }) {
  return (
    <ul className="space-y-2">
      {bills.map((b) => {
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
