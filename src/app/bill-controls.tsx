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
