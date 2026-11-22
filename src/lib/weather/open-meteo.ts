import "server-only";
import { USER_TZ } from "@/lib/time";
import { parsePlaceQuery, pickPlace, type GeoCandidate } from "./pick-place";

// Open-Meteo: free, no API key. Only the place name and coordinates are sent.
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

export interface DailyForecast {
  date: string;
  code: number;
  max: number | null;
  min: number | null;
  rainChance: number | null;
  wind: number | null;
}

export interface Forecast {
  place: Place;
  current: { temperature: number | null; code: number } | null;
  days: DailyForecast[];
}

/**
 * Best match for "City" or "Place, Province". The API returns villages that
 * share a name first, so candidates are ranked (seats, population, Türkiye).
 */
export async function geocode(query: string): Promise<Place | null> {
  const { name, hint } = parsePlaceQuery(query);
  const res = await fetch(`${GEO}?${new URLSearchParams({ name, count: "10", language: "tr", format: "json" })}`);
  if (!res.ok) throw new Error("Konum servisine ulaşılamadı.");
  return pickPlace(((await res.json()) as { results?: GeoCandidate[] }).results ?? [], hint);
}

/** Daily forecast (and optionally current conditions) for a place. */
export async function forecast(
  place: Place,
  range: { start_date: string; end_date: string } | { days: number },
  { current = false }: { current?: boolean } = {},
): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    timezone: USER_TZ,
  });
  if ("days" in range) params.set("forecast_days", String(range.days));
  else {
    params.set("start_date", range.start_date);
    params.set("end_date", range.end_date);
  }
  if (current) params.set("current", "temperature_2m,weather_code");

  const res = await fetch(`${FORECAST}?${params}`);
  if (!res.ok) throw new Error(`Hava durumu alınamadı (${res.status}).`);
  const f = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
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
    place,
    current: f.current ? { temperature: f.current.temperature_2m ?? null, code: f.current.weather_code ?? d.weather_code[0] } : null,
    days: d.time.map((date, k) => ({
      date,
      code: d.weather_code[k],
      max: d.temperature_2m_max[k],
      min: d.temperature_2m_min[k],
      rainChance: d.precipitation_probability_max[k],
      wind: d.wind_speed_10m_max[k],
    })),
  };
}

export function placeLabel(p: Place): string {
  return [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : null, p.country].filter(Boolean).join(", ");
}
