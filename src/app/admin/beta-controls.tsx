"use client";

import { useState, useTransition } from "react";
import { adminSetFeedbackDone, adminSetWaitlistStatus } from "../actions";

type WaitStatus = "pending" | "invited" | "rejected";

export function WaitlistActions({ id, status }: { id: string; status: WaitStatus }) {
  const [pending, startTransition] = useTransition();
  const set = (s: WaitStatus) => startTransition(async () => void (await adminSetWaitlistStatus(id, s)));
  const btn = "rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs disabled:opacity-40";
  if (status !== "pending") {
    return (
      <button disabled={pending} onClick={() => set("pending")} className={`${btn} text-[var(--muted)]`}>
        Geri al
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button disabled={pending} onClick={() => set("invited")} className={`${btn} border-[var(--accent)] text-[var(--accent-2)]`}>
        Davet ettim
      </button>
      <button disabled={pending} onClick={() => set("rejected")} className={`${btn} text-[var(--muted)]`}>
        Reddet
      </button>
    </div>
  );
}

export function FeedbackDone({ id, done }: { id: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => void (await adminSetFeedbackDone(id, !done)))}
      className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)] disabled:opacity-40"
    >
      {done ? "Yeniden aç" : "Tamamlandı"}
    </button>
  );
}

/** Read-only text with a copy button (pending emails, invite message). */
export function CopyBox({ text, label, rows = 3 }: { text: string; label: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--muted)]">{label}</span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              setCopied(false);
            }
          }}
          className="text-xs text-[var(--accent-2)] hover:underline"
        >
          {copied ? "Kopyalandı ✓" : "Kopyala"}
        </button>
      </div>
      <textarea readOnly value={text} rows={rows} className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-xs" />
    </div>
  );
}
