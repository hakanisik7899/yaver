import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { ActionStore, PendingActionRecord } from "./store";
import type { PermissionMode } from "./types";

/**
 * ActionStore backed by Supabase. Uses the secret-key client because
 * audit logs and pending actions must only be written by the server;
 * every query is still scoped to the given user id.
 */
export function createSupabaseActionStore(): ActionStore {
  const db = createAdminClient();

  return {
    async getPermissionMode(userId, toolName) {
      const { data, error } = await db
        .from("tool_permissions")
        .select("mode")
        .eq("user_id", userId)
        .eq("tool_name", toolName)
        .maybeSingle();
      if (error) throw error;
      return (data?.mode as PermissionMode | undefined) ?? undefined;
    },

    async createPendingAction(a) {
      const { data, error } = await db
        .from("pending_actions")
        .insert({
          user_id: a.userId,
          agent: a.agent,
          kind: a.toolName,
          summary: a.summary,
          payload: a.payload,
          conversation_id: a.conversationId ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },

    async getPendingAction(id) {
      const { data, error } = await db
        .from("pending_actions")
        .select("id, user_id, agent, kind, summary, payload, status, conversation_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        userId: data.user_id,
        agent: data.agent,
        toolName: data.kind,
        summary: data.summary,
        payload: data.payload,
        status: data.status as PendingActionRecord["status"],
        conversationId: data.conversation_id ?? undefined,
      };
    },

    async claimPendingAction(id) {
      const { data, error } = await db
        .from("pending_actions")
        .update({ status: "approved", decided_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },

    async setPendingActionStatus(id, status) {
      const decided = status === "approved" || status === "rejected";
      const { error } = await db
        .from("pending_actions")
        .update({ status, ...(decided ? { decided_at: new Date().toISOString() } : {}) })
        .eq("id", id);
      if (error) throw error;
    },

    async audit(e) {
      const { error } = await db.from("audit_logs").insert({
        user_id: e.userId,
        agent: e.agent,
        tool_name: e.toolName,
        event: e.event,
        permission_level: e.level,
        input: e.input,
        summary: e.summary,
        approved_by_user: e.approvedByUser,
        reversible: e.reversible,
        pending_action_id: e.pendingActionId ?? null,
        conversation_id: e.conversationId ?? null,
        error: e.error ?? null,
      });
      // An action that cannot be audited must not be silently accepted.
      if (error) throw error;
    },
  };
}
