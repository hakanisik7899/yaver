import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal/config";

/** Public layout for legal pages (readable without signing in). */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 p-4 sm:p-8">
      <header className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG icon */}
          <img src="/icon.svg" alt="" width={30} height={30} className="rounded-lg" />
          <span className="font-display text-lg font-semibold">Yaver</span>
        </Link>
        <nav className="flex gap-4 text-sm text-[var(--muted)]">
          <Link href="/gizlilik" className="hover:text-[var(--fg)]">
            Gizlilik ve KVKK
          </Link>
          <Link href="/kullanim-sartlari" className="hover:text-[var(--fg)]">
            Kullanım şartları
          </Link>
        </nav>
      </header>

      {LEGAL.draft && (
        <p className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Bu metin taslaktır ve hukuki incelemeden geçmemiştir. Köşeli parantez içindeki alanlar henüz doldurulmadı.
        </p>
      )}

      <article className="glass legal space-y-6 rounded-3xl p-5 text-[0.95rem] leading-relaxed sm:p-8">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="text-xs text-[var(--muted)]">Son güncelleme: {LEGAL.updated}</p>
        </div>
        {children}
      </article>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
