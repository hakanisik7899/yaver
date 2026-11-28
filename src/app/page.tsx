import { Suspense } from "react";
import { toDisplayTurns, type DisplayTurn } from "@/lib/agent/history";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";
import { BillsPanel } from "./bills-panel";
import { BriefingCard, BriefingSkeleton } from "./briefing-card";
import { Card, CardLoading } from "./card";
import { Chat } from "./chat";
import { ConnectionsCard } from "./connections-card";
import { Onboarding } from "./onboarding";
import { PendingActions } from "./pending-actions";
import { TasksPanel } from "./tasks-panel";
import { WeatherCard, WeatherSkeleton } from "./weather-card";

/** Loads the user's first name and, with ?c=<id>, a saved conversation. */
async function ChatLoader({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const supabase = await createClient();
  const [{ c }, { data: auth }] = await Promise.all([searchParams, supabase.auth.getClaims()]);
  const fullName = (auth?.claims?.user_metadata as { full_name?: string } | undefined)?.full_name;
  const firstName = fullName?.split(" ")[0];
  const id = typeof c === "string" ? c : undefined;
  if (!id) return <Chat key="new" firstName={firstName} />;

  // RLS: only the user's own conversation and messages are visible.
  const { data: rows } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", id)
    .order("id");
  if (!rows?.length) return <Chat key="new" firstName={firstName} />;

  const turns: DisplayTurn[] = toDisplayTurns(rows);
  return <Chat key={id} firstName={firstName} initialConversationId={id} initialTurns={turns} />;
}

function ChatSkeleton() {
  return <div className="glass min-h-[70dvh] rounded-[2rem] lg:min-h-0" />;
}

/** Shows the first-run introduction until the user finishes or skips it. */
async function OnboardingGate() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return null;
  const { data: settings, error } = await supabase.from("user_settings").select("onboarded_at").maybeSingle();
  // Column missing (migration 0011 not run yet): don't show it at all.
  if (error || settings?.onboarded_at) return null;
  return <Onboarding />;
}

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <AppShell active="home">
      <Suspense fallback={null}>
        <OnboardingGate />
      </Suspense>
      {/*
        Large screens: everything fits one screen. Chat on the left, cards in
        two columns pinned to the viewport height; long cards scroll inside.
        Phones: chat first, then the cards stacked.
      */}
      <div className="grid flex-1 gap-4 lg:h-[calc(100dvh-2.5rem)] lg:min-h-0 lg:flex-none lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_30rem] xl:grid-cols-[minmax(0,1fr)_36rem] 2xl:grid-cols-[minmax(0,1fr)_42rem]">
        <Suspense fallback={<ChatSkeleton />}>
          <ChatLoader searchParams={searchParams} />
        </Suspense>

        <div className="grid gap-4 sm:grid-cols-2 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]">
          <div className="flex flex-col gap-4 lg:min-h-0">
            <Suspense fallback={<WeatherSkeleton />}>
              <WeatherCard />
            </Suspense>
            <Suspense fallback={<BriefingSkeleton />}>
              <BriefingCard />
            </Suspense>
            <Suspense fallback={null}>
              <ConnectionsCard />
            </Suspense>
          </div>

          <div className="flex flex-col gap-4 lg:min-h-0">
            <Card title="Onay bekleyenler" persona="general" delay={180}>
              <div className="scroll-quiet max-h-44 overflow-y-auto pr-1">
                <Suspense fallback={<CardLoading />}>
                  <PendingActions />
                </Suspense>
              </div>
            </Card>
            <Card title="Görevler" persona="planner" delay={240} fill>
              <Suspense fallback={<CardLoading />}>
                <TasksPanel />
              </Suspense>
            </Card>
            <Card title="Faturalar" persona="finance" delay={300} fill>
              <Suspense fallback={<CardLoading />}>
                <BillsPanel />
              </Suspense>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
