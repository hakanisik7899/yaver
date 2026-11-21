import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ToolDefinition } from "./types";

/**
 * Constraint keywords Claude strict tools reject. They are removed from the
 * schema sent to the API and restated in the description so the model still
 * knows them; zod enforces them in invokeTool() before anything runs.
 */
const UNSUPPORTED_KEYWORDS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "maxItems",
] as const;

function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported);
  if (!node || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  const hints: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if ((UNSUPPORTED_KEYWORDS as readonly string[]).includes(key)) {
      hints.push(`${key} ${String(value)}`);
    } else {
      out[key] = stripUnsupported(value);
    }
  }
  if (hints.length > 0) {
    const desc = typeof out.description === "string" ? `${out.description} ` : "";
    out.description = `${desc}(${hints.join(", ")})`;
  }
  return out;
}

/** Converts a zod object to a JSON schema accepted by Claude strict tools. */
function toInputSchema(schema: z.ZodObject): Anthropic.Beta.BetaTool.InputSchema {
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  const cleaned = stripUnsupported(json) as Record<string, unknown>;
  return { ...cleaned, type: "object", additionalProperties: false };
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(...defs: ToolDefinition[]): this {
    for (const def of defs) {
      if (this.tools.has(def.name)) {
        throw new Error(`Tool already registered: ${def.name}`);
      }
      this.tools.set(def.name, def);
    }
    return this;
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Tool list for the Messages API. Sorted by name so the list is
   * byte-identical between requests and the prompt cache keeps hitting.
   * Pass `names` to give an agent only the tools it is allowed to use.
   */
  toClaudeTools(names?: string[]): Anthropic.Beta.BetaTool[] {
    const selected = names
      ? names.map((n) => {
          const t = this.tools.get(n);
          if (!t) throw new Error(`Unknown tool: ${n}`);
          return t;
        })
      : [...this.tools.values()];

    return selected
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: toInputSchema(t.input),
        strict: true,
      }));
  }
}

/** Helper that keeps the input type flowing into summarize/execute. */
export function defineTool<TSchema extends z.ZodObject>(
  def: ToolDefinition<TSchema>,
): ToolDefinition {
  return def as unknown as ToolDefinition;
}
