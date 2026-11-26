import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PLAN_LABEL } from "@/lib/plans/plans";
import { getPlan } from "@/lib/plans/usage";
import { createClient } from "@/lib/supabase/server";
import { ConnectionBanner } from "./connection-banner";
import { FeedbackButton } from "./feedback-button";
import { currentAdminId } from "@/lib/admin/server";

type NavKey = "home" | "history" | "trust" | "plan" | "admin";

const ADMIN_NAV = {
  key: "admin" as const,
  href: "/admin",
  label: "Yönetim",
  icon: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
};

const NAV: NavItem[] = [
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
    short: "Güven",
    icon: (
      <>
        <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    key: "plan",
    href: "/plan",
    label: "Planım",
    icon: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />,
  },
];

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** `short` is the phone tab label when `label` is too long to fit. */
type NavItem = { key: NavKey; href: string; label: string; short?: string; icon: ReactNode };

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-[0.95rem] transition 2xl:justify-start 2xl:px-3.5 ${
        active
          ? "bg-gradient-to-r from-[var(--accent)]/35 to-[var(--accent)]/10 font-medium text-white shadow-[inset_0_0_0_1px_var(--border-strong)]"
          : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--fg)]"
      }`}
    >
      <NavIcon>{item.icon}</NavIcon>
      <span className="hidden 2xl:inline">{item.label}</span>
    </Link>
  );
}

function PhoneLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.7rem] leading-tight ${
        active ? "bg-[var(--accent-soft)] font-medium text-white" : "text-[var(--muted)]"
      }`}
    >
      <NavIcon>{item.icon}</NavIcon>
      <span className="max-w-full truncate">{item.short ?? item.label}</span>
    </Link>
  );
}

/** "Yönetim" appears only for addresses in ADMIN_EMAILS. */
async function AdminLink({ variant, active }: { variant: "rail" | "phone"; active: boolean }) {
  if (!(await currentAdminId())) return null;
  return variant === "rail" ? <RailLink item={ADMIN_NAV} active={active} /> : <PhoneLink item={ADMIN_NAV} active={active} />;
}

async function UserCard() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const meta = (data?.claims?.user_metadata ?? {}) as { full_name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name ?? "Yaver kullanıcısı";
  const avatar = meta.avatar_url ?? meta.picture;
  const plan = data?.claims?.sub ? await getPlan(data.claims.sub) : "free";
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
        <Link
          href="/plan"
          title="Planım"
          className={`mt-0.5 inline-block rounded-full px-2 py-px text-[0.65rem] font-medium ${
            plan === "pro"
              ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-white"
              : "border border-[var(--border-strong)] text-[var(--muted)]"
          }`}
        >
          {PLAN_LABEL[plan]}
        </Link>
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
      <Suspense fallback={null}>
        <ConnectionBanner />
      </Suspense>
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
            <RailLink key={n.key} item={n} active={active === n.key} />
          ))}
          <Suspense fallback={null}>
            <AdminLink variant="rail" active={active === "admin"} />
          </Suspense>
        </nav>
        <div className="mt-auto pb-2">
          <FeedbackButton variant="rail" />
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <Suspense fallback={<div className="h-10" />}>
            <UserCard />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        {/* Phone top bar */}
        <header className="glass rise flex flex-col gap-1.5 rounded-2xl px-2 py-2 lg:hidden">
          {/* Row 1: brand + account actions */}
          <div className="flex items-center justify-between gap-2 px-1">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
              <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
              <span className="font-display text-lg font-semibold">Yaver</span>
            </Link>
            <div className="flex items-center gap-1">
              <FeedbackButton variant="phone" />
              <form action="/auth/signout" method="post">
                <button className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs text-[var(--muted)]">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
                  </svg>
                  Çıkış
                </button>
              </form>
            </div>
          </div>
          {/* Row 2: navigation tabs, icon above label so first-time users can read them */}
          <nav className="flex items-stretch gap-1 border-t border-[var(--border)] pt-1.5">
            {NAV.map((n) => (
              <PhoneLink key={n.key} item={n} active={active === n.key} />
            ))}
            <Suspense fallback={null}>
              <AdminLink variant="phone" active={active === "admin"} />
            </Suspense>
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}
