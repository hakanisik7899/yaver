import "server-only";
import { z } from "zod";
import { DATE_REGEX, addDays, daySpan, todayLocal } from "@/lib/time";
import { describeWeather, isOutdoorFriendly } from "@/lib/weather/codes";
import { forecast, geocode, placeLabel } from "@/lib/weather/open-meteo";
import { defineTool } from "../registry";

const MAX_AHEAD_DAYS = 15;

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

    const place = await geocode(i.city);
    if (!place) throw new Error(`"${i.city}" bulunamadı. Şehir adını kontrol et.`);
    const f = await forecast(place, { start_date: i.start_date, end_date: i.end_date });

    return {
      location: placeLabel(place),
      days: f.days.map((d) => ({
        date: d.date,
        condition: describeWeather(d.code),
        max_c: d.max,
        min_c: d.min,
        rain_chance_pct: d.rainChance,
        wind_kmh: d.wind,
        good_for_outdoors: isOutdoorFriendly(d.code, d.rainChance, d.max),
      })),
      source: "Open-Meteo",
    };
  },
});
