import { Suspense } from "react";
import { toDisplayTurns, type DisplayTurn } from "@/lib/agent/history";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "./app-header";
import { BriefingCard, BriefingSkeleton } from "./briefing-card";
import { Chat } from "./chat";
import { PendingActions } from "./pending-actions";
import { TasksPanel } from "./tasks-panel";

async function Greeting() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const name = (data?.claims?.user_metadata as { full_name?: string } | undefined)?.full_name;
  return <>Merhaba{name ? `, ${name.split(" ")[0]}` : ""} 👋</>;
}

/** Opens a saved conversation when the URL has ?c=<id> (from the history page). */
async function ChatLoader({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { c } = await searchParams;
  const id = typeof c === "string" ? c : undefined;
  if (!id) return <Chat key="new" />;

  const supabase = await createClient();
  // RLS: only the user's own conversation and messages are visible.
  const { data: rows } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", id)
    .order("id");
  if (!rows?.length) return <Chat key="new" />;

  const turns: DisplayTurn[] = toDisplayTurns(rows);
  return <Chat key={id} initialConversationId={id} initialTurns={turns} />;
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <AppHeader active="home" />

      <h1 className="text-2xl font-medium">
        <Suspense fallback="Merhaba 👋">
          <Greeting />
        </Suspense>
      </h1>

      <Suspense fallback={<BriefingSkeleton />}>
        <BriefingCard />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Suspense
          fallback={
            <div className="min-h-[24rem] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
              Sohbet yükleniyor…
            </div>
          }
        >
          <ChatLoader searchParams={searchParams} />
        </Suspense>
        <aside className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Görevler</h2>
            <Suspense fallback={<p className="text-sm text-[var(--muted)]">Yükleniyor…</p>}>
              <TasksPanel />
            </Suspense>
          </section>
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-medium">Onay bekleyenler</h2>
            <Suspense fallback={<p className="text-sm text-[var(--muted)]">Yükleniyor…</p>}>
              <PendingActions />
            </Suspense>
          </section>
        </aside>
      </div>
    </main>
  );
}
