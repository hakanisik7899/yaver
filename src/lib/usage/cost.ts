/**
 * API cost from the usage the Messages API returns (pure, testable).
 * List prices in USD per million tokens; update when Anthropic's prices change.
 * Cache writes: 1.25x input (5-minute TTL), 2x input (1-hour TTL).
 */
export interface ModelPrice {
  input: number;
  output: number;
  cacheRead: number;
}

export const PRICES: Record<string, ModelPrice> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  // Haiku 5.5 for prompts up to 100K tokens (bill emails stay far below).
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
  // Possible server-side fallback targets.
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2 },
};

/** Unknown models are priced like the main model, so cost is never under-reported to zero. */
const FALLBACK_PRICE = PRICES["claude-opus-5-5"];

export const WEB_SEARCH_USD = 10 / 1000;

/** The subset of the API's usage object we bill from. */
export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export interface TokenCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  webSearches: number;
}

export function tokenCounts(u: UsageLike): TokenCounts {
  const n = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : 0);
  const write1h = n(u.cache_creation?.ephemeral_1h_input_tokens);
  // Without the TTL breakdown, treat all writes as the default 5-minute TTL.
  const write5m = u.cache_creation ? n(u.cache_creation.ephemeral_5m_input_tokens) : n(u.cache_creation_input_tokens);
  return {
    input: n(u.input_tokens),
    output: n(u.output_tokens),
    cacheRead: n(u.cache_read_input_tokens),
    cacheWrite5m: write5m,
    cacheWrite1h: write1h,
    webSearches: n(u.server_tool_use?.web_search_requests),
  };
}

export function priceFor(model: string): ModelPrice {
  return PRICES[model] ?? FALLBACK_PRICE;
}

/** USD for one response. `webSearches` overrides the usage count when given. */
export function costUsd(model: string, t: TokenCounts): number {
  const p = priceFor(model);
  const perToken =
    t.input * p.input +
    t.output * p.output +
    t.cacheRead * p.cacheRead +
    t.cacheWrite5m * p.input * 1.25 +
    t.cacheWrite1h * p.input * 2;
  return perToken / 1_000_000 + t.webSearches * WEB_SEARCH_USD;
}
