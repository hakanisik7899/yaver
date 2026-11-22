import { describe, expect, it } from "vitest";
import { describeWeather, isOutdoorFriendly } from "./codes";

describe("describeWeather", () => {
  it("maps WMO codes to Turkish", () => {
    expect(describeWeather(0)).toBe("Açık");
    expect(describeWeather(63)).toBe("Yağmur");
    expect(describeWeather(1234)).toBe("Bilinmiyor");
    expect(describeWeather(null)).toBe("Bilinmiyor");
  });
});

describe("isOutdoorFriendly", () => {
  it("rejects rain, high rain chance, fog and extreme temperatures", () => {
    expect(isOutdoorFriendly(1, 10, 18)).toBe(true);
    expect(isOutdoorFriendly(61, 80, 15)).toBe(false);
    expect(isOutdoorFriendly(2, 60, 15)).toBe(false);
    expect(isOutdoorFriendly(45, 0, 15)).toBe(false);
    expect(isOutdoorFriendly(0, 0, 2)).toBe(false);
    expect(isOutdoorFriendly(0, 0, 38)).toBe(false);
  });
});
