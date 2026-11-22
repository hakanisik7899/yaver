"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_SCOPES } from "@/lib/google/scopes";
import { YaverOrb } from "../yaver-orb";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: GOOGLE_SCOPES,
        // offline + consent => Google returns a refresh token so Yaver
        // can read the calendar for the morning summary.
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      setError("Giriş başlatılamadı. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass rise w-full max-w-sm space-y-8 rounded-[2rem] p-8 text-center">
        <div className="space-y-3">
          <YaverOrb size={170} className="mx-auto" />
          <h1 className="font-display text-4xl font-semibold">Yaver</h1>
          <p className="text-sm text-[var(--muted)]">
            Günlük işlerini anlayan, planlayan ve senin onayınla halleden asistanın.
          </p>
        </div>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-3.5 text-base font-medium text-[var(--accent-fg)] transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Yönlendiriliyor…" : "Google ile devam et"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <p className="text-xs text-[var(--muted)]">
          Takvimini ve e-postalarını okuruz; takvimine bir şey eklemek ya da Gmail&apos;e taslak kaydetmek
          gerektiğinde önce senin onayını isteriz. E-posta göndermeyiz.
        </p>
        <p className="text-xs text-[var(--muted)]">
          Devam ederek{" "}
          <Link href="/kullanim-sartlari" className="text-[var(--accent-2)] hover:underline">
            Kullanım Şartları
          </Link>
          &apos;nı kabul etmiş ve{" "}
          <Link href="/gizlilik" className="text-[var(--accent-2)] hover:underline">
            Gizlilik ve KVKK Aydınlatma Metni
          </Link>
          &apos;ni okumuş olursun.
        </p>
      </div>
    </main>
  );
}
