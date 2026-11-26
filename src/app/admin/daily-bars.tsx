"use client";

import { useState } from "react";

type Unit = "count" | "usd";

const usd = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = new Intl.NumberFormat("tr-TR");

function format(v: number, unit: Unit) {
  if (unit === "count") return count.format(v);
  if (v > 0 && v < 0.01) return "< $0,01";
  return usd.format(v);
}

function dayLabel(day: string) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${day}T00:00:00Z`));
}

const W = 600;
const H = 100;
const GAP = 2;

/**
 * One series of daily values as thin bars (single color, no legend: the
 * title names it). Hover or focus a bar to read its value; the same numbers
 * are in the table below the chart.
 */
export function DailyBars({ title, unit, data, total }: { title: string; unit: Unit; data: { day: string; value: number }[]; total: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const step = W / Math.max(data.length, 1);
  const barW = Math.max(step - GAP, 1);
  const shown = active === null ? null : data[active];

  return (
    <figure className="space-y-2 rounded-2xl border border-[var(--border)] p-3">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-[var(--muted)]">
          {shown ? (
            <>
              <span className="font-medium text-[var(--fg)]">{format(shown.value, unit)}</span> · {dayLabel(shown.day)}
            </>
          ) : (
            <>30 gün: <span className="font-medium text-[var(--fg)]">{total}</span></>
          )}
        </span>
      </figcaption>

      {max === 0 ? (
        <p className="flex h-24 items-center justify-center text-xs text-[var(--muted)]">Henüz veri yok</p>
      ) : (
        <div>
          <p className="text-right text-[0.7rem] text-[var(--muted)]">{format(max, unit)}</p>
        <svg viewBox={`0 0 ${W} ${H + 1}`} className="block h-auto w-full" role="img" aria-label={`${title}, son ${data.length} gün`}>
          {/* Recessive guide at the maximum (its value is printed above the chart) */}
          {max > 0 && <line x1={0} x2={W} y1={0.5} y2={0.5} stroke="var(--border)" strokeDasharray="3 4" />}
          {data.map((d, i) => {
            const h = max > 0 ? Math.max((d.value / max) * (H - 4), d.value > 0 ? 2 : 0) : 0;
            const x = i * step + GAP / 2;
            const y = H - h;
            const r = Math.min(4, barW / 2, h);
            // Rounded data end, square on the baseline.
            const path =
              h === 0
                ? ""
                : `M${x},${H} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${H} Z`;
            return (
              <g
                key={d.day}
                tabIndex={0}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                <title>{`${dayLabel(d.day)}: ${format(d.value, unit)}`}</title>
                {/* Hit target: the full column, larger than the bar */}
                <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
                {path && <path d={path} fill="#3b7bff" opacity={active === null || active === i ? 1 : 0.45} />}
              </g>
            );
          })}
          <line x1={0} x2={W} y1={H + 0.5} y2={H + 0.5} stroke="var(--border-strong)" />
        </svg>
          <div className="mt-1 flex justify-between text-[0.7rem] text-[var(--muted)]">
            <span>{dayLabel(data[0].day)}</span>
            <span>{dayLabel(data[Math.floor((data.length - 1) / 2)].day)}</span>
            <span>{dayLabel(data[data.length - 1].day)}</span>
          </div>
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-[var(--muted)]">Tablo</summary>
        <table className="mt-2 w-full">
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.day} className="border-t border-[var(--border)]">
                <td className="py-1 text-[var(--muted)]">{dayLabel(d.day)}</td>
                <td className="py-1 text-right tabular-nums">{format(d.value, unit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
