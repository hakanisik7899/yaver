import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { executeApprovedAction, invokeTool, rejectAction } from "./executor";
import { decide } from "./policy";
import { ToolRegistry, defineTool } from "./registry";
import type { ActionStore, AuditEntry, PendingActionRecord } from "./store";
import type { PermissionMode } from "./types";

function memoryStore(modes: Record<string, PermissionMode> = {}) {
  const actions = new Map<string, PendingActionRecord>();
  const audits: AuditEntry[] = [];
  let seq = 0;
  const store: ActionStore = {
    async getPermissionMode(_u, tool) {
      return modes[tool];
    },
    async createPendingAction(a) {
      const id = `a${++seq}`;
      actions.set(id, { ...a, id, status: "pending" });
      return id;
    },
    async getPendingAction(id) {
      const a = actions.get(id);
      return a ? { ...a } : null; // copy, like a DB read
    },
    async claimPendingAction(id) {
      const a = actions.get(id);
      if (!a || a.status !== "pending") return false;
      a.status = "approved";
      return true;
    },
    async setPendingActionStatus(id, status) {
      actions.get(id)!.status = status;
    },
    async audit(e) {
      audits.push(e);
    },
  };
  return { store, actions, audits };
}

const readExec = vi.fn(async () => ({ events: 3 }));
const writeExec = vi.fn(async (_ctx, input: { title: string }) => ({ created: input.title }));
const sendExec = vi.fn(async () => ({ sent: true }));
const mailExec = vi.fn(async () => ({ mails: 2 }));
const draftExec = vi.fn(async () => ({ saved: true }));

const registry = new ToolRegistry().register(
  defineTool({
    name: "list_events",
    label: "list_events",
    description: "List events",
    kind: "read",
    input: z.strictObject({}),
    summarize: () => "Etkinlikler okundu",
    execute: readExec,
  }),
  defineTool({
    name: "create_event",
    label: "create_event",
    description: "Create event",
    kind: "write",
    reversible: true,
    input: z.strictObject({ title: z.string().min(1) }),
    summarize: (i) => `Etkinlik oluştur: ${i.title}`,
    execute: writeExec,
  }),
  defineTool({
    name: "send_email",
    label: "send_email",
    description: "Send email",
    kind: "write",
    sensitive: true,
    input: z.strictObject({ to: z.string() }),
    summarize: (i) => `E-posta gönder: ${i.to}`,
    execute: sendExec,
  }),
  defineTool({
    name: "read_mail",
    label: "read_mail",
    description: "Read mail",
    kind: "read",
    requiresPro: true,
    input: z.strictObject({}),
    summarize: () => "E-posta okundu",
    execute: mailExec,
  }),
  defineTool({
    name: "draft_reply",
    label: "draft_reply",
    description: "Draft reply",
    kind: "write",
    sensitive: true,
    requiresPro: true,
    input: z.strictObject({ body: z.string() }),
    summarize: () => "Taslak kaydet",
    execute: draftExec,
  }),
);

const ctx = { userId: "u1", agent: "core" };

describe("policy", () => {
  it("runs reads at L1 and drafts at L2", () => {
    expect(decide({ kind: "read" }, undefined)).toEqual({ run: "now", level: 1 });
    expect(decide({ kind: "draft" }, undefined)).toEqual({ run: "now", level: 2 });
  });
  it("asks for writes by default and allows L4 only for non-sensitive tools", () => {
    expect(decide({ kind: "write" }, undefined).run).toBe("ask");
    expect(decide({ kind: "write" }, "auto")).toEqual({ run: "now", level: 4 });
    expect(decide({ kind: "write", sensitive: true }, "auto").run).toBe("ask");
  });
  it("runs internal auto-by-default writes at L4 unless the user asks to approve", () => {
    const internal = { kind: "write" as const, autoByDefault: true };
    expect(decide(internal, undefined)).toEqual({ run: "now", level: 4 });
    expect(decide(internal, "ask").run).toBe("ask");
    expect(decide(internal, "deny").run).toBe("deny");
    // A sensitive tool can never opt into auto, by default or by setting.
    expect(decide({ ...internal, sensitive: true }, undefined).run).toBe("ask");
  });

  it("denies when the user disabled the tool, even for reads", () => {
    expect(decide({ kind: "read" }, "deny").run).toBe("deny");
  });
});

describe("plans", () => {
  it("denies Pro-only tools on Free (and without a plan), and audits it", async () => {
    mailExec.mockClear();
    for (const plan of ["free", undefined] as const) {
      const { store, audits } = memoryStore({ read_mail: "auto" });
      const out = await invokeTool(registry, store, { ...ctx, plan }, "read_mail", {});
      expect(out.status).toBe("denied");
      expect(audits).toMatchObject([{ event: "denied" }]);
    }
    expect(mailExec).not.toHaveBeenCalled();
  });

  it("runs Pro-only tools on Pro", async () => {
    const { store } = memoryStore();
    const out = await invokeTool(registry, store, { ...ctx, plan: "pro" }, "read_mail", {});
    expect(out).toEqual({ status: "ok", result: { mails: 2 } });
  });

  it("does not run an approved Pro-only action after the plan ended", async () => {
    draftExec.mockClear();
    const { store, actions } = memoryStore();
    const out = await invokeTool(registry, store, { ...ctx, plan: "pro" }, "draft_reply", { body: "Merhaba" });
    expect(out.status).toBe("pending_approval");
    const id = [...actions.keys()][0];

    expect((await executeApprovedAction(registry, store, "u1", id, "free")).status).toBe("error");
    expect(draftExec).not.toHaveBeenCalled();
    expect(actions.get(id)!.status).toBe("pending");

    expect((await executeApprovedAction(registry, store, "u1", id, "pro")).status).toBe("ok");
    expect(draftExec).toHaveBeenCalledOnce();
  });

  it("leaves tools without the flag alone on Free", async () => {
    const { store } = memoryStore();
    expect((await invokeTool(registry, store, { ...ctx, plan: "free" }, "list_events", {})).status).toBe("ok");
  });
});

