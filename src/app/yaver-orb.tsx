"use client";

import { useId } from "react";

/**
 * Yaver's assistant mark: a luminous orb carrying the "Y" from the app icon,
 * with a slowly turning halo. Original artwork (no third-party mascot).
 */
export function YaverOrb({ size = 220, className = "" }: { size?: number; className?: string }) {
  // Unique gradient ids per instance: a hidden copy (e.g. desktop vs phone
  // layout) must not own the gradients the visible copy points to.
  const id = useId().replace(/:/g, "");
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {/* Halo */}
      <svg viewBox="0 0 220 220" className="halo-spin absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={`halo-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5fd0ff" stopOpacity="0.9" />
            <stop offset="0.5" stopColor="#3b7bff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#5fd0ff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="104" fill="none" stroke={`url(#halo-${id})`} strokeWidth="1.5" />
        <circle cx="110" cy="6" r="3" fill="#5fd0ff" />
        <circle cx="214" cy="110" r="2" fill="#3b7bff" />
      </svg>

      {/* Orb */}
      <svg viewBox="0 0 220 220" className="orb-breathe absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id={`orb-${id}`} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#9fe3ff" />
            <stop offset="0.35" stopColor="#3b7bff" />
            <stop offset="0.8" stopColor="#14246b" />
            <stop offset="1" stopColor="#0a1238" />
          </radialGradient>
          <radialGradient id={`shine-${id}`} cx="0.35" cy="0.25" r="0.35">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="110" r="78" fill={`url(#orb-${id})`} />
        <circle cx="110" cy="110" r="78" fill={`url(#shine-${id})`} />
        <circle cx="110" cy="110" r="78" fill="none" stroke="#9fe3ff" strokeOpacity="0.35" strokeWidth="1" />
        {/* The Y mark */}
        <g fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
          <path d="M84 82 L110 113 L136 82" />
          <path d="M110 113 V140" />
        </g>
        <circle cx="139" cy="139" r="6.5" fill="#5fd0ff" />
      </svg>
    </div>
  );
}
