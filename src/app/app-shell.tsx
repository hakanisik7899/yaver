import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

type NavKey = "home" | "history" | "trust";

const NAV: { key: NavKey; href: string; label: string; icon: ReactNode }[] = [
  {
    key: "home",
    href: "/",
    label: "Sohbet",
    icon: <path d="M4 5h16v11H8l-4 4z" />,
  },
  {
    key: "history",
    href: "/history",
    label: "Geçmiş",
    icon: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
  },
  {
    key: "trust",
    href: "/trust",
    label: "Güven Merkezi",
    icon: (
      <>
        <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
];

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

async function UserCard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const meta = (data?.claims?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name ?? "Yaver kullanıcısı";
  const avatar = meta.avatar_url ?? meta.picture;
  return (
    <div className="flex flex-col items-center gap-2 2xl:flex-row 2xl:gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google avatar, external
        <img src={avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full ring-2 ring-[var(--border-strong)]" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] font-display font-semibold">
          {name[0]}
        </div>
      )}
      <div className="min-w-0 text-center 2xl:text-left">
        <p className="hidden truncate text-sm font-medium 2xl:block">{name}</p>
        <form action="/auth/signout" method="post">
          <button title="Çıkış yap" className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">
            <span className="2xl:hidden">Çıkış</span>
            <span className="hidden 2xl:inline">Çıkış yap</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Signed-in layout: left rail on desktop (brand, navigation, user card),
 * compact top bar with the same navigation on phones.
 */
export function AppShell({ active, children }: { active: NavKey; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1880px] flex-1 gap-5 p-3 sm:p-5">
      {/* Desktop rail */}
      <aside className="glass rise sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-[76px] shrink-0 flex-col rounded-3xl p-3 lg:flex 2xl:w-60 2xl:p-4">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 pt-1 2xl:justify-start 2xl:px-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img src="/icon.svg" alt="" width={34} height={34} className="rounded-xl" />
          <span className="hidden font-display text-xl font-semibold 2xl:inline">Yaver</span>
          <span className="hidden h-2 w-2 rounded-full bg-[var(--accent-2)] shadow-[0_0_10px_var(--accent-2)] 2xl:inline-block" title="Aktif" />
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              aria-current={active === n.key ? "page" : undefined}
              title={n.label}
              className={`flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-[0.95rem] transition 2xl:justify-start 2xl:px-3.5 ${
                active === n.key
                  ? "bg-gradient-to-r from-[var(--accent)]/35 to-[var(--accent)]/10 font-medium text-white shadow-[inset_0_0_0_1px_var(--border-strong)]"
                  : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--fg)]"
              }`}
            >
              <NavIcon>{n.icon}</NavIcon>
              <span className="hidden 2xl:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[var(--border)] pt-4">
          <Suspense fallback={<div className="h-10" />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Phone top bar */}
        <header className="glass rise flex items-center justify-between gap-3 rounded-2xl px-3 py-2 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
            <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            <span className="font-display text-lg font-semibold">Yaver</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={active === n.key ? "page" : undefined}
                aria-label={n.label}
                className={`rounded-xl p-2 ${active === n.key ? "bg-[var(--accent-soft)] text-white" : "text-[var(--muted)]"}`}
              >
                <NavIcon>{n.icon}</NavIcon>
              </Link>
            ))}
            <form action="/auth/signout" method="post">
              <button aria-label="Çıkış yap" className="rounded-xl p-2 text-[var(--muted)]">
                <NavIcon>
                  <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
                </NavIcon>
              </button>
            </form>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
