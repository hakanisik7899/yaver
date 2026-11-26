"use client";

import { useState, useTransition } from "react";
import { adminSetPlan } from "../actions";

const CHOICES = [
  { value: "free", label: "Ücretsiz", plan: "free", days: null },
  { value: "pro", label: "Pro (süresiz)", plan: "pro", days: null },
  { value: "pro30", label: "Pro · 30 gün", plan: "pro", days: 30 },
  { value: "pro7", label: "Pro · 7 gün", plan: "pro", days: 7 },
] as const;

export function PlanControl({ userId, email, current }: { userId: string; email: string; current: "free" | "pro" }) {
  const [choice, setChoice] = useState<string>(current);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const c = CHOICES.find((x) => x.value === choice)!;
        setStatus(null);
        startTransition(async () => {
          const res = await adminSetPlan({ userId, plan: c.plan, days: c.days });
          setStatus(res.ok ? "Kaydedildi" : res.message);
        });
      }}
    >
      <select
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-label={`${email} için plan`}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs"
      >
        {CHOICES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {pending ? "…" : "Uygula"}
      </button>
      {status && <span className="text-xs text-[var(--muted)]">{status}</span>}
    </form>
  );
}
