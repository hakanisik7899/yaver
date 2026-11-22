"use client";

import { useState, useTransition } from "react";
import type { PermissionMode } from "@/lib/tools/types";
import { deleteMyAccount, disconnectGoogleAccount, setToolPermission } from "../actions";

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

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
      >
        Hesabımı ve verilerimi sil
      </button>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          // Redirects away on success; only a failure returns here.
          const res = await deleteMyAccount(email);
          if (res && !res.ok) setError(res.message);
        });
      }}
    >
      <p className="text-sm">
        Bu işlem geri alınamaz. Yaver&apos;in Google erişimi iptal edilir; sohbetlerin, görevlerin, faturaların,
        ayarların, işlem kayıtların ve hesabın kalıcı olarak silinir. Onaylamak için Google e-posta adresini yaz.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="ornek@gmail.com"
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-base sm:text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {pending ? "Siliniyor…" : "Kalıcı olarak sil"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setEmail("");
            setError(null);
          }}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
        >
          Vazgeç
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </form>
  );
}
