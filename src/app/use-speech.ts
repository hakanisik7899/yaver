"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Minimal typings: the Web Speech API is not in every TS DOM lib, and
// Safari/Chrome still expose it as webkitSpeechRecognition.
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verebilirsin.",
  "service-not-allowed": "Bu tarayıcıda ses tanıma kullanılamıyor.",
  "no-speech": "Ses algılanamadı, tekrar dene.",
  "audio-capture": "Mikrofon bulunamadı.",
  network: "Ses tanıma için internet bağlantısı gerekiyor.",
};

/**
 * Turkish dictation. `onFinal` gets the full transcript when the user stops
 * speaking; `onInterim` streams partial text so it can be shown live.
 */
export function useSpeechInput({
  onInterim,
  onFinal,
}: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
}) {
  // false on the server and during hydration, the real value in the browser.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const transcript = useRef("");
  // Keep latest callbacks without re-creating the recognizer.
  const handlers = useRef({ onInterim, onFinal });
  useEffect(() => {
    handlers.current = { onInterim, onFinal };
  });

  useEffect(() => () => rec.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = "tr-TR";
    r.interimResults = true;
    r.continuous = false; // stop automatically after a pause
    transcript.current = "";
    setError(null);

    r.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      transcript.current = text.trim();
      handlers.current.onInterim(transcript.current);
    };
    r.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Ses tanıma başarısız oldu.");
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      if (transcript.current) handlers.current.onFinal(transcript.current);
    };

    rec.current = r;
    setListening(true);
    r.start();
  }, []);

  /** Stops listening; whatever was heard so far is still sent. */
  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}
