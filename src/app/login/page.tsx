"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_SCOPES } from "@/lib/google/scopes";

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
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Yaver</h1>
          <p className="text-sm text-neutral-500">
            Günlük işlerini anlayan, planlayan ve senin onayınla halleden
            asistanın.
          </p>
        </div>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {loading ? "Yönlendiriliyor…" : "Google ile devam et"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-neutral-400">
          Takvimini yalnızca okuruz. Hiçbir değişiklik senin onayın olmadan
          yapılmaz.
        </p>
      </div>
    </main>
  );
}
