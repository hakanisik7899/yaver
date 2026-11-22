import { describe, expect, it } from "vitest";
import { parsePlaceQuery, pickPlace, shortPlaceLabel } from "./pick-place";

const c = (name: string, admin1: string, population: number, feature_code = "PPL", country_code = "TR") => ({
  name,
  admin1,
  population,
  feature_code,
  country_code,
  latitude: 0,
  longitude: 0,
});

describe("parsePlaceQuery", () => {
  it("splits an optional province hint", () => {
    expect(parsePlaceQuery("Kadıköy, Yalova")).toEqual({ name: "Kadıköy", hint: "Yalova" });
    expect(parsePlaceQuery("  Ankara ")).toEqual({ name: "Ankara" });
  });
});

describe("pickPlace", () => {
  it("prefers provincial seats and population over the API's first result", () => {
    const results = [c("Ankara", "Ankara", 900, "PPL"), c("Ankara", "Ankara", 3_500_000, "PPLC")];
    expect(pickPlace(results)?.population).toBe(3_500_000);
  });

  it("prefers Türkiye over a bigger foreign namesake", () => {
    const results = [c("Batman", "Wisconsin", 900_000, "PPL", "US"), c("Batman", "Batman", 400_000, "PPLA")];
    expect(pickPlace(results)?.country_code).toBe("TR");
  });

  it("honours a 'Place, Province' hint (Turkish case-insensitive)", () => {
    const results = [c("Kadıköy", "Yalova", 2741), c("Kadıköy", "İstanbul", 1454), c("Kadıköy", "Aydın", 1752)];
    expect(pickPlace(results, "istanbul")?.admin1).toBe("İstanbul");
    expect(pickPlace(results, "İzmir")).toBeNull();
    expect(pickPlace([])).toBeNull();
  });
});

describe("shortPlaceLabel", () => {
  it("adds the province only when it differs", () => {
    expect(shortPlaceLabel({ name: "Kadıköy", admin1: "Yalova" })).toBe("Kadıköy, Yalova");
    expect(shortPlaceLabel({ name: "Ankara", admin1: "Ankara" })).toBe("Ankara");
  });
});
