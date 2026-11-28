import Link from "next/link";
import type { ReactNode } from "react";
import type { PersonaId } from "@/lib/personas";
import { YaverBot } from "./yaver-bot";

/**
 * Glass card used across the dashboard. `delay` staggers the entrance (ms).
 * `fill`: on large screens the card takes the remaining column height and
 * its body scrolls inside, so the whole dashboard fits one screen.
 */
export function Card({
  title,
  action,
  children,
  delay = 0,
  fill = false,
  persona,
  className = "",
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  delay?: number;
  fill?: boolean;
  /** Assistant character shown next to the title (the area this card belongs to). */
  persona?: PersonaId;
  className?: string;
}) {
  return (
    <section
      className={`glass rise flex flex-col rounded-3xl p-4 ${fill ? "lg:min-h-0 lg:flex-1" : "shrink-0"} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[0.98rem] font-semibold">
          {persona && <YaverBot persona={persona} variant="avatar" size={26} />}
          {title}
        </h2>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-[var(--accent-2)] hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      <div className={fill ? "scroll-quiet lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1" : ""}>{children}</div>
    </section>
  );
}

export const CardLoading = () => <p className="text-sm text-[var(--muted)]">Yükleniyor…</p>;
