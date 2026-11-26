"use client";

import { useState } from "react";
import { startGoogleSignIn } from "@/lib/google/sign-in";

export function ReconnectButton() {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        setFailed(false);
        const { error } = await startGoogleSignIn();
        if (error) {
          setFailed(true);
          setLoading(false);
        }
      }}
      className="shrink-0 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
    >
      {loading ? "Yönlendiriliyor…" : failed ? "Tekrar dene" : "Yeniden bağlan"}
    </button>
  );
}
