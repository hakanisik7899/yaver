import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { invokeTool, registry } from "@/lib/tools";
import { createSupabaseActionStore } from "@/lib/tools/supabase-store";
import type { ToolOutcome } from "@/lib/tools/types";
import { SYSTEM_PROMPT } from "./prompt";

const MODEL = "claude-opus-5-5";
// Chat with a few read tools: medium keeps answers quick and cheap.
// Raise per route (e.g. planning) when measurement shows it helps.
const EFFORT = "medium" as const;
const MAX_TOKENS = 64_000;
const MAX_STEPS = 8;

const client = new Anthropic();

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; status: ToolOutcome["status"] }
  | { type: "error"; message: string };

export interface AgentTurnInput {
  userId: string;
  conversationId: string;
  /** Prior messages, exactly as previously returned by the API. */
  history: Anthropic.Beta.BetaMessageParam[];
  userText: string;
  onEvent: (e: AgentEvent) => void;
}

/**
 * Runs one user turn of the agent loop and returns the messages to append
 * to the conversation (the user message, assistant turns and tool results).
 * History is append-only: assistant content is stored unchanged, including
 * thinking and fallback blocks, so later turns replay it as-is.
 */
export async function runAgentTurn({
  userId,
  conversationId,
  history,
  userText,
  onEvent,
}: AgentTurnInput): Promise<Anthropic.Beta.BetaMessageParam[]> {
  const store = createSupabaseActionStore();
  const tools = registry.toClaudeTools();
  const added: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userText }];

  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: EFFORT },
      // On a policy refusal the API re-runs the request on a fallback model
      // chosen by refusal category.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      cache_control: { type: "ephemeral" },
      system: SYSTEM_PROMPT,
      tools,
      messages: [...history, ...added],
    });
    stream.on("text", (delta) => onEvent({ type: "text", delta }));

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      // The turn may hold a cut-off tool call; don't store or run it.
      const text = "Bu isteğe yardımcı olamıyorum. Farklı bir şekilde sormayı deneyebilirsin.";
      onEvent({ type: "text", delta: text });
      added.push({ role: "assistant", content: text });
      return added;
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
    );

    if (message.stop_reason === "max_tokens" && toolUses.length > 0) {
      throw new Error("Yanıt çok uzun olduğu için yarıda kesildi.");
    }

    added.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") continue;
    if (toolUses.length === 0) return added;

    // Parallel tool calls: run together, return all results in one message.
    const results = await Promise.all(
      toolUses.map(async (use): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
        const outcome = await invokeTool(
          registry,
          store,
          { userId, agent: "core", conversationId },
          use.name,
          use.input,
        );
        onEvent({ type: "tool", name: use.name, status: outcome.status });
        return {
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(outcome),
          is_error: outcome.status === "error" || outcome.status === "denied",
        };
      }),
    );
    added.push({ role: "user", content: results });
  }

  // Out of steps: close the turn with plain text so history stays valid.
  const text = "Bu isteği tamamlamak için çok fazla adım gerekti. Biraz daha daraltarak sorabilir misin?";
  onEvent({ type: "text", delta: text });
  added.push({ role: "assistant", content: text });
  return added;
}
