import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayLocal } from "@/lib/time";
import { decide } from "@/lib/tools/policy";
import type { PermissionMode } from "@/lib/tools/types";
import { describeWeather, weatherEmoji } from "@/lib/weather/codes";
import { forecast, geocode, type Forecast } from "@/lib/weather/open-meteo";
import { Card } from "./card";
import { CityEditor } from "./weather-city-editor";

export const DEFAULT_WEATHER_CITY = "İstanbul";

function dayName(date: string, today: string): string {
  if (date === today) return "Bugün";
  if (date === addDays(today, 1)) return "Yarın";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", weekday: "short" }).format(new Date(`${date}T00:00:00Z`));
}

const deg = (n: number | null | undefined) => (n === null || n === undefined ? "–" : `${Math.round(n)}°`);

/** Daily weather for the user's chosen city (Open-Meteo, real data only). */
export async function WeatherCard() {
  const supabase = await createClient();
  const [{ data: settings }, { data: perm }] = await Promise.all([
    supabase.from("user_settings").select("weather_city").maybeSingle(),
    supabase.from("tool_permissions").select("mode").eq("tool_name", "get_weather_forecast").maybeSingle(),
  ]);
  const city = settings?.weather_city ?? DEFAULT_WEATHER_CITY;

  // Same Trust Center switch as the assistant's weather tool.
  if (decide({ kind: "read" }, perm?.mode as PermissionMode | undefined).run === "deny") {
    return (
      <Card title="Hava durumu" persona="wellness" delay={60}>
        <p className="text-sm text-[var(--muted)]">
          Hava durumu Güven Merkezi&apos;nde kapalı.{" "}
          <Link href="/trust" className="text-[var(--accent-2)] hover:underline">
            Aç
          </Link>
        </p>
      </Card>
    );
  }

  // Only the network calls are guarded; JSX is built after.
  let f: Forecast | null = null;
  try {
    const place = await geocode(city);
    if (!place) throw new Error(`"${city}" bulunamadı.`);
    f = await forecast(place, { days: 4 }, { current: true });
  } catch (err) {
    console.error("weather card failed", err);
  }

  if (!f || f.days.length === 0) {
    return (
      <Card title="Hava durumu" persona="wellness" delay={60}>
        <CityEditor city={city} />
        <p className="text-sm text-[var(--muted)]">Hava durumu şu an alınamadı.</p>
      </Card>
    );
  }

  const today = todayLocal();
  const [now, ...next] = f.days;
  const code = f.current?.code ?? now.code;

  return (
    <Card title="Hava durumu" persona="wellness" delay={60}>
      <CityEditor city={city} />
        <div className="flex items-center gap-4">
          <span className="text-5xl leading-none drop-shadow-[0_0_18px_rgba(95,208,255,0.35)]" aria-hidden="true">
            {weatherEmoji(code)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-4xl font-semibold leading-none">{deg(f.current?.temperature ?? now.max)}</p>
            <p className="mt-1 text-sm">{describeWeather(code)}</p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <p>
              <span className="text-[var(--fg)]">{deg(now.max)}</span> / {deg(now.min)}
            </p>
            {now.rainChance !== null && <p className="mt-1">💧 %{now.rainChance}</p>}
          </div>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
          {next.map((d) => (
            <li key={d.date} className="rounded-2xl bg-[var(--chip)] px-2 py-2 text-center">
              <p className="text-xs text-[var(--muted)]">{dayName(d.date, today)}</p>
              <p className="my-0.5 text-xl" aria-label={describeWeather(d.code)}>
                {weatherEmoji(d.code)}
              </p>
              <p className="text-xs">
                {deg(d.max)} <span className="text-[var(--muted)]">{deg(d.min)}</span>
              </p>
            </li>
          ))}
        </ul>
    </Card>
  );
}

export function WeatherSkeleton() {
  return (
    <Card title="Hava durumu" persona="wellness" delay={60}>
      <div className="h-24 animate-pulse rounded-2xl bg-[var(--chip)]" />
    </Card>
  );
}
