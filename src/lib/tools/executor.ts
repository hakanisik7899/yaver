import { decide } from "./policy";
import type { ToolRegistry } from "./registry";
import type { ActionStore } from "./store";
import type { ToolContext, ToolOutcome } from "./types";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * The single gate between the model and the outside world.
 * Every model tool call goes through here: validate input, check the
 * user's permission, run now or queue for approval, and write the audit log.
 */
export async function invokeTool(
  registry: ToolRegistry,
  store: ActionStore,
  ctx: ToolContext,
  toolName: string,
  rawInput: unknown,
): Promise<ToolOutcome> {
  const tool = registry.get(toolName);
  if (!tool) return { status: "error", message: `Bilinmeyen araç: ${toolName}` };

  const parsed = tool.input.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "error", message: `Geçersiz girdi: ${parsed.error.message}` };
  }
  const input = parsed.data;
  const summary = tool.summarize(input);
  const base = {
    userId: ctx.userId,
    agent: ctx.agent,
    toolName,
    input,
    summary,
    reversible: tool.reversible ?? false,
    conversationId: ctx.conversationId,
  };

  const mode = await store.getPermissionMode(ctx.userId, toolName);
  const decision = decide(tool, mode);

  if (decision.run === "deny") {
    await store.audit({ ...base, event: "denied", level: null, approvedByUser: false });
    return { status: "denied", reason: decision.reason };
  }

  if (decision.run === "ask") {
    const actionId = await store.createPendingAction({
      userId: ctx.userId,
      agent: ctx.agent,
      toolName,
      summary,
      payload: input,
      conversationId: ctx.conversationId,
    });
    await store.audit({
      ...base,
      event: "proposed",
      level: 3,
      approvedByUser: false,
      pendingActionId: actionId,
    });
    return { status: "pending_approval", actionId, summary };
  }

  try {
    const result = await tool.execute(ctx, input);
    // Pure reads are logged too: the Trust Center must answer
    // "which data did the assistant use?".
    await store.audit({ ...base, event: "executed", level: decision.level, approvedByUser: false });
    return { status: "ok", result };
  } catch (err) {
    const message = errorMessage(err);
    await store.audit({
      ...base,
      event: "failed",
      level: decision.level,
      approvedByUser: false,
      error: message,
    });
    return { status: "error", message };
  }
}

/** Runs a queued action after the user approved it. */
export async function executeApprovedAction(
  registry: ToolRegistry,
  store: ActionStore,
  userId: string,
  actionId: string,
): Promise<ToolOutcome> {
  const action = await store.getPendingAction(actionId);
  if (!action || action.userId !== userId) {
    return { status: "error", message: "İşlem bulunamadı." };
  }
  if (action.status !== "pending") {
    return { status: "error", message: "Bu işlem zaten sonuçlandırılmış." };
  }

  const tool = registry.get(action.toolName);
  const base = {
    userId,
    agent: action.agent,
    toolName: action.toolName,
    input: action.payload,
    summary: action.summary,
    reversible: tool?.reversible ?? false,
    pendingActionId: actionId,
    conversationId: action.conversationId,
  };

  if (!tool) {
    await store.setPendingActionStatus(actionId, "failed");
    return { status: "error", message: `Bilinmeyen araç: ${action.toolName}` };
  }

  // Re-validate: the payload sat in the database and the schema may have
  // changed since it was proposed.
  const parsed = tool.input.safeParse(action.payload);
  if (!parsed.success) {
    await store.setPendingActionStatus(actionId, "failed");
    await store.audit({ ...base, event: "failed", level: 3, approvedByUser: true, error: "invalid payload" });
    return { status: "error", message: "Kayıtlı işlem verisi geçersiz." };
  }

  // The status check above is only a fast path; this claim is what
  // guarantees a double-clicked approval runs the action once.
  if (!(await store.claimPendingAction(actionId))) {
    return { status: "error", message: "Bu işlem zaten sonuçlandırılmış." };
  }
  await store.audit({ ...base, event: "approved", level: 3, approvedByUser: true });

  try {
    const result = await tool.execute(
      { userId, agent: action.agent, conversationId: action.conversationId },
      parsed.data,
    );
    await store.setPendingActionStatus(actionId, "executed");
    await store.audit({ ...base, event: "executed", level: 3, approvedByUser: true });
    return { status: "ok", result };
  } catch (err) {
    const message = errorMessage(err);
    await store.setPendingActionStatus(actionId, "failed");
    await store.audit({ ...base, event: "failed", level: 3, approvedByUser: true, error: message });
    return { status: "error", message };
  }
}

/** Records the user's rejection of a queued action. */
export async function rejectAction(
  store: ActionStore,
  userId: string,
  actionId: string,
): Promise<boolean> {
  const action = await store.getPendingAction(actionId);
  if (!action || action.userId !== userId || action.status !== "pending") return false;

  await store.setPendingActionStatus(actionId, "rejected");
  await store.audit({
    userId,
    agent: action.agent,
    toolName: action.toolName,
    event: "rejected",
    level: 3,
    input: action.payload,
    summary: action.summary,
    approvedByUser: false,
    reversible: false,
    pendingActionId: actionId,
    conversationId: action.conversationId,
  });
  return true;
}
