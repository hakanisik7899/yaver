import Image from "next/image";
import { useId } from "react";
import { PERSONAS, type PersonaId } from "@/lib/personas";

/**
 * Yaver's assistant robot, from the user's own artwork (public/assistant/).
 * The original transparent PNG is kept as optimized WebP: the full figure
 * and a square head crop for small round avatars.
 *
 * Every persona uses this robot for now; the persona sets the avatar's
 * accent ring. When the user supplies a robot for another area, add it to
 * PERSONA_ART and it is used there automatically.
 *
 * - "hero": full figure with the turning halo (chat hero, login, beta, onboarding)
 * - "avatar": round head badge (chat replies, card headers)
 *
 * `animated` heroes blink and move their mouth. The face layers are cut
 * from the same PNG (closed-eye patch, mouthless skin, mouth sprite), so at
 * rest the figure is pixel-for-pixel the original. Boxes are percentages of
 * the full image; regenerate them together with the layer files.
 */
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Art {
  full: string;
  head: string;
  face?: {
    eyesClosed: string;
    eyes: Box;
    mouthSkin: string;
    mouth: string;
    /** Mouth position on the full figure. */
    mouthBox: Box;
    /** Same mouth on the head crop used by avatars. */
    headMouthBox: Box;
  };
}

const DEFAULT_ART: Art = {
  full: "/assistant/yaver-robot.webp",
  head: "/assistant/yaver-robot-head.webp",
  face: {
    eyesClosed: "/assistant/yaver-robot-eyes-closed.webp",
    eyes: { left: 29.024, top: 15.244, width: 32.861, height: 13.872 },
    mouthSkin: "/assistant/yaver-robot-mouth-skin.webp",
    mouth: "/assistant/yaver-robot-mouth.webp",
    mouthBox: { left: 41.034, top: 28.354, width: 13.011, height: 7.622 },
    headMouthBox: { left: 52.32, top: 63.52, width: 24.96, height: 16 },
  },
};
const PERSONA_ART: Partial<Record<PersonaId, Art>> = {};

// Intrinsic sizes of the files above (used for layout, not display size).
const FULL_W = 600;
const FULL_H = 657;
const HEAD = 192;

const pct = (b: Box) => ({ left: `${b.left}%`, top: `${b.top}%`, width: `${b.width}%`, height: `${b.height}%` });

export function YaverBot({
  persona = "general",
  variant = "hero",
  size = 220,
  className = "",
  priority = false,
  animated = false,
  talking = false,
}: {
  persona?: PersonaId;
  variant?: "hero" | "avatar";
  size?: number;
  className?: string;
  /** Preload the image (only for the main above-the-fold copy). */
  priority?: boolean;
  /** Hero only: blink and move the mouth now and then. */
  animated?: boolean;
  /** Avatar only: move the mouth continuously (while a reply is written or spoken). */
  talking?: boolean;
}) {
  // Per-instance gradient id: a hidden copy (desktop vs phone layout) must
  // not own the gradient the visible copy points to.
  const haloId = `yaver-halo-${useId().replace(/:/g, "")}`;
  const art = PERSONA_ART[persona] ?? DEFAULT_ART;
  const accent = PERSONAS[persona].accent;

  if (variant === "avatar") {
    return (
      <span
        className={`relative inline-block shrink-0 overflow-hidden rounded-full ${className}`}
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 50% 35%, #1d2c63, #0a1130 75%)",
          boxShadow: `0 0 12px -2px ${accent}88, inset 0 0 0 1px ${accent}66`,
        }}
        aria-hidden="true"
      >
        {/* unoptimized: the mouth layers below must line up with this exact file */}
        <Image src={art.head} alt="" width={HEAD} height={HEAD} unoptimized className="h-full w-full object-cover" />
        {talking && art.face && (
          <>
            <Image src={art.face.mouthSkin} alt="" width={1} height={1} unoptimized className="absolute max-w-none" style={pct(art.face.headMouthBox)} />
            <Image src={art.face.mouth} alt="" width={1} height={1} unoptimized className="bot-mouth-talk absolute max-w-none" style={pct(art.face.headMouthBox)} />
          </>
        )}
      </span>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {/* Halo */}
      <svg viewBox="0 0 220 220" className="halo-spin absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={haloId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5fd0ff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#3b7bff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#5fd0ff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="104" fill="none" stroke={`url(#${haloId})`} strokeWidth="1.5" />
        <circle cx="110" cy="6" r="3" fill="#5fd0ff" />
        <circle cx="214" cy="110" r="2" fill="#3b7bff" />
      </svg>
      {/* Soft glow behind the robot */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(59,123,255,0.35),transparent_70%)]" />
      {/* Figure box with the image's own aspect ratio, so the face layers line up */}
      <div
        className="drift absolute top-[4%] left-1/2 h-[92%] -translate-x-1/2 drop-shadow-[0_10px_24px_rgba(59,123,255,0.45)]"
        style={{ aspectRatio: `${FULL_W} / ${FULL_H}` }}
      >
        {/* unoptimized: every layer is served as-is, so they stay pixel-aligned */}
        <Image src={art.full} alt="" width={FULL_W} height={FULL_H} priority={priority} unoptimized className="h-full w-full" />
        {animated && art.face && (
          <>
            <Image src={art.face.mouthSkin} alt="" width={1} height={1} unoptimized className="absolute max-w-none" style={pct(art.face.mouthBox)} />
            <Image src={art.face.mouth} alt="" width={1} height={1} unoptimized className="bot-mouth absolute max-w-none" style={pct(art.face.mouthBox)} />
            <Image src={art.face.eyesClosed} alt="" width={1} height={1} unoptimized className="bot-blink absolute max-w-none" style={pct(art.face.eyes)} />
          </>
        )}
      </div>
    </div>
  );
}
