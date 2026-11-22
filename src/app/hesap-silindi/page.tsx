import Link from "next/link";

export const metadata = { title: "Hesap silindi · Yaver" };

export default function AccountDeletedPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="glass rise w-full max-w-sm space-y-4 rounded-[2rem] p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Hesabın silindi</h1>
        <p className="text-sm text-[var(--muted)]">
          Yaver&apos;in Google erişimi iptal edildi ve Yaver&apos;deki tüm verilerin kalıcı olarak silindi.
          Gmail&apos;ine kaydedilen taslaklar ve takvimine eklenen etkinlikler Google hesabında kalır.
        </p>
        <Link href="/login" className="inline-block text-sm text-[var(--accent-2)] hover:underline">
          Giriş sayfasına dön
        </Link>
      </div>
    </main>
  );
}
