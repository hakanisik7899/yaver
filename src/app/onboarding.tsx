"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";
import { YaverBot } from "./yaver-bot";

const STEPS = [
  {
    title: "Yaver'e hoş geldin 👋",
    body: (
      <>
        <p>
          Takvimini, görevlerini, e-postalarını ve faturalarını bilen bir asistanım. Bana normal konuşur gibi yaz
          ya da mikrofona söyle:
        </p>
        <ul className="space-y-1.5">
          {["“Günümü özetle”", "“Bu hafta hangi faturalarım var?”", "“Yarın 14:00'e diş hekimi ekle”", "“Ahmet'in son e-postasına yanıt hazırla”"].map((t) => (
            <li key={t} className="rounded-xl bg-[var(--chip)] px-3 py-2">
              {t}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    title: "Senin onayın olmadan değiştirmem",
    body: (
      <>
        <p>
          Okumak serbest, değiştirmek onaya bağlı. Takvimine bir şey eklemek ya da Gmail&apos;e taslak kaydetmek
          istediğimde önce <strong>Onay bekleyenler</strong> listesine düşer; sen onaylarsan yaparım.
        </p>
        <p>E-posta göndermem, ödeme yapmam. Görev listen gibi yalnızca Yaver içindeki şeyleri hemen güncellerim.</p>
        <p>
          Neyi okuduğumu ve yaptığımı <strong>Güven Merkezi</strong>&apos;nde görebilir, istediğin aracı
          kapatabilirsin.
        </p>
      </>
    ),
  },
  {
    title: "Son dokunuşlar",
    body: (
      <ul className="space-y-2.5">
        <li>
          <strong>📱 Telefona ekle:</strong> iPhone&apos;da Safari → Paylaş → Ana Ekrana Ekle; Android&apos;de Chrome
          menüsü → Uygulamayı yükle.
        </li>
        <li>
          <strong>🔔 Bildirimler:</strong> toplantıdan önce, sabah özeti ve faturalar için{" "}
          <Link href="/trust" className="text-[var(--accent-2)] hover:underline">
            Güven Merkezi
          </Link>
          &apos;nden aç.
        </li>
        <li>
          <strong>⛅ Hava durumu:</strong> ana ekrandaki kartta &quot;Değiştir&quot;e dokunup şehrini seç.
        </li>
        <li>
          <strong>💬 Geri bildirim:</strong> bir şey ters giderse ya da aklına bir fikir gelirse menüdeki geri bildirim
          simgesine dokun. Betadasın, her mesajı okuyoruz.
        </li>
      </ul>
    ),
  },
];

/** First-run introduction: shown once, can be skipped. */
export function Onboarding() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [, startTransition] = useTransition();
  if (!open) return null;

  const finish = () => {
    setOpen(false);
    startTransition(async () => void (await completeOnboarding()));
  };
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="ob-title" className="glass rise w-full max-w-md space-y-4 rounded-3xl p-6">
        {step === 0 && <YaverBot size={90} className="mx-auto" />}
        <h2 id="ob-title" className="font-display text-xl font-semibold">
          {STEPS[step].title}
        </h2>
        <div className="space-y-3 text-sm leading-relaxed">{STEPS[step].body}</div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5" aria-label={`Adım ${step + 1} / ${STEPS.length}`}>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-[var(--accent-2)]" : "w-1.5 bg-[var(--border-strong)]"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {!last && (
              <button onClick={finish} className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]">
                Atla
              </button>
            )}
            <button
              onClick={() => (last ? finish() : setStep(step + 1))}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              {last ? "Başlayalım" : "İleri"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
