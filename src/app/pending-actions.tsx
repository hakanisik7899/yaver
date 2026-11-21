import { createClient } from "@/lib/supabase/server";
import { PendingActionButtons } from "./pending-action-buttons";

export async function PendingActions() {
  const supabase = await createClient();
  const { data: actions } = await supabase
    .from("pending_actions")
    .select("id, summary, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!actions?.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Şu an onay bekleyen bir işlem yok. Yaver bir şeyi değiştirmek istediğinde burada görünecek.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {actions.map((a) => (
        <li key={a.id} className="rounded-lg border border-[var(--border)] p-3">
          <p className="text-sm">{a.summary}</p>
          <PendingActionButtons actionId={a.id} />
        </li>
      ))}
    </ul>
  );
}
