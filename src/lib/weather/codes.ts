/** WMO weather interpretation codes (used by Open-Meteo) in Turkish. */
const CODES: Record<number, string> = {
  0: "Açık",
  1: "Çoğunlukla açık",
  2: "Parçalı bulutlu",
  3: "Kapalı",
  45: "Sisli",
  48: "Kırağılı sis",
  51: "Hafif çisenti",
  53: "Çisenti",
  55: "Yoğun çisenti",
  56: "Dondurucu çisenti",
  57: "Yoğun dondurucu çisenti",
  61: "Hafif yağmur",
  63: "Yağmur",
  65: "Şiddetli yağmur",
  66: "Dondurucu yağmur",
  67: "Şiddetli dondurucu yağmur",
  71: "Hafif kar",
  73: "Kar",
  75: "Yoğun kar",
  77: "Kar taneleri",
  80: "Hafif sağanak",
  81: "Sağanak",
  82: "Şiddetli sağanak",
  85: "Hafif kar sağanağı",
  86: "Yoğun kar sağanağı",
  95: "Gök gürültülü fırtına",
  96: "Dolu ile fırtına",
  99: "Şiddetli dolulu fırtına",
};

export function describeWeather(code: number | null | undefined): string {
  if (code === null || code === undefined) return "Bilinmiyor";
  return CODES[code] ?? "Bilinmiyor";
}

/** One emoji per weather family, for compact display. */
export function weatherEmoji(code: number | null | undefined): string {
  if (code === null || code === undefined) return "🌡️";
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

/** Rough suitability for outdoor plans. */
export function isOutdoorFriendly(code: number, precipitationProbability: number | null, maxTemp: number | null): boolean {
  const wet = code >= 51 || (precipitationProbability ?? 0) >= 50;
  const tooCold = maxTemp !== null && maxTemp < 5;
  const tooHot = maxTemp !== null && maxTemp > 35;
  return !wet && !tooCold && !tooHot && code !== 45 && code !== 48;
}
