import Link from "next/link";

const NAV = [
  { href: "/", label: "Ana sayfa", key: "home" },
  { href: "/history", label: "Geçmiş", key: "history" },
  { href: "/trust", label: "Güven Merkezi", key: "trust" },
] as const;

export function AppHeader({ active }: { active: (typeof NAV)[number]["key"] }) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
        <img src="/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
        Yaver
      </Link>
      <nav className="flex items-center gap-1 overflow-x-auto text-sm">
        {NAV.map((n) => (
          <Link
            key={n.key}
            href={n.href}
            aria-current={active === n.key ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 ${
              active === n.key
                ? "bg-[var(--chip)] font-medium"
                : "text-[var(--muted)] hover:text-[var(--fg)]"
            }`}
          >
            {n.label}
          </Link>
        ))}
        <form action="/auth/signout" method="post">
          <button className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[var(--muted)] hover:text-[var(--fg)]">
            Çıkış
          </button>
        </form>
      </nav>
    </header>
  );
}
