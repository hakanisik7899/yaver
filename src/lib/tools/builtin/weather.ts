import "server-only";
import { z } from "zod";
import { DATE_REGEX, USER_TZ, addDays, daySpan, todayLocal } from "@/lib/time";
import { describeWeather, isOutdoorFriendly } from "@/lib/weather/codes";
import { defineTool } from "../registry";

// Open-Meteo: free, no API key. Only the city name and dates are sent.
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const MAX_AHEAD_DAYS = 15;

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export const getWeatherForecast = defineTool({
  name: "get_weather_forecast",
  label: "Hava durumu",
  description:
    "Daily weather forecast for a city: condition, min/max temperature, chance of rain, wind, " +
    "and whether it suits outdoor plans. Use when planning outings, weekends or travel. " +
    `Up to ${MAX_AHEAD_DAYS} days ahead. Default to the user's city if known; ask if not.`,
  kind: "read",
  input: z.strictObject({
    city: z.string().trim().min(2).max(80).describe("City or district, e.g. 'İstanbul', 'Kadıköy', 'Ankara'"),
    start_date: z.string().regex(DATE_REGEX).describe("First day, YYYY-MM-DD"),
    end_date: z.string().regex(DATE_REGEX).describe("Last day, YYYY-MM-DD"),
  }),
  summarize: (i) => `Hava durumu okundu: ${i.city}, ${i.start_date} – ${i.end_date}`,
  async execute(_ctx, i) {
    const today = todayLocal();
    if (daySpan(i.start_date, i.end_date) < 1) throw new Error("end_date, start_date'ten önce olamaz.");
    if (i.start_date < today) throw new Error("Geçmiş tarihler için tahmin yok.");
    if (i.end_date > addDays(today, MAX_AHEAD_DAYS)) {
      throw new Error(`Tahmin en fazla ${MAX_AHEAD_DAYS} gün sonrasına kadar verilebiliyor.`);
    }

    const geoRes = await fetch(`${GEO}?${new URLSearchParams({ name: i.city, count: "1", language: "tr", format: "json" })}`);
    if (!geoRes.ok) throw new Error("Konum bulunamadı.");
    const place = ((await geoRes.json()) as { results?: GeoResult[] }).results?.[0];
    if (!place) throw new Error(`"${i.city}" bulunamadı. Şehir adını kontrol et.`);

    const params = new URLSearchParams({
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      timezone: USER_TZ,
      start_date: i.start_date,
      end_date: i.end_date,
    });
    const fRes = await fetch(`${FORECAST}?${params}`);
    if (!fRes.ok) throw new Error(`Hava durumu alınamadı (${fRes.status}).`);
    const f = (await fRes.json()) as {
      daily?: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: (number | null)[];
        temperature_2m_min: (number | null)[];
        precipitation_probability_max: (number | null)[];
        wind_speed_10m_max: (number | null)[];
      };
    };
    const d = f.daily;
    if (!d) throw new Error("Hava durumu verisi yok.");

    return {
      location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
      days: d.time.map((date, k) => ({
        date,
        condition: describeWeather(d.weather_code[k]),
        max_c: d.temperature_2m_max[k],
        min_c: d.temperature_2m_min[k],
        rain_chance_pct: d.precipitation_probability_max[k],
        wind_kmh: d.wind_speed_10m_max[k],
        good_for_outdoors: isOutdoorFriendly(d.weather_code[k], d.precipitation_probability_max[k], d.temperature_2m_max[k]),
      })),
      source: "Open-Meteo",
    };
  },
});
