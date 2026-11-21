"use client";

import { useState, useTransition } from "react";
import { approveAction, declineAction } from "./actions";

export function PendingActionButtons({ actionId }: { actionId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await approveAction(actionId);
            if (!res.ok) setError(res.message);
          })
        }
        className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        Onayla
      </button>
      <button
        disabled={pending}
        onClick={() => startTransition(async () => void (await declineAction(actionId)))}
        className="rounded-md border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-50"
      >
        Reddet
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
