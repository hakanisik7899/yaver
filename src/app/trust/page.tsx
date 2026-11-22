import Link from "next/link";
import { Suspense } from "react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { USER_TZ } from "@/lib/time";
import { registry } from "@/lib/tools";
import { SERVER_TOOLS } from "@/lib/tools/server-tools";
import { allowedModes, defaultMode, effectiveMode } from "@/lib/tools/policy";
import type { PermissionMode } from "@/lib/tools/types";
import { AppShell } from "../app-shell";
import { DisconnectGoogleButton, PermissionControl } from "./controls";
import { NotificationSettings } from "./notification-settings";
import { normalizePrefs } from "@/lib/notifications/rules";

export const metadata = { title: "Güven Merkezi · Yaver" };

const EVENT_LABEL: Record<string, { text: string; className: string }> = {
  executed: { text: "Yapıldı", className: "text-[var(--accent)]" },
  proposed: { text: "Onaya gönderildi", className: "text-amber-500" },
  approved: { text: "Onaylandı", className: "text-[var(--accent)]" },
  rejected: { text: "Reddedildi", className: "text-[var(--muted)]" },
  denied: { text: "Engellendi", className: "text-[var(--muted)]" },
  failed: { text: "Başarısız", className: "text-red-500" },
};

const AGENT_LABEL: Record<string, string> = { core: "Sohbet", briefing: "Sabah özeti" };

const KIND_LABEL = { read: "Okuma", draft: "Taslak", write: "Değişiklik" } as const;

function when(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: USER_TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub as string | undefined };
}

async function Connections() {
  const { userId } = await currentUserId();
  if (!userId) return null;
  // Refresh tokens are server-only (no RLS policy); read just the metadata.
  const { data } = await createAdminClient()
    .from("google_connections")
    .select("scopes, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5 text-sm">
        <p className="font-medium">Google (Takvim + Gmail)</p>
        {data ? (
          <p className="text-xs text-[var(--muted)]">
            Bağlı · izin: takvimi okuma ve onayınla etkinlik ekleme, e-postaları okuma ve onayınla Gmail&apos;e yanıt taslağı kaydetme (gönderme yok) · {when(data.updated_at)}
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Bağlı değil. Yeniden bağlamak için çıkış yapıp Google ile giriş yap.
          </p>
        )}
      </div>
      {data && <DisconnectGoogleButton />}
    </div>
  );
}

async function Notifications() {
  const { supabase } = await currentUserId();
  const [{ data: prefs }, { count }] = await Promise.all([
    supabase
      .from("notification_prefs")
      .select("briefing, meetings, overdue_tasks, approvals, bills, quiet_start, quiet_end")
      .maybeSingle(),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
  ]);
  return <NotificationSettings initialPrefs={normalizePrefs(prefs)} deviceCount={count ?? 0} />;
}

async function Permissions() {
  const { supabase } = await currentUserId();
  const { data } = await supabase.from("tool_permissions").select("tool_name, mode");
  const stored = new Map((data ?? []).map((r) => [r.tool_name as string, r.mode as PermissionMode]));

  return (
    <ul className="divide-y divide-[var(--border)]">
      {[...registry.list(), ...SERVER_TOOLS].map((t) => (
        <li key={t.name} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            <p>{t.label}</p>
            <p className="text-xs text-[var(--muted)]">
              {KIND_LABEL[t.kind]}
              {"sensitive" in t && t.sensitive && " · hassas, her zaman onaylı"}
            </p>
          </div>
          <PermissionControl
            toolName={t.name}
            current={effectiveMode(t, stored.get(t.name))}
            defaultValue={defaultMode(t)}
            options={allowedModes(t)}
            isRead={t.kind !== "write"}
          />
        </li>
      ))}
    </ul>
  );
}

async function AuditLog({ searchParams }: { searchParams: PageProps<"/trust">["searchParams"] }) {
  const { all } = await searchParams;
  const showReads = all === "1";
  const { supabase } = await currentUserId();

  let q = supabase
    .from("audit_logs")
    .select("id, created_at, agent, tool_name, event, permission_level, summary, approved_by_user, error")
    .order("created_at", { ascending: false })
    .limit(50);
  // Reads are logged too, but they are noisy; hide them unless asked.
  if (!showReads) q = q.or("permission_level.is.null,permission_level.gt.1");
  const { data } = await q;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          href={showReads ? "/trust" : "/trust?all=1"}
          className="text-xs text-[var(--accent)]"
          scroll={false}
        >
          {showReads ? "Okumaları gizle" : "Okumaları da göster"}
        </Link>
      </div>
      {!data?.length ? (
        <p className="text-sm text-[var(--muted)]">Henüz kayıt yok.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {data.map((e) => {
            const ev = EVENT_LABEL[e.event] ?? { text: e.event, className: "" };
            return (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p>{e.summary}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {when(e.created_at)} · {AGENT_LABEL[e.agent] ?? e.agent}
                    {e.permission_level ? ` · L${e.permission_level}` : ""}
                    {e.approved_by_user ? " · senin onayınla" : ""}
                  </p>
                  {e.error && <p className="text-xs text-red-500">{e.error}</p>}
                </div>
                <span className={`shrink-0 text-xs ${ev.className}`}>{ev.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const Loading = () => <p className="text-sm text-[var(--muted)]">Yükleniyor…</p>;

export default function TrustPage({ searchParams }: PageProps<"/trust">) {
  return (
    <AppShell active="trust">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">

      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold">Güven Merkezi</h1>
        <p className="text-sm text-[var(--muted)]">
          Yaver&apos;in neye erişebildiğini, ne yaptığını ve hangi işler için onayını beklediğini buradan
          yönetirsin.
        </p>
      </div>

      <section className="space-y-3 glass rise rounded-3xl p-5">
        <h2 className="font-medium">Bağlantılar</h2>
        <Suspense fallback={<Loading />}>
          <Connections />
        </Suspense>
      </section>

      <section className="space-y-3 glass rise rounded-3xl p-5">
        <h2 className="font-medium">Bildirimler</h2>
        <Suspense fallback={<Loading />}>
          <Notifications />
        </Suspense>
      </section>

      <section className="space-y-2 glass rise rounded-3xl p-5">
        <h2 className="font-medium">Araç izinleri</h2>
        <p className="text-xs text-[var(--muted)]">
          Otomatik: Yaver hemen yapar ve kaydeder. Onay iste: önce Onay bekleyenler listesine düşer.
          Kapalı: Yaver bu aracı hiç kullanamaz. Hassas işlemler her zaman onay ister.
        </p>
        <Suspense fallback={<Loading />}>
          <Permissions />
        </Suspense>
      </section>

      <section className="space-y-2 glass rise rounded-3xl p-5">
        <h2 className="font-medium">İşlem kaydı</h2>
        <p className="text-xs text-[var(--muted)]">
          Yaver&apos;in yaptığı ve önerdiği her işlem burada. Kayıtlar değiştirilemez ve silinemez.
        </p>
        <Suspense fallback={<Loading />}>
          <AuditLog searchParams={searchParams} />
        </Suspense>
      </section>
    </div>
    </AppShell>
  );
}
