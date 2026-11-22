"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DisplayTurn as Turn } from "@/lib/agent/history";
import { activityLabel } from "@/lib/agent/tool-labels";
import type { ChatStreamEvent } from "./api/chat/route";
import { useSpeechInput } from "./use-speech";
import { useSpeechOutput, type VoiceReplyMode } from "./use-speech-output";
import { isStopPhrase } from "@/lib/speech/text";
import { YaverOrb } from "./yaver-orb";

// Only things Yaver can actually do today.
const HERO_SUGGESTIONS = [
  "Günümü özetle",
  "Bu hafta hangi faturalarım var?",
  "Ailemle hafta sonu ne yapabiliriz?",
  "Yarın hava nasıl olacak?",
];

const QUICK_ACTIONS = [
  { label: "📅 Yarınki toplantılarım", prompt: "Yarınki toplantılarım neler?" },
  { label: "🗓️ Bu haftamı planla", prompt: "Bu haftamı planla" },
  { label: "✉️ Son e-postalarım", prompt: "Son gelen önemli e-postalarımı özetle" },
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

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
    </svg>
  );
}

export function Chat({
  firstName,
  initialConversationId,
  initialTurns = [],
}: {
  firstName?: string;
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

  // Hands-free conversation: listen → answer aloud → listen again.
  const [handsFree, setHandsFree] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const handsFreeRef = useRef(false); // read inside speech callbacks
  const silentTries = useRef(0);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  // Voice replies: spoken sentence by sentence while the answer streams.
  const voice = useSpeechOutput({
    onDone: () => {
      // Reply finished speaking: open the mic again (short pause so the
      // mic does not catch the tail of Yaver's own voice).
      if (handsFreeRef.current) {
        setTimeout(() => handsFreeRef.current && speech.start(), 350);
      }
    },
  });

  // Voice input: show words live in the input, send when the user stops talking.
  const speech = useSpeechInput({
    onInterim: (text) => setInput(text),
    onFinal: (text) => {
      if (handsFreeRef.current && isStopPhrase(text)) {
        setInput("");
        stopHandsFree("Görüşürüz!");
        return;
      }
      silentTries.current = 0;
      send(text, true);
    },
    onNothing: (error) => {
      if (!handsFreeRef.current) return;
      if (error === "not-allowed" || error === "service-not-allowed" || error === "audio-capture") {
        stopHandsFree();
        return;
      }
      // Give one more chance after silence, then end the conversation.
      silentTries.current += 1;
      if (silentTries.current >= 2) {
        stopHandsFree();
        setNotice("Bir süredir ses gelmediği için sesli sohbet kapandı.");
        return;
      }
      speech.start();
    },
  });

  function startHandsFree() {
    handsFreeRef.current = true;
    setHandsFree(true);
    setNotice(null);
    silentTries.current = 0;
    voice.cancel();
    voice.prime(); // the tap is the gesture iOS needs for later speech
    speech.start();
    // Keep the screen on while talking (supported on most phones).
    navigator.wakeLock
      ?.request("screen")
      .then((lock) => (wakeLock.current = lock))
      .catch(() => {});
  }

  function stopHandsFree(goodbye?: string) {
    handsFreeRef.current = false;
    setHandsFree(false);
    speech.abort(); // discard a half-heard sentence
    voice.cancel();
    if (goodbye) {
      voice.feed(goodbye + " ");
      voice.flush();
    }
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }

  // Leaving the page ends the conversation and frees the mic and screen lock.
  useEffect(
    () => () => {
      handsFreeRef.current = false;
      wakeLock.current?.release().catch(() => {});
    },
    [],
  );

  function newChat() {
    if (handsFreeRef.current) stopHandsFree();
    voice.cancel();
    setTurns([]);
    conversationId.current = undefined;
    if (initialConversationId) router.replace("/");
  }

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
    const speak =
      voice.supported &&
      (handsFreeRef.current || voice.mode === "always" || (voice.mode === "voice" && viaVoice));
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
          } else if (e.type === "error") {
            updateLast((t) => ({ ...t, error: e.message }));
            // In a hands-free conversation the user may not be looking.
            if (speak) voice.feed(e.message + " ");
          }
        }
      }
    } catch {
      const message = "Bağlantı kurulamadı. Lütfen tekrar dene.";
      updateLast((t) => ({ ...t, error: message }));
      if (speak) voice.feed(message + " ");
    } finally {
      if (speak) voice.flush();
      setBusy(false);
      // New pending actions may have been created.
      router.refresh();
    }
  }

  const bubble = (text: string, i: number, align: "left" | "right", compact = false) => (
    <button
      key={text}
      onClick={() => send(text)}
      disabled={busy}
      className={`glass drift group w-full rounded-2xl leading-snug transition ${compact ? "px-4 py-2.5 text-sm" : "px-5 py-4 text-[0.95rem]"} hover:border-[var(--border-strong)] hover:shadow-[0_0_30px_-8px_var(--accent)] disabled:opacity-50 ${
        align === "left" ? "text-left sm:text-right" : "text-left"
      }`}
      style={{ animationDelay: `${i * 0.8}s` }}
    >
      {text}
    </button>
  );

  return (
    <section className="glass rise @container relative flex min-h-[72dvh] flex-col overflow-hidden rounded-[2rem] lg:h-full lg:min-h-0">
      {/* Top controls */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-7 sm:pt-5">
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          {initialConversationId ? "Kayıtlı sohbet" : "Yaver"}
        </span>
        <div className="flex items-center gap-3">
          {voice.speaking && !handsFree && (
            <button onClick={voice.cancel} className="text-xs font-medium text-red-400">
              ■ Durdur
            </button>
          )}
          {voice.supported && !handsFree && (
            <button
              onClick={() => voice.setMode(NEXT_MODE[voice.mode])}
              aria-label={`Sesli yanıt: ${MODE_LABEL[voice.mode]}. Değiştirmek için dokun.`}
              title="Sesli yanıt ayarı"
              className={`flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs ${
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
              className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent-2)] disabled:opacity-40"
            >
              + Yeni sohbet
            </button>
          )}
        </div>
      </div>

      {handsFree && (
        <div
          role="status"
          aria-live="polite"
          className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] px-4 py-2.5 sm:mx-7"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                speech.listening ? "animate-pulse bg-red-500" : voice.speaking ? "bg-[var(--accent-2)]" : "bg-[var(--muted)]"
              }`}
            />
            {speech.listening ? "Dinliyorum…" : voice.speaking ? "Yaver konuşuyor…" : busy ? "Düşünüyor…" : "Sesli sohbet"}
          </span>
          <span className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--muted)] sm:inline">Bitirmek için &quot;tamam teşekkürler&quot; de</span>
            <button onClick={() => stopHandsFree()} className="rounded-xl bg-[var(--surface-solid)] px-3 py-1.5 text-xs font-medium text-red-400">
              Bitir
            </button>
          </span>
        </div>
      )}
      {notice && !handsFree && <p className="mx-5 mt-3 text-xs text-[var(--muted)] sm:mx-7">{notice}</p>}

      <div className="scroll-quiet flex-1 overflow-y-auto px-5 py-4 sm:px-7">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center pt-4 sm:pt-8">
            <h1 className="rise text-center font-display text-[2.2rem] font-semibold leading-[1.1] sm:text-5xl" style={{ animationDelay: "80ms" }}>
              Merhaba
              {firstName && (
                <>
                  ,{" "}
                  <span className="bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent)] bg-clip-text text-transparent">
                    {firstName}
                  </span>
                </>
              )}
              ! <span aria-hidden="true" className="whitespace-nowrap">👋</span>
              <br />
              Bugün ne yapalım?
            </h1>

            {/* Wide chat panel: bubbles flank the orb (container query, not viewport) */}
            <div className="rise mt-8 hidden w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-6 @2xl:grid" style={{ animationDelay: "200ms" }}>
              <div className="flex flex-col gap-5">{HERO_SUGGESTIONS.slice(0, 2).map((s, i) => bubble(s, i, "left"))}</div>
              <YaverOrb size={220} />
              <div className="flex flex-col gap-5">{HERO_SUGGESTIONS.slice(2).map((s, i) => bubble(s, i + 2, "right"))}</div>
            </div>

            {/* Narrow chat panel: orb on top, bubbles in a 2×2 grid */}
            <div className="rise mt-5 flex w-full max-w-xl flex-col items-center gap-4 @2xl:hidden" style={{ animationDelay: "200ms" }}>
              <YaverOrb size={130} />
              <div className="grid w-full grid-cols-2 gap-2.5">{HERO_SUGGESTIONS.map((s, i) => bubble(s, i, "right", true))}</div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-md bg-gradient-to-br from-[var(--accent)] to-[#2a5fe0] px-4 py-2.5 text-[0.95rem] text-white shadow-[0_10px_30px_-12px_var(--accent)]">
                    {t.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <MiniOrb />
                  <div className="min-w-0 max-w-[90%] space-y-2">
                    {t.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.tools.map((tool) => (
                          <span key={tool} className="rounded-full border border-[var(--border)] bg-[var(--chip)] px-2.5 py-0.5 text-xs text-[var(--muted)]">
                            {tool}
                          </span>
                        ))}
                      </div>
                    )}
                    {t.text ? (
                      <div className="glass whitespace-pre-wrap rounded-3xl rounded-tl-md px-4 py-3 text-[0.95rem] leading-relaxed">{t.text}</div>
                    ) : (
                      !t.error &&
                      busy &&
                      i === turns.length - 1 && (
                        <p className="flex items-center gap-2 pt-2 text-sm text-[var(--muted)]">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-2)]" />
                          Düşünüyor…
                        </p>
                      )
                    )}
                    {t.error && <p className="text-sm text-red-400">{t.error}</p>}
                  </div>
                </div>
              ),
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="px-4 pb-4 sm:px-7 sm:pb-6"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          {speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : startListening}
              disabled={busy || handsFree}
              aria-label={speech.listening ? "Dinlemeyi bitir" : "Sesle komut ver"}
              aria-pressed={speech.listening}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 ${
                speech.listening
                  ? "animate-pulse border-red-500 bg-red-500 text-white"
                  : "glass text-[var(--fg)] hover:border-[var(--border-strong)]"
              }`}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <path d="M12 17v4" />
              </svg>
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={speech.listening}
            placeholder={speech.listening ? "Dinliyorum…" : "Mesajını yaz…"}
            maxLength={4000}
            // 16px on phones: iOS zooms into inputs with smaller text.
            className="h-12 min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[rgba(5,8,22,0.55)] px-5 text-base outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:shadow-[0_0_0_4px_var(--accent-soft)] sm:text-[0.95rem]"
            enterKeyHint="send"
          />
          <button
            type="submit"
            disabled={busy || speech.listening || !input.trim()}
            aria-label="Gönder"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent-2)] to-[var(--accent)] text-white shadow-[0_8px_24px_-6px_var(--accent)] transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M3.4 20.4 21 12 3.4 3.6l-.1 6.5L15 12 3.3 13.9z" />
            </svg>
          </button>
        </div>
        {speech.error && <p className="mx-auto max-w-3xl px-2 pt-2 text-xs text-red-400">{speech.error}</p>}

        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => send(q.prompt)}
              disabled={busy}
              className="rounded-full border border-[var(--border)] bg-[var(--chip)] px-3.5 py-1.5 text-xs text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-40"
            >
              {q.label}
            </button>
          ))}
          {voice.supported && speech.supported && !handsFree && (
            <button
              type="button"
              onClick={startHandsFree}
              disabled={busy}
              title="Elini kullanmadan karşılıklı konuş"
              className="flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-medium text-[var(--fg)] disabled:opacity-40"
            >
              <HeadsetIcon />
              Sesli sohbet
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function MiniOrb() {
  return (
    <span
      aria-hidden="true"
      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#9fe3ff,#3b7bff_45%,#14246b)] shadow-[0_0_14px_rgba(59,123,255,0.6)]"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 6l5 6 5-6M12 12v6" />
      </svg>
    </span>
  );
}
