import Link from "next/link";
import type { ReactNode } from "react";

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
  className = "",
}: {
  title: string;
  action?: { href: string; label: string };
  children: ReactNode;
  delay?: number;
  fill?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`glass rise flex flex-col rounded-3xl p-4 ${fill ? "lg:min-h-0 lg:flex-1" : "shrink-0"} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-2.5 flex shrink-0 items-center justify-between gap-3">
        <h2 className="font-display text-[0.98rem] font-semibold">{title}</h2>
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
