"use client";

import { useTransition } from "react";
import { setBillPaid } from "./actions";

export function MarkBillPaidButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => void (await setBillPaid(id, true)))}
      className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs disabled:opacity-40"
    >
      {pending ? "…" : "Ödendi"}
    </button>
  );
}

/** Undo for a bill marked paid by mistake (or a receipt read as paid). */
export function MarkBillUnpaidButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => void (await setBillPaid(id, false)))}
      className="shrink-0 px-1 py-1 text-xs text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-40"
    >
      {pending ? "…" : "Geri al"}
    </button>
  );
}