describe("invokeTool", () => {
  it("executes reads immediately and audits them", async () => {
    const { store, audits } = memoryStore();
    const out = await invokeTool(registry, store, ctx, "list_events", {});
    expect(out).toEqual({ status: "ok", result: { events: 3 } });
    expect(audits).toMatchObject([{ event: "executed", level: 1 }]);
  });

  it("queues writes for approval without executing them", async () => {
    writeExec.mockClear();
    const { store, actions, audits } = memoryStore();
    const out = await invokeTool(registry, store, ctx, "create_event", { title: "Spor" });
    expect(out).toMatchObject({ status: "pending_approval", summary: "Etkinlik oluştur: Spor" });
    expect(writeExec).not.toHaveBeenCalled();
    expect([...actions.values()][0].status).toBe("pending");
    expect(audits).toMatchObject([{ event: "proposed", level: 3 }]);
  });

  it("never auto-runs sensitive tools", async () => {
    sendExec.mockClear();
    const { store } = memoryStore({ send_email: "auto" });
    const out = await invokeTool(registry, store, ctx, "send_email", { to: "a@b.c" });
    expect(out.status).toBe("pending_approval");
    expect(sendExec).not.toHaveBeenCalled();
  });

  it("rejects invalid input and unknown tools without side effects", async () => {
    const { store, audits } = memoryStore();
    expect((await invokeTool(registry, store, ctx, "create_event", { title: "" })).status).toBe("error");
    expect((await invokeTool(registry, store, ctx, "drop_db", {})).status).toBe("error");
    expect(audits).toHaveLength(0);
  });

  it("logs failures from tool execution", async () => {
    readExec.mockRejectedValueOnce(new Error("Google down"));
    const { store, audits } = memoryStore();
    const out = await invokeTool(registry, store, ctx, "list_events", {});
    expect(out).toEqual({ status: "error", message: "Google down" });
    expect(audits).toMatchObject([{ event: "failed", error: "Google down" }]);
  });
});

describe("approval flow", () => {
  it("executes an approved action once", async () => {
    writeExec.mockClear();
    const { store, actions, audits } = memoryStore();
    const queued = await invokeTool(registry, store, ctx, "create_event", { title: "Spor" });
    const id = (queued as { actionId: string }).actionId;

    const out = await executeApprovedAction(registry, store, "u1", id);
    expect(out).toEqual({ status: "ok", result: { created: "Spor" } });
    expect(actions.get(id)!.status).toBe("executed");
    expect(audits.map((a) => a.event)).toEqual(["proposed", "approved", "executed"]);

    const again = await executeApprovedAction(registry, store, "u1", id);
    expect(again.status).toBe("error");
    expect(writeExec).toHaveBeenCalledTimes(1);
  });

  it("runs the action once when approved twice at the same time", async () => {
    writeExec.mockClear();
    const { store } = memoryStore();
    const queued = await invokeTool(registry, store, ctx, "create_event", { title: "Spor" });
    const id = (queued as { actionId: string }).actionId;

    const results = await Promise.all([
      executeApprovedAction(registry, store, "u1", id),
      executeApprovedAction(registry, store, "u1", id),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["error", "ok"]);
    expect(writeExec).toHaveBeenCalledTimes(1);
  });

  it("does not let another user approve or reject", async () => {
    const { store } = memoryStore();
    const queued = await invokeTool(registry, store, ctx, "create_event", { title: "X" });
    const id = (queued as { actionId: string }).actionId;
    expect((await executeApprovedAction(registry, store, "u2", id)).status).toBe("error");
    expect(await rejectAction(store, "u2", id)).toBe(false);
  });

  it("rejection prevents later execution", async () => {
    const { store } = memoryStore();
    const queued = await invokeTool(registry, store, ctx, "create_event", { title: "X" });
    const id = (queued as { actionId: string }).actionId;
    expect(await rejectAction(store, "u1", id)).toBe(true);
    expect((await executeApprovedAction(registry, store, "u1", id)).status).toBe("error");
  });
});

describe("registry", () => {
  it("emits sorted strict Claude tool definitions", () => {
    const tools = registry.toClaudeTools();
    expect(tools.map((t) => t.name)).toEqual(["create_event", "draft_reply", "list_events", "read_mail", "send_email"]);
    const create = tools[0];
    expect(create.strict).toBe(true);
    expect(create.input_schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["title"],
    });
    expect(create.input_schema).not.toHaveProperty("$schema");
  });

  it("moves constraints strict mode rejects into the description, keeping zod validation", async () => {
    const reg = new ToolRegistry().register(
      defineTool({
        name: "slots",
        label: "slots",
        description: "d",
        kind: "read",
        input: z.strictObject({
          minutes: z.number().int().min(10).max(600).describe("Length"),
          note: z.string().max(50).optional(),
        }),
        summarize: () => "s",
        execute: async () => "ok",
      }),
    );
    const schema = JSON.stringify(reg.toClaudeTools()[0].input_schema);
    for (const kw of ["minimum", "maximum", "maxLength"]) {
      expect(schema).not.toContain(`"${kw}"`);
    }
    expect(schema).toContain("Length (minimum 10, maximum 600)");

    const { store } = memoryStore();
    const out = await invokeTool(reg, store, ctx, "slots", { minutes: 5 });
    expect(out.status).toBe("error");
  });
});
