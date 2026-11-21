"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChatStreamEvent } from "./api/chat/route";

interface Turn {
  role: "user" | "assistant";
  text: string;
  tools: string[];
  error?: string;
}

const TOOL_LABELS: Record<string, string> = {
  get_current_datetime: "Tarih kontrol edildi",
  list_calendar_events: "Takvim okundu",
  find_free_slots: "Boş zamanlar hesaplandı",
};

const SUGGESTIONS = [
  "Günümü özetle",
  "Yarınki toplantılarım neler?",
  "Bu hafta spor için boş zamanım var mı?",
  "Hafta sonu programım nasıl?",
];

export function Chat() {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const conversationId = useRef<string | undefined>(undefined);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function updateLast(fn: (t: Turn) => Turn) {
    setTurns((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setTurns((prev) => [
      ...prev,
      { role: "user", text: message, tools: [] },
      { role: "assistant", text: "", tools: [] },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId.current, message }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const e = JSON.parse(line) as ChatStreamEvent;
          if (e.type === "start") conversationId.current = e.conversationId;
          else if (e.type === "text") updateLast((t) => ({ ...t, text: t.text + e.delta }));
          else if (e.type === "tool") {
            const label = TOOL_LABELS[e.name] ?? e.name;
            updateLast((t) => (t.tools.includes(label) ? t : { ...t, tools: [...t.tools, label] }));
          } else if (e.type === "error") updateLast((t) => ({ ...t, error: e.message }));
        }
      }
    } catch {
      updateLast((t) => ({ ...t, error: "Bağlantı kurulamadı. Lütfen tekrar dene." }));
    } finally {
      setBusy(false);
      // New pending actions may have been created.
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[28rem] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted)]">
              Ne istediğini yaz; takvimine bakıp planlamana yardım edeyim.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl bg-[var(--accent-soft)] px-4 py-2 text-sm">{t.text}</p>
            </div>
          ) : (
            <div key={i} className="max-w-[90%] space-y-2">
              {t.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.tools.map((tool) => (
                    <span key={tool} className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {tool}
                    </span>
                  ))}
                </div>
              )}
              {t.text ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.text}</p>
              ) : (
                !t.error && busy && i === turns.length - 1 && (
                  <p className="text-sm text-[var(--muted)]">Düşünüyor…</p>
                )
              )}
              {t.error && <p className="text-sm text-red-500">{t.error}</p>}
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-[var(--border)] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Yaver'e sor… (ör. Bugün ne yapmalıyım?)"
          maxLength={4000}
          className="flex-1 rounded-lg bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-40"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
