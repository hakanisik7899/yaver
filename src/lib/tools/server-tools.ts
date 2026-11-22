import type Anthropic from "@anthropic-ai/sdk";
import type { ToolKind } from "./types";

/**
 * Tools that Anthropic runs on its side (no execute() here). They cannot
 * pass through invokeTool(), so the Tool Layer rules are applied around
 * them instead: the Trust Center can switch them off (they are then not
 * sent to the model at all) and every use is written to the audit log
 * after the response (see agent/run.ts).
 */
export interface ServerToolDefinition {
  name: string;
  label: string;
  kind: ToolKind;
  definition: Anthropic.Beta.BetaToolUnion;
  /** Turkish audit summary from the model's server_tool_use input. */
  summarize(input: unknown): string;
}

export const SERVER_TOOLS: ServerToolDefinition[] = [
  {
    name: "web_search",
    label: "Web'de arama",
    kind: "read",
    definition: {
      type: "web_search_20260209",
      name: "web_search",
      max_uses: 5,
      user_location: { type: "approximate", country: "TR", timezone: "Europe/Istanbul" },
    },
    summarize: (input) => {
      const q = (input as { query?: unknown } | null)?.query;
      return typeof q === "string" ? `Web'de arandı: ${q.slice(0, 120)}` : "Web'de arandı";
    },
  },
];

export function getServerTool(name: string): ServerToolDefinition | undefined {
  return SERVER_TOOLS.find((t) => t.name === name);
}
