"use client";

import { useEffect, useRef } from "react";
import { greetingText } from "@/lib/speech/greeting";

type SayHooks = { onStart?: () => void; onError?: (error: string) => void };

/** Once per browser session: a reload does not repeat it, a new app launch does. */
const SESSION_KEY = "yaver.greeted";
/** Browsers that block speech without a gesture often just stay silent. */
const START_TIMEOUT_MS = 1500;
const VOICES_WAIT_MS = 1500;

/**
 * Speaks the welcome ("Merhaba, <ad>! Ben asistanın Yaver! Bugün ne
 * yapalım?") when the user opens Yaver. Skipped when voice replies are set
 * to "Sessiz". Most browsers (iOS, Chrome) refuse speech before the user has
 * touched the page; then the welcome plays on the first tap or key press.
 * Taps on elements marked `data-no-greeting` (the mic buttons) cancel it
 * instead, so the microphone does not record Yaver's own voice.
 */
export function useGreeting({
  enabled,
  firstName,
  supported,
  mode,
  say,
}: {
  enabled: boolean;
  firstName?: string;
  supported: boolean;
  mode: "voice" | "always" | "off";
  say: (text: string, hooks?: SayHooks) => void;
}) {
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });

  useEffect(() => {
    if (!enabled || !supported || mode === "off") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* storage blocked: greet anyway */
    }

    const text = greetingText(firstName);
    let finished = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let voicesTimer: ReturnType<typeof setTimeout> | undefined;

    const removeGesture = () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    };
    const finish = () => {
      finished = true;
      clearTimeout(timer);
      removeGesture();
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    const armGesture = () => {
      if (finished) return;
      window.addEventListener("pointerdown", onGesture, true);
      window.addEventListener("keydown", onGesture, true);
    };
    function onGesture(e: Event) {
      removeGesture();
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("[data-no-greeting]")) return finish();
      attempt(true);
    }
    function attempt(fromGesture: boolean) {
      if (finished) return;
      let started = false;
      sayRef.current(text, {
        onStart: () => {
          started = true;
          finish();
        },
        onError: (error) => {
          if (!started && !fromGesture && error === "not-allowed") armGesture();
        },
      });
      // A try started by a tap is the last one, even if the device stays silent.
      if (fromGesture) return finish();
      timer = setTimeout(() => {
        if (started || finished) return;
        window.speechSynthesis.cancel(); // drop the queued, blocked utterance
        armGesture();
      }, START_TIMEOUT_MS);
    }

    // Chrome loads voices asynchronously; wait briefly so a Turkish voice is used.
    const start = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", start);
      clearTimeout(voicesTimer);
      attempt(false);
    };
    if (window.speechSynthesis.getVoices().length) start();
    else {
      window.speechSynthesis.addEventListener("voiceschanged", start);
      voicesTimer = setTimeout(start, VOICES_WAIT_MS);
    }

    return () => {
      finished = true;
      clearTimeout(timer);
      clearTimeout(voicesTimer);
      removeGesture();
      window.speechSynthesis.removeEventListener("voiceschanged", start);
    };
  }, [enabled, supported, mode, firstName]);
}
