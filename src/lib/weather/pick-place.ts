/** Pure place-ranking logic for geocoding results (testable offline). */

export interface GeoCandidate {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
  population?: number;
  feature_code?: string;
}

// Capitals and provincial/district seats outrank villages of the same name.
const SEAT_RANK: Record<string, number> = { PPLC: 3, PPLA: 2, PPLA2: 1 };

const norm = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

/** Splits "Kadıköy, Yalova" into the place and an optional province/district hint. */
export function parsePlaceQuery(input: string): { name: string; hint?: string } {
  const [name, ...rest] = input.split(",").map((p) => p.trim());
  const hint = rest.join(" ").trim();
  return hint ? { name, hint } : { name };
}

/**
 * Best match: honour a "Place, Province" hint if given; otherwise prefer
 * Türkiye, then administrative seats, then larger population.
 */
export function pickPlace<T extends GeoCandidate>(results: T[], hint?: string): T | null {
  if (results.length === 0) return null;
  let pool = results;
  if (hint) {
    const h = norm(hint);
    const matching = results.filter((r) => [r.admin1, r.admin2, r.country].some((a) => a && norm(a).includes(h)));
    if (matching.length === 0) return null;
    pool = matching;
  }
  const score = (r: T) =>
    (r.country_code === "TR" ? 1_000_000_000 : 0) +
    (SEAT_RANK[r.feature_code ?? ""] ?? 0) * 100_000_000 +
    Math.min(r.population ?? 0, 99_999_999);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** "Kadıköy, Yalova" when the province differs from the name, else just "Ankara". */
export function shortPlaceLabel(p: Pick<GeoCandidate, "name" | "admin1">): string {
  return p.admin1 && norm(p.admin1) !== norm(p.name) ? `${p.name}, ${p.admin1}` : p.name;
}
