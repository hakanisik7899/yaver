"use client";

import { useState, useTransition } from "react";
import { setWeatherCity } from "./actions";

/** City name with an inline "Değiştir" form; the server checks the city exists. */
export function CityEditor({ city }: { city: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(city);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="-mt-1 mb-3 flex items-center gap-2 text-xs text-[var(--muted)]">
        <span aria-hidden="true">📍</span>
        <span className="truncate">{city}</span>
        <button onClick={() => setEditing(true)} className="font-medium text-[var(--accent-2)] hover:underline">
          Değiştir
        </button>
      </div>
    );
  }

  return (
    <form
      className="-mt-1 mb-3 space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await setWeatherCity(value);
          if (res.ok) {
            setEditing(false);
            setError(null);
          } else setError(res.message);
        });
      }}
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          maxLength={80}
          placeholder="Şehir, ör. İzmir (ya da Yer, İl)"
          aria-label="Hava durumu için şehir"
          className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[rgba(5,8,22,0.55)] px-3 py-1.5 text-base outline-none focus:border-[var(--accent)] sm:text-sm"
        />
        <button
          disabled={pending || !value.trim()}
          className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setValue(city);
            setError(null);
          }}
          className="px-1 text-xs text-[var(--muted)]"
        >
          Vazgeç
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
