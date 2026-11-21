"use client";

import { useState, useTransition } from "react";
import type { PermissionMode } from "@/lib/tools/types";
import { disconnectGoogleAccount, setToolPermission } from "../actions";

const LABEL: Record<PermissionMode, string> = { auto: "Otomatik", ask: "Onay iste", deny: "Kapalı" };

export function PermissionControl({
  toolName,
  current,
  defaultValue,
  options,
  isRead,
}: {
  toolName: string;
  current: PermissionMode;
  defaultValue: PermissionMode;
  options: PermissionMode[];
  isRead: boolean;
}) {
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" className="flex shrink-0 rounded-lg border border-[var(--border)] p-0.5">
        {options.map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={value === m}
            disabled={pending}
            onClick={() => {
              const previous = value;
              setValue(m);
              setFailed(false);
              startTransition(async () => {
                const res = await setToolPermission(toolName, m);
                if (!res.ok) {
                  setValue(previous);
                  setFailed(true);
                }
              });
            }}
            className={`rounded-md px-2.5 py-1.5 text-xs transition ${
              value === m
                ? m === "deny"
                  ? "bg-red-500/15 font-medium text-red-500"
                  : "bg-[var(--accent-soft)] font-medium"
                : "text-[var(--muted)]"
            }`}
          >
            {isRead && m === "auto" ? "Açık" : LABEL[m]}
            {m === defaultValue && <span className="sr-only"> (varsayılan)</span>}
          </button>
        ))}
      </div>
      {failed && <span className="text-xs text-red-500">Kaydedilemedi</span>}
    </div>
  );
}

export function DisconnectGoogleButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Google bağlantısı kaldırılsın mı? Yaver takvimini okuyamaz ve etkinlik ekleyemez. Tekrar bağlamak için çıkış yapıp Google ile giriş yapman gerekir.",
          )
        )
          return;
        startTransition(() => disconnectGoogleAccount());
      }}
      className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-red-500 disabled:opacity-40"
    >
      {pending ? "Kaldırılıyor…" : "Bağlantıyı kaldır"}
    </button>
  );
}
