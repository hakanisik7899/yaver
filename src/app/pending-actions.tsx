import { createClient } from "@/lib/supabase/server";
import { PendingActionButtons } from "./pending-action-buttons";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  executed: { text: "Yapıldı", className: "text-[var(--accent)]" },
  rejected: { text: "Reddedildi", className: "text-[var(--muted)]" },
  failed: { text: "Başarısız", className: "text-red-500" },
  approved: { text: "İşleniyor", className: "text-[var(--muted)]" },
};

/** Full text of a proposed email draft, so it can be read before approving. */
function DraftBody({ payload }: { payload: unknown }) {
  const body = (payload as { body?: unknown } | null)?.body;
  if (typeof body !== "string") return null;
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-[var(--accent-2)]">Taslağın tamamı</summary>
      <p className="mt-2 whitespace-pre-wrap rounded-md bg-[var(--chip)] p-2.5 text-[var(--fg)]">{body}</p>
    </details>
  );
}

export async function PendingActions() {
  const supabase = await createClient();
  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("pending_actions")
      .select("id, summary, payload")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("pending_actions")
      .select("id, summary, status")
      .neq("status", "pending")
      .order("decided_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  return (
    <div className="space-y-5">
      {pending?.length ? (
        <ul className="space-y-3">
          {pending.map((a) => (
            <li key={a.id} className="rounded-lg border border-[var(--border)] p-3">
              <p className="text-sm">{a.summary}</p>
              <DraftBody payload={a.payload} />
              <PendingActionButtons actionId={a.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Şu an onay bekleyen bir işlem yok. Yaver bir şeyi değiştirmek istediğinde burada görünecek.
        </p>
      )}

      {recent?.length ? (
        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Son işlemler</h3>
          <ul className="space-y-1.5">
            {recent.map((a) => {
              const label = STATUS_LABEL[a.status] ?? { text: a.status, className: "" };
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-[var(--muted)]">{a.summary}</span>
                  <span className={`shrink-0 text-xs ${label.className}`}>{label.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
