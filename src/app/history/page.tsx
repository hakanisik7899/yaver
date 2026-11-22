import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { USER_TZ } from "@/lib/time";
import { AppShell } from "../app-shell";
import { DeleteConversationButton } from "./delete-button";

export const metadata = { title: "Geçmiş · Yaver" };

function when(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: USER_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function ConversationList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at, ai_messages(count)")
    .order("updated_at", { ascending: false })
    .limit(100);

  // Turns that failed before any reply leave empty conversations behind.
  const conversations = (data ?? []).filter(
    (c) => ((c.ai_messages as { count: number }[] | null)?.[0]?.count ?? 0) > 0,
  );

  if (conversations.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Henüz kayıtlı bir sohbetin yok.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {conversations.map((c) => (
        <li key={c.id} className="flex items-center gap-3 py-3">
          <Link href={`/?c=${c.id}`} className="min-w-0 flex-1">
            <span className="block truncate text-sm">{c.title || "Sohbet"}</span>
            <span className="block text-xs text-[var(--muted)]">{when(c.updated_at)}</span>
          </Link>
          <DeleteConversationButton id={c.id} />
        </li>
      ))}
    </ul>
  );
}

export default function HistoryPage() {
  return (
    <AppShell active="history">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <section className="space-y-2 glass rise rounded-3xl p-5">
        <h1 className="font-display text-xl font-semibold">Sohbet geçmişi</h1>
        <p className="text-xs text-[var(--muted)]">Bir sohbeti açıp kaldığın yerden devam edebilirsin.</p>
        <Suspense fallback={<p className="text-sm text-[var(--muted)]">Yükleniyor…</p>}>
          <ConversationList />
        </Suspense>
      </section>
    </div>
    </AppShell>
  );
}
