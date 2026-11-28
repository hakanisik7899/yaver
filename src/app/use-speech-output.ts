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
export function useSpeechOutput({ onDone }: { onDone?: () => void } = {}) {
  const supported = useSyncExternalStore(noopSubscribe, hasSynthesis, () => false);
  const mode = useSyncExternalStore(subscribeMode, readMode, () => "voice" as VoiceReplyMode);
  const [speaking, setSpeaking] = useState(false);
  const buffer = useRef("");
  const pending = useRef(0);
  // True once the whole reply has arrived (flush called). "Done" fires only
  // when the reply is complete AND nothing is left to say, so a pause
  // between streamed sentences is not mistaken for the end.
  const replyComplete = useRef(false);
  const doneHandler = useRef(onDone);
  useEffect(() => {
    doneHandler.current = onDone;
  });

  const maybeDone = useCallback(() => {
    if (replyComplete.current && pending.current === 0) {
      replyComplete.current = false;
      doneHandler.current?.();
    }
  }, []);

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

  const speakNow = useCallback((raw: string, hooks?: { onStart?: () => void; onError?: (error: string) => void }) => {
    const text = toSpeakable(raw);
    if (!text || !hasSynthesis()) return;
    const u = new SpeechSynthesisUtterance(text);
    if (hooks?.onStart) u.onstart = hooks.onStart;
    u.lang = "tr-TR";
    const voice = turkishVoice();
    if (voice) u.voice = voice;
    u.rate = 1.05;
    pending.current++;
    setSpeaking(true);
    const done = () => {
      pending.current = Math.max(0, pending.current - 1);
      if (pending.current === 0) {
        setSpeaking(false);
        maybeDone();
      }
    };
    u.onend = done;
    u.onerror = (e) => {
      done();
      hooks?.onError?.(e.error);
    };
    window.speechSynthesis.speak(u);
  }, [maybeDone]);

  /**
   * Say one short line now, outside a reply (e.g. the welcome). `onStart`
   * fires when audio really starts; browsers that block speech without a
   * user gesture fire `onError("not-allowed")` or simply never start.
   */
  const say = useCallback(
    (text: string, hooks?: { onStart?: () => void; onError?: (error: string) => void }) => speakNow(text, hooks),
    [speakNow],
  );

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
    replyComplete.current = true;
    if (rest.trim()) speakNow(rest);
    // Nothing (left) to say: report done right away.
    else maybeDone();
  }, [speakNow, maybeDone]);

  /** Stop talking now (new message, mic pressed, new chat, stop button). Never reports "done". */
  const cancel = useCallback(() => {
    buffer.current = "";
    replyComplete.current = false;
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

  return { supported, mode, setMode, speaking, feed, flush, cancel, prime, say };
}
