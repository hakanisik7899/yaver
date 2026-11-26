"use client";

import { useState, useTransition } from "react";
import { joinWaitlist } from "./actions";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="space-y-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-4 text-sm">
        <p className="font-medium">Listeye eklendin 🎉</p>
        <p className="text-[var(--muted)]">
          Davet edildiğinde sana haber vereceğiz. Sonra bu adresle &quot;Google ile devam et&quot; diyerek giriş
          yapabileceksin.
        </p>
      </div>
    );
  }

  const field = "w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-base sm:text-sm";
  return (
    <form
      className="space-y-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await joinWaitlist({ email, name, note, website });
          if (res.ok) setDone(true);
          else setError(res.message);
        });
      }}
    >
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Google hesabı e-postan (Gmail)</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@gmail.com" className={field} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Adın (isteğe bağlı)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={field} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-[var(--muted)]">Yaver&apos;i en çok ne için kullanmak istersin? (isteğe bağlı)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className={field} />
      </label>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        disabled={pending}
        className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {pending ? "Gönderiliyor…" : "Beta listesine katıl"}
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs text-[var(--muted)]">
        Adresini yalnızca seni davet etmek için kullanırız. Ayrıntılar:{" "}
        <a href="/gizlilik" className="text-[var(--accent-2)] hover:underline">
          Gizlilik ve KVKK
        </a>
        .
      </p>
    </form>
  );
}
