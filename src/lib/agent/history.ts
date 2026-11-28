import { nextPersona, type PersonaId } from "../personas";
import { activityLabel } from "./tool-labels";

/** One bubble in the chat UI. */
export interface DisplayTurn {
  role: "user" | "assistant";
  text: string;
  tools: string[];
  error?: string;
  /** The error is the daily plan limit (shows a link to the plan page). */
  limit?: boolean;
  /** Assistant character for this reply, from the tools it used. */
  persona?: PersonaId;
}

interface StoredMessage {
  role: "user" | "assistant";
  content: unknown;
}

type Block = { type?: string; text?: string; name?: string };

/**
 * Turns stored Messages API history into chat bubbles. A user message with
 * plain text starts a turn; tool results are hidden; all assistant messages
 * until the next user text merge into one bubble (text joined, tool calls
 * shown as activity chips). Thinking and other blocks are not displayed.
 */
export function toDisplayTurns(messages: StoredMessage[]): DisplayTurn[] {
  const turns: DisplayTurn[] = [];

  for (const m of messages) {
    if (m.role === "user") {
      const text = typeof m.content === "string" ? m.content : textOf(m.content as Block[]);
      if (text) turns.push({ role: "user", text, tools: [] });
      continue; // tool_result-only messages carry no user text
    }

    let current = turns[turns.length - 1];
    if (!current || current.role !== "assistant") {
      current = { role: "assistant", text: "", tools: [] };
      turns.push(current);
    }
    if (typeof m.content === "string") {
      current.text = join(current.text, m.content);
      continue;
    }
    for (const b of m.content as Block[]) {
      if (b.type === "text" && b.text) current.text = join(current.text, b.text);
      if (b.type === "tool_use" && b.name) {
        const label = activityLabel(b.name);
        if (!current.tools.includes(label)) current.tools.push(label);
        current.persona = nextPersona(current.persona, b.name);
      }
    }
  }
  return turns;
}

function textOf(blocks: Block[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
}

function join(a: string, b: string) {
  return a ? `${a}\n\n${b}` : b;
}
