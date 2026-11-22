"use client";

import { useEffect, useState, useTransition } from "react";
import type { NotificationPrefs } from "@/lib/notifications/rules";
import {
  removePushSubscription,
  saveNotificationPrefs,
  savePushSubscription,
  sendTestNotification,
} from "../actions";

type DeviceState = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

const KINDS: { key: keyof Omit<NotificationPrefs, "quiet_start" | "quiet_end">; label: string; hint: string }[] = [
  { key: "meetings", label: "Yaklaşan toplantılar", hint: "Başlamadan yaklaşık 15 dakika önce" },
  { key: "briefing", label: "Sabah özeti hazır", hint: "Sessiz saatler bitince, günde bir kez" },
  { key: "overdue_tasks", label: "Gecikmiş görevler", hint: "Saat 09:00'dan sonra, günde bir kez" },
  { key: "bills", label: "Yaklaşan faturalar", hint: "Son ödeme tarihinden 2 gün önce, gündüz" },
  { key: "approvals", label: "Onay bekleyen işlemler", hint: "Bir saatten uzun beklerse, bir kez" },
];

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function detectSupport(): DeviceState | null {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIOS && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  return null;
}

export function NotificationSettings({
  initialPrefs,
  deviceCount,
}: {
  initialPrefs: NotificationPrefs;
  deviceCount: number;
}) {
  const [device, setDevice] = useState<DeviceState>("checking");
  const [prefs, setPrefs] = useState(initialPrefs);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const blocked = detectSupport();
    const check = blocked
      ? Promise.resolve(blocked)
      : navigator.serviceWorker
          .getRegistration("/")
          .then((reg) => reg?.pushManager.getSubscription())
          .then((sub): DeviceState => (sub ? "on" : "off"))
          .catch((): DeviceState => "off");
    check.then(setDevice);
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setDevice(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        await navigator.serviceWorker.ready;
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
          }));
        const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
        if (!res.ok) throw new Error("save failed");
        setDevice("on");
        setMessage("Bu cihazda bildirimler açıldı.");
      } catch (err) {
        console.error(err);
        setMessage("Bildirimler açılamadı. Tekrar dene.");
      }
    });
  }

  function disable() {
    setMessage(null);
    startTransition(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setDevice("off");
      setMessage("Bu cihazda bildirimler kapatıldı.");
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const res = await sendTestNotification();
      setMessage(
        res.ok
          ? "Deneme bildirimi gönderildi; birkaç saniye içinde gelmeli."
          : res.result === "no_devices"
            ? "Kayıtlı cihaz yok. Önce bildirimleri aç."
            : "Gönderilemedi.",
      );
    });
  }

  function save(next: NotificationPrefs) {
    setPrefs(next);
    startTransition(async () => {
      const res = await saveNotificationPrefs(next);
      if (!res.ok) setMessage("Tercihler kaydedilemedi.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {device === "checking" && <p className="text-sm text-[var(--muted)]">Kontrol ediliyor…</p>}
        {device === "unsupported" && (
          <p className="text-sm text-[var(--muted)]">Bu tarayıcı bildirimleri desteklemiyor.</p>
        )}
        {device === "ios-install" && (
          <p className="text-sm text-[var(--muted)]">
            iPhone&apos;da bildirim almak için önce Safari&apos;de Paylaş → <b>Ana Ekrana Ekle</b> ile Yaver&apos;i
            ekle, sonra ana ekrandaki ikondan açıp buraya dön.
          </p>
        )}
        {device === "denied" && (
          <p className="text-sm text-[var(--muted)]">
            Bildirim izni bu cihazda engellenmiş. Tarayıcı ya da telefon ayarlarından Yaver için bildirimlere izin ver.
          </p>
        )}
        {(device === "off" || device === "on") && (
          <div className="flex flex-wrap items-center gap-2">
            {device === "off" ? (
              <button
                onClick={enable}
                disabled={pending}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
              >
                Bu cihazda bildirimleri aç
              </button>
            ) : (
              <>
                <span className="text-sm">Bu cihazda açık ✓</span>
                <button
                  onClick={test}
                  disabled={pending}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Deneme bildirimi gönder
                </button>
                <button
                  onClick={disable}
                  disabled={pending}
                  className="rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] hover:text-red-500 disabled:opacity-50"
                >
                  Kapat
                </button>
              </>
            )}
          </div>
        )}
        <p className="text-xs text-[var(--muted)]">Bildirim alan cihaz sayısı: {deviceCount}</p>
        {message && <p className="text-xs text-[var(--accent)]">{message}</p>}
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {KINDS.map((k) => (
          <li key={k.key} className="flex items-center justify-between gap-4 py-2.5">
            <div className="text-sm">
              <p>{k.label}</p>
              <p className="text-xs text-[var(--muted)]">{k.hint}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[k.key]}
              onChange={(e) => save({ ...prefs, [k.key]: e.target.checked })}
              className="h-5 w-5 accent-[var(--accent)]"
              aria-label={k.label}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Sessiz saatler:</span>
        <input
          type="time"
          value={prefs.quiet_start}
          onChange={(e) => e.target.value && save({ ...prefs, quiet_start: e.target.value })}
          className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-base sm:text-sm"
          aria-label="Sessiz saat başlangıcı"
        />
        <span>–</span>
        <input
          type="time"
          value={prefs.quiet_end}
          onChange={(e) => e.target.value && save({ ...prefs, quiet_end: e.target.value })}
          className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-1 text-base sm:text-sm"
          aria-label="Sessiz saat bitişi"
        />
      </div>
      <p className="text-xs text-[var(--muted)]">Sessiz saatlerde hiçbir bildirim gönderilmez.</p>
    </div>
  );
}
