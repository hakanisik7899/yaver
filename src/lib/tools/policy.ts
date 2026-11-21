import type { PermissionLevel, PermissionMode, ToolDefinition } from "./types";

export type PolicyDecision =
  | { run: "now"; level: PermissionLevel }
  | { run: "ask"; level: 3 }
  | { run: "deny"; reason: string };

type PolicyTool = Pick<ToolDefinition, "kind" | "sensitive" | "autoByDefault">;

/**
 * Settings the Trust Center offers for a tool. Reads only toggle on/off
 * ("auto" = on); sensitive writes can never be "auto".
 */
export function allowedModes(tool: PolicyTool): PermissionMode[] {
  if (tool.kind !== "write") return ["auto", "deny"];
  if (tool.sensitive) return ["ask", "deny"];
  return ["auto", "ask", "deny"];
}

/** What applies when the user has not chosen anything for this tool. */
export function defaultMode(tool: PolicyTool): PermissionMode {
  if (tool.kind !== "write") return "auto";
  return tool.autoByDefault && !tool.sensitive ? "auto" : "ask";
}

/** The mode the policy actually enforces for a stored user setting. */
export function effectiveMode(tool: PolicyTool, userMode: PermissionMode | undefined): PermissionMode {
  const d = decide(tool, userMode);
  if (d.run === "deny") return "deny";
  if (d.run === "ask") return "ask";
  return "auto";
}

/**
 * Decides how a tool call may proceed.
 * Reads and drafts run immediately unless the user denied the tool.
 * Writes wait for approval, except non-sensitive ones the user set to
 * "auto", or that are internal and auto by default with no user setting.
 */
export function decide(
  tool: PolicyTool,
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
