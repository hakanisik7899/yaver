import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
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

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">Yaver</span>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">Çıkış yap</button>
        </form>
      </header>

      <h1 className="text-2xl font-medium">
        <Suspense fallback="Merhaba 👋">
          <Greeting />
        </Suspense>
      </h1>

      <Suspense fallback={<BriefingSkeleton />}>
        <BriefingCard />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Chat />
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
