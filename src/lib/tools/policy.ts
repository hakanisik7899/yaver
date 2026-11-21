import type { PermissionLevel, PermissionMode, ToolDefinition } from "./types";

export type PolicyDecision =
  | { run: "now"; level: PermissionLevel }
  | { run: "ask"; level: 3 }
  | { run: "deny"; reason: string };

/**
 * Decides how a tool call may proceed.
 * Reads and drafts run immediately unless the user denied the tool.
 * Writes wait for approval, except non-sensitive ones the user set to
 * "auto", or that are internal and auto by default with no user setting.
 */
export function decide(
  tool: Pick<ToolDefinition, "kind" | "sensitive" | "autoByDefault">,
  userMode: PermissionMode | undefined,
): PolicyDecision {
  if (userMode === "deny") {
    return { run: "deny", reason: "Kullanıcı bu aracı devre dışı bıraktı." };
  }

  if (tool.kind === "read") return { run: "now", level: 1 };
  if (tool.kind === "draft") return { run: "now", level: 2 };

  if (tool.sensitive) return { run: "ask", level: 3 };
  if (userMode === "auto") return { run: "now", level: 4 };
  if (userMode === undefined && tool.autoByDefault) return { run: "now", level: 4 };
  return { run: "ask", level: 3 };
}
