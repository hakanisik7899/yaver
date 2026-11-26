import { describe, expect, it } from "vitest";
import { costUsd, tokenCounts } from "./cost";

describe("tokenCounts", () => {
  it("reads every billed field and the cache TTL breakdown", () => {
    expect(
      tokenCounts({
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 1000,
        cache_creation_input_tokens: 300,
        cache_creation: { ephemeral_5m_input_tokens: 200, ephemeral_1h_input_tokens: 100 },
        server_tool_use: { web_search_requests: 2 },
      }),
    ).toEqual({ input: 100, output: 50, cacheRead: 1000, cacheWrite5m: 200, cacheWrite1h: 100, webSearches: 2 });
  });
  it("treats writes without a breakdown as 5-minute writes and nulls as zero", () => {
    expect(tokenCounts({ input_tokens: null, cache_creation_input_tokens: 40 })).toMatchObject({
      input: 0,
      cacheWrite5m: 40,
      cacheWrite1h: 0,
      webSearches: 0,
    });
  });
});

describe("costUsd", () => {
  it("prices Opus 5.5 tokens, cache and web searches", () => {
    const t = { input: 1_000_000, output: 100_000, cacheRead: 1_000_000, cacheWrite5m: 1_000_000, cacheWrite1h: 0, webSearches: 3 };
    // 4 + 2 + 0.2 + 5 + 0.03
    expect(costUsd("claude-opus-5-5", t)).toBeCloseTo(11.23, 6);
  });
  it("prices Haiku 5.5 far cheaper", () => {
    const t = { input: 10_000, output: 500, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, webSearches: 0 };
    expect(costUsd("claude-haiku-5-5", t)).toBeCloseTo(0.00125, 8);
  });
  it("prices unknown models like the main model", () => {
    const t = { input: 1_000_000, output: 0, cacheRead: 0, cacheWrite5m: 0, cacheWrite1h: 0, webSearches: 0 };
    expect(costUsd("claude-future-9", t)).toBe(4);
  });
});
