import { createAdminClient, createClient } from "@/lib/supabase/server";
import { decide } from "@/lib/tools/policy";
import type { PermissionMode } from "@/lib/tools/types";
import { Card } from "./card";

interface Connection {
  name: string;
  short: string;
  detail: string;
  on: boolean;
  icon: string;
}

/** Real connection state: Google scopes and Trust Center switches. */
export async function ConnectionsCard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const [{ data: google }, { data: perms }] = await Promise.all([
    // Refresh tokens are server-only; read just the scope label.
    createAdminClient().from("google_connections").select("scopes").eq("user_id", userId).maybeSingle(),
    supabase.from("tool_permissions").select("tool_name, mode"),
  ]);
  const scopes = google?.scopes ?? "";
  const mode = new Map((perms ?? []).map((p) => [p.tool_name as string, p.mode as PermissionMode]));
  const readOn = (tool: string) => decide({ kind: "read" }, mode.get(tool)).run !== "deny";

  const items: Connection[] = [
    { name: "Google Takvim", short: "Takvim", detail: "okuma · onaylı ekleme", on: !!google && readOn("list_calendar_events"), icon: "📅" },
    { name: "Gmail", short: "Gmail", detail: scopes.includes("gmail.compose") ? "okuma · onaylı yanıt taslağı" : "okuma", on: scopes.includes("gmail") && readOn("search_emails"), icon: "✉️" },
    { name: "Web araması", short: "Web", detail: "etkinlik, mekan, bilgi", on: readOn("web_search"), icon: "🔎" },
    { name: "Hava durumu", short: "Hava", detail: "Open-Meteo", on: readOn("get_weather_forecast"), icon: "⛅" },
  ];

  return (
    <Card title="Bağlantılar" action={{ href: "/trust", label: "Yönet" }} delay={360}>
      <ul className="grid grid-cols-4 gap-2">
        {items.map((c) => (
          <li
            key={c.name}
            title={`${c.name}: ${c.on ? c.detail : "kapalı"}`}
            className={`relative flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 ${c.on ? "border-[var(--border-strong)] bg-[var(--accent-soft)]" : "border-[var(--border)] opacity-50"}`}
          >
            <span
              className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${c.on ? "bg-[var(--accent-2)] shadow-[0_0_6px_var(--accent-2)]" : "bg-[var(--muted)]"}`}
            />
            <span className="text-lg leading-none" aria-hidden="true">
              {c.icon}
            </span>
            <span className="text-[0.7rem]">{c.short}</span>
            <span className="sr-only">{c.on ? "açık" : "kapalı"}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
