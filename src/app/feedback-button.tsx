"use client";

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { sendFeedback } from "./actions";

const KINDS = [
  { value: "bug", label: "🐞 Hata" },
  { value: "idea", label: "💡 Öneri" },
  { value: "other", label: "💬 Diğer" },
] as const;

function Icon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M8 9h8M8 12h5" />
    </svg>
  );
}

/** "Geri bildirim" in the rail (variant rail) or phone top bar (variant phone). */
export function FeedbackButton({ variant }: { variant: "rail" | "phone" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("idea");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | string>("idle");
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setStatus("idle");
    setMessage("");
  }

  return (
    <>
      {variant === "rail" ? (
        <button
          onClick={() => setOpen(true)}
          title="Geri bildirim"
          className="flex w-full items-center justify-center gap-3 rounded-2xl px-3 py-3 text-[0.95rem] text-[var(--muted)] transition hover:bg-[var(--chip)] hover:text-[var(--fg)] 2xl:justify-start 2xl:px-3.5"
        >
          <Icon />
          <span className="hidden 2xl:inline">Geri bildirim</span>
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs text-[var(--muted)]">
          <Icon size={16} />
          Geri bildirim
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && !pending && close()}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="fb-title" className="glass rise w-full max-w-md space-y-4 rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h2 id="fb-title" className="font-display text-lg font-semibold">
                Geri bildirim
              </h2>
              <button onClick={close} aria-label="Kapat" className="rounded-lg px-2 text-[var(--muted)] hover:text-[var(--fg)]">
                ✕
              </button>
            </div>

            {status === "sent" ? (
              <div className="space-y-3">
                <p className="text-sm">Teşekkürler! Mesajın ulaştı; Yaver&apos;i senin sayende geliştiriyoruz. 🙏</p>
                <button onClick={close} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white">
                  Tamam
                </button>
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    const res = await sendFeedback({ kind, message, page: pathname, userAgent: navigator.userAgent });
                    setStatus(res.ok ? "sent" : res.message);
                  });
                }}
              >
                <div role="radiogroup" aria-label="Tür" className="flex gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      role="radio"
                      aria-checked={kind === k.value}
                      onClick={() => setKind(k.value)}
                      className={`flex-1 rounded-xl border px-2 py-2 text-sm ${
                        kind === k.value ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  autoFocus
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  rows={5}
                  placeholder={
                    kind === "bug" ? "Ne oldu? Ne yaptığında oldu?" : kind === "idea" ? "Yaver neyi daha iyi yapsın?" : "Aklındakini yaz…"
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-base sm:text-sm"
                />
                <p className="text-xs text-[var(--muted)]">Hangi sayfada olduğun ve tarayıcı bilgin de eklenir.</p>
                <button
                  disabled={pending || message.trim().length < 3}
                  className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {pending ? "Gönderiliyor…" : "Gönder"}
                </button>
                {status !== "idle" && <p className="text-sm text-red-400">{status}</p>}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
