import type { PermissionLevel, PermissionMode } from "./types";

export type AuditEvent =
  | "executed"
  | "proposed"
  | "approved"
  | "rejected"
  | "denied"
  | "failed";

export interface AuditEntry {
  userId: string;
  agent: string;
  toolName: string;
  event: AuditEvent;
  level: PermissionLevel | null;
  input: unknown;
  summary: string;
  approvedByUser: boolean;
  reversible: boolean;
  pendingActionId?: string;
  conversationId?: string;
  error?: string;
}

export interface PendingActionRecord {
  id: string;
  userId: string;
  agent: string;
  toolName: string;
  summary: string;
  payload: unknown;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  conversationId?: string;
}

/**
 * Persistence the Tool Layer needs. Kept as an interface so the executor
 * can be unit-tested without a database.
 */
export interface ActionStore {
  getPermissionMode(userId: string, toolName: string): Promise<PermissionMode | undefined>;
  createPendingAction(
    action: Omit<PendingActionRecord, "id" | "status">,
  ): Promise<string>;
  getPendingAction(id: string): Promise<PendingActionRecord | null>;
  setPendingActionStatus(
    id: string,
    status: PendingActionRecord["status"],
  ): Promise<void>;
  audit(entry: AuditEntry): Promise<void>;
}
