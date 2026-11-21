"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DisplayTurn as Turn } from "@/lib/agent/history";
import { activityLabel } from "@/lib/agent/tool-labels";
import type { ChatStreamEvent } from "./api/chat/route";
import { useSpeechInput } from "./use-speech";
import { useSpeechOutput, type VoiceReplyMode } from "./use-speech-output";

const SUGGESTIONS = [
  "Günümü özetle",
  "Yarınki toplantılarım neler?",
  "Cumaya kadar sunumu bitirmem gerek, hatırlat",
  "Bu haftamı planla",
];

const MODE_LABEL: Record<VoiceReplyMode, string> = {
  voice: "Sesli sorunca",
  always: "Her zaman",
  off: "Sessiz",
};
const NEXT_MODE: Record<VoiceReplyMode, VoiceReplyMode> = { voice: "always", always: "off", off: "voice" };

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />}
    </svg>
  );
}

export function Chat({
  initialConversationId,
  initialTurns = [],
}: {
  initialConversationId?: string;
  initialTurns?: Turn[];
}) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const conversationId = useRef<string | undefined>(initialConversationId);
  const bottom = useRef<HTMLDivElement>(null);

  // Scroll to the latest message, but not on a fresh dashboard load
  // (that would push the morning summary off screen on phones).
  useEffect(() => {
    if (turns.length > 0) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  // Voice replies: spoken sentence by sentence while the answer streams.
  const voice = useSpeechOutput();

  function newChat() {
    voice.cancel();
    setTurns([]);
    conversationId.current = undefined;
    if (initialConversationId) router.replace("/");
  }

  // Voice input: show words live in the input, send when the user stops talking.
  const speech = useSpeechInput({
    onInterim: (text) => setInput(text),
    onFinal: (text) => send(text, true),
  });

  function startListening() {
    // Never let the mic hear Yaver's own voice.
    voice.cancel();
    // The mic tap is the user gesture iOS needs to allow the spoken reply later.
    if (voice.mode !== "off") voice.prime();
    speech.start();
  }

  function updateLast(fn: (t: Turn) => Turn) {
    setTurns((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);
  }

  async function send(text: string, viaVoice = false) {
    const message = text.trim();
    if (!message || busy) return;
    voice.cancel();
    const speak = voice.supported && (voice.mode === "always" || (voice.mode === "voice" && viaVoice));
    // Typed sends come from a tap, so they can unlock speech on iOS here.
    if (speak && !viaVoice) voice.prime();
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
          else if (e.type === "text") {
            updateLast((t) => ({ ...t, text: t.text + e.delta }));
            if (speak) voice.feed(e.delta);
          }
          else if (e.type === "tool") {
            const label = activityLabel(e.name);
            updateLast((t) => (t.tools.includes(label) ? t : { ...t, tools: [...t.tools, label] }));
          } else if (e.type === "error") updateLast((t) => ({ ...t, error: e.message }));
        }
      }
    } catch {
      updateLast((t) => ({ ...t, error: "Bağlantı kurulamadı. Lütfen tekrar dene." }));
    } finally {
      if (speak) voice.flush();
      setBusy(false);
      // New pending actions may have been created.
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[24rem] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] lg:min-h-[28rem]">
      {(turns.length > 0 || voice.supported) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2 sm:px-5">
          <span className="text-xs text-[var(--muted)]">
            {initialConversationId ? "Kayıtlı sohbet" : "Sohbet"}
          </span>
          <div className="flex items-center gap-3">
            {voice.speaking && (
              <button onClick={voice.cancel} className="text-xs font-medium text-red-500">
                ■ Durdur
              </button>
            )}
            {voice.supported && (
              <button
                onClick={() => voice.setMode(NEXT_MODE[voice.mode])}
                aria-label={`Sesli yanıt: ${MODE_LABEL[voice.mode]}. Değiştirmek için dokun.`}
                title="Sesli yanıt ayarı"
                className={`flex items-center gap-1 text-xs ${
                  voice.mode === "off" ? "text-[var(--muted)]" : "text-[var(--fg)]"
                }`}
              >
                <SpeakerIcon muted={voice.mode === "off"} />
                {MODE_LABEL[voice.mode]}
              </button>
            )}
            {turns.length > 0 && (
              <button
                onClick={newChat}
                disabled={busy}
                className="text-xs font-medium text-[var(--accent)] disabled:opacity-40"
              >
                + Yeni sohbet
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
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
                  className="rounded-full border border-[var(--border)] px-3.5 py-2 text-sm hover:border-[var(--accent)] active:bg-[var(--chip)]"
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
        className="border-t border-[var(--border)] p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={speech.listening}
            placeholder={speech.listening ? "Dinliyorum…" : "Yaver'e sor… (ör. Bugün ne yapmalıyım?)"}
            maxLength={4000}
            // 16px on phones: iOS zooms into inputs with smaller text.
            className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-[var(--muted)] sm:text-sm"
            enterKeyHint="send"
          />
          {speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : startListening}
              disabled={busy}
              aria-label={speech.listening ? "Dinlemeyi bitir" : "Sesle komut ver"}
              aria-pressed={speech.listening}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-40 ${
                speech.listening
                  ? "animate-pulse border-red-500 bg-red-500 text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <path d="M12 17v4" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            disabled={busy || speech.listening || !input.trim()}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-40"
          >
            Gönder
          </button>
        </div>
        {speech.error && <p className="px-1 pt-2 text-xs text-red-500">{speech.error}</p>}
      </form>
    </div>
  );
}
