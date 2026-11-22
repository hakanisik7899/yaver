"use client";

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
          Takvimini okuruz; bir etkinlik eklemek ya da değiştirmek gerektiğinde önce senin onayını
          isteriz.
        </p>
      </div>
    </main>
  );
}
