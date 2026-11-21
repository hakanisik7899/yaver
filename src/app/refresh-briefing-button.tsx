"use client";

import { useTransition } from "react";
import { refreshBriefing } from "./actions";

export function RefreshBriefingButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => refreshBriefing())}
      disabled={pending}
      className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--fg)] disabled:opacity-50"
    >
      {pending ? "Yenileniyor…" : "Yenile"}
    </button>
  );
}
