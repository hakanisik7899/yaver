import Link from "next/link";
import { YaverBot } from "../yaver-bot";
import { WaitlistForm } from "./waitlist-form";

export const metadata = { title: "Beta'ya katıl · Yaver" };

export default function BetaPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass rise w-full max-w-md space-y-6 rounded-[2rem] p-8 text-center">
        <div className="space-y-3">
          <YaverBot size={120} className="mx-auto" />
          <h1 className="font-display text-3xl font-semibold">Yaver kapalı betada</h1>
          <p className="text-sm text-[var(--muted)]">
            Takvimini, e-postalarını ve faturalarını takip eden, planlayan ve yalnızca senin onayınla iş yapan
            asistan. Şu an sınırlı sayıda kişiyle deniyoruz; listeye katıl, sıra sana gelince davet edelim.
          </p>
        </div>
        <WaitlistForm />
        <p className="text-xs text-[var(--muted)]">
          Davet edildin mi?{" "}
          <Link href="/login" className="text-[var(--accent-2)] hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </main>
  );
}
