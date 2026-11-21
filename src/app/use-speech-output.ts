"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { takeSentences, toSpeakable } from "@/lib/speech/text";

/** When Yaver reads replies aloud. Stored per device: voices differ per device. */
export type VoiceReplyMode = "voice" | "always" | "off";

const STORAGE_KEY = "yaver.voiceReplies";
const CHANGE_EVENT = "yaver:voice-replies";

function readMode(): VoiceReplyMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "always" || v === "off" ? v : "voice";
  } catch {
    return "voice"; // storage blocked (private mode etc.)
  }
}

function subscribeMode(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const noopSubscribe = () => () => {};
const hasSynthesis = () => typeof window !== "undefined" && "speechSynthesis" in window;

function turkishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "tr-TR" && !v.localService) ?? // usually more natural
    voices.find((v) => v.lang?.toLowerCase().startsWith("tr"))
  );
}

/**
 * Reads assistant replies aloud with the browser's speech synthesis.
 * Feed streamed text with `feed`; complete sentences are spoken right away
 * (also avoids Chrome cutting off long utterances), the tail on `flush`.
 */
export function useSpeechOutput() {
  const supported = useSyncExternalStore(noopSubscribe, hasSynthesis, () => false);
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "voice" as VoiceReplyMode);
  const [speaking, setSpeaking] = useState(false);
  const buffer = useRef("");
  const pending = useRef(0);

  // Voices load asynchronously in Chrome; touching the list starts the load.
  useEffect(() => {
    if (hasSynthesis()) window.speechSynthesis.getVoices();
    return () => {
      if (hasSynthesis()) window.speechSynthesis.cancel();
    };
  }, []);

  const setMode = useCallback((m: VoiceReplyMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* not persisted; still applies until reload via the event below */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    if (m === "off" && hasSynthesis()) window.speechSynthesis.cancel();
  }, []);

  const speakNow = useCallback((raw: string) => {
    const text = toSpeakable(raw);
    if (!text || !hasSynthesis()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    const voice = turkishVoice();
    if (voice) u.voice = voice;
    u.rate = 1.05;
    pending.current++;
    setSpeaking(true);
    const done = () => {
      pending.current = Math.max(0, pending.current - 1);
      if (pending.current === 0) setSpeaking(false);
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  }, []);

  /** Add streamed text; speaks every sentence that is complete. */
  const feed = useCallback(
    (delta: string) => {
      buffer.current += delta;
      const { sentences, rest } = takeSentences(buffer.current);
      buffer.current = rest;
      for (const s of sentences) speakNow(s);
    },
    [speakNow],
  );

  /** Speak whatever is left once the reply is complete. */
  const flush = useCallback(() => {
    const rest = buffer.current;
    buffer.current = "";
    if (rest.trim()) speakNow(rest);
  }, [speakNow]);

  /** Stop talking now (new message, mic pressed, new chat, stop button). */
  const cancel = useCallback(() => {
    buffer.current = "";
    pending.current = 0;
    setSpeaking(false);
    if (hasSynthesis()) window.speechSynthesis.cancel();
  }, []);

  /**
   * iOS only allows speech that starts from a user gesture. Call this inside
   * the tap handler (mic / send); later utterances are then allowed.
   */
  const prime = useCallback(() => {
    if (!hasSynthesis()) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }, []);

  return { supported, mode, setMode, speaking, feed, flush, cancel, prime };
}
