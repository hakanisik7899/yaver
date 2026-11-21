import { describe, expect, it } from "vitest";
import { takeSentences, toSpeakable } from "./text";

describe("toSpeakable", () => {
  it("drops markdown, bullets, emoji and links", () => {
    expect(toSpeakable("**Bugün** 2 toplantın var 🎉\n- Ekip toplantısı\n- Sunum https://meet.google.com/x")).toBe(
      "Bugün 2 toplantın var. Ekip toplantısı. Sunum",
    );
  });

  it("reads time ranges naturally", () => {
    expect(toSpeakable("Boş zaman: 14:00–16:30")).toBe("Boş zaman: 14:00 ile 16:30 arası");
    expect(toSpeakable("9:00-10:00 arası toplantı")).toBe("9:00 ile 10:00 arası toplantı");
  });
});

describe("takeSentences", () => {
  it("returns complete sentences and keeps the unfinished tail", () => {
    expect(takeSentences("Merhaba! Bugün yoğun bir gün. Saat 10:30'da toplan")).toEqual({
      sentences: ["Merhaba!", "Bugün yoğun bir gün."],
      rest: " Saat 10:30'da toplan",
    });
  });

  it("does not split on times or decimals and waits for whitespace after a mark", () => {
    expect(takeSentences("Saat 10:30 ve 3.5 saat sürer.")).toEqual({
      sentences: [],
      rest: "Saat 10:30 ve 3.5 saat sürer.",
    });
  });

  it("treats newlines as sentence ends but keeps list numbers with their item", () => {
    expect(takeSentences("Öncelikler\n1. Sunum ")).toEqual({
      sentences: ["Öncelikler"],
      rest: "1. Sunum ",
    });
    expect(takeSentences("1. Sunumu bitir.\n2. Raporu gönder.\n")).toEqual({
      sentences: ["1. Sunumu bitir.", "2. Raporu gönder."],
      rest: "",
    });
  });
});
