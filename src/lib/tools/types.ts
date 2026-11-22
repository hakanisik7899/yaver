import type { z } from "zod";
import type { Plan } from "../plans/plans";

/**
 * Trust Center permission levels.
 *  L1 view      – read and analyse data
 *  L2 suggest   – produce plans / drafts, no external effect
 *  L3 approved  – change something only after the user approves
 *  L4 auto      – change something without asking, within user-granted rules
 *
 * A tool declares its `kind`; the effective level for a call is resolved by
 * the policy (see policy.ts) from the kind, the tool's flags and the user's
 * per-tool permission setting.
 */
export type PermissionLevel = 1 | 2 | 3 | 4;

/** read = L1, draft = L2, write = L3 by default (L4 if the user allows). */
export type ToolKind = "read" | "draft" | "write";

/** User-controlled setting per tool, stored in `tool_permissions`. */
export type PermissionMode = "auto" | "ask" | "deny";

export interface ToolContext {
  userId: string;
  /** Which agent is acting, e.g. "core", "calendar", "research". */
  agent: string;
  conversationId?: string;
  /** The user's plan; Pro-only tools are denied unless this is "pro". */
  plan?: Plan;
}

export interface ToolDefinition<TSchema extends z.ZodObject = z.ZodObject> {
  /** snake_case, stable: it is part of the cached tool list sent to Claude. */
  name: string;
  /** Turkish name shown to the user in the Trust Center, e.g. "Takvimi okuma". */
  label: string;
  /** What the tool does and when to use it, written for the model. */
  description: string;
  kind: ToolKind;
  /**
   * Sensitive writes (sending email, payments, account changes) can never
   * run at L4, whatever the user's setting.
   */
  sensitive?: boolean;
  /**
   * Writes that only touch Yaver's own data (e.g. tasks) and are reversible
   * may run at L4 without asking, unless the user set "ask" or "deny".
   * Never set this on tools that change external services.
   */
  autoByDefault?: boolean;
  /** Only on the Pro plan (e.g. Gmail). Denied for Free users, whatever the Trust Center says. */
  requiresPro?: boolean;
  /** Whether the effect can be undone; recorded in the audit log. */
  reversible?: boolean;
  input: TSchema;
  /** Turkish, human-readable line for the approval list and audit log. */
  summarize(input: z.infer<TSchema>): string;
  execute(ctx: ToolContext, input: z.infer<TSchema>): Promise<unknown>;
}

/** What the model receives back from a tool call. */
export type ToolOutcome =
  | { status: "ok"; result: unknown }
  | { status: "pending_approval"; actionId: string; summary: string }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };
