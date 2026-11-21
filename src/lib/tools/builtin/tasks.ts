import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { TASK_COLUMNS, sortTasks, type Task } from "@/lib/tasks/types";
import { DATE_REGEX } from "@/lib/time";
import { defineTool } from "../registry";

// Tasks are Yaver's own data: writes are reversible, internal and run at
// L4 by default (user decision, 2026-11-21). Every call is still audited.

const PRIORITY = z.enum(["low", "normal", "high"]);

function shortDate(date: string | null | undefined) {
  if (!date) return "tarihsiz";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

async function ownTask(userId: string, taskId: string): Promise<Task> {
  const { data, error } = await createAdminClient()
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Görev bulunamadı.");
  return data as Task;
}

export const listTasks = defineTool({
  name: "list_tasks",
  label: "Görevleri okuma",
  description:
    "Lists the user's tasks. Use for questions about to-dos, deadlines or what to work on, " +
    "and together with the calendar when planning a day or week. Also use it to find a " +
    "task's id before completing or updating it.",
  kind: "read",
  input: z.strictObject({
    status: z.enum(["open", "done", "all"]).describe("Which tasks; usually open"),
    due_on_or_before: z
      .string()
      .regex(DATE_REGEX)
      .optional()
      .describe("Only tasks due on or before this day, YYYY-MM-DD (undated tasks excluded)"),
  }),
  summarize: (i) => `Görevler okundu (${i.status})`,
  async execute(ctx, i) {
    let q = createAdminClient().from("tasks").select(TASK_COLUMNS).eq("user_id", ctx.userId);
    if (i.status !== "all") q = q.eq("status", i.status);
    if (i.due_on_or_before) q = q.lte("due_date", i.due_on_or_before);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const tasks = sortTasks(data as Task[]);
    return { count: tasks.length, tasks };
  },
});

export const createTask = defineTool({
  name: "create_task",
  label: "Görev ekleme",
  description:
    "Adds a task to the user's list. Runs immediately (no approval needed) and can be undone. " +
    "Use when the user asks to remember, add or plan a to-do. Set due_date only if the user " +
    "gave or clearly implied a day.",
  kind: "write",
  autoByDefault: true,
  reversible: true,
  input: z.strictObject({
    title: z.string().trim().min(1).max(200).describe("Short task title, user's language"),
    due_date: z.string().regex(DATE_REGEX).optional().describe("Due day, YYYY-MM-DD"),
    priority: PRIORITY.optional().describe("Default normal; high only if urgent or important"),
    notes: z.string().max(2000).optional(),
  }),
  summarize: (i) => `Görev eklendi: ${i.title} (${shortDate(i.due_date)})`,
  async execute(ctx, i) {
    const { data, error } = await createAdminClient()
      .from("tasks")
      .insert({
        user_id: ctx.userId,
        title: i.title,
        due_date: i.due_date ?? null,
        priority: i.priority ?? "normal",
        notes: i.notes ?? null,
      })
      .select(TASK_COLUMNS)
      .single();
    if (error) throw error;
    return { created: true, task: data };
  },
});

export const completeTask = defineTool({
  name: "complete_task",
  label: "Görev tamamlama",
  description:
    "Marks one of the user's tasks as done. Runs immediately and can be undone. " +
    "Get the task id from list_tasks first; never guess ids.",
  kind: "write",
  autoByDefault: true,
  reversible: true,
  input: z.strictObject({ task_id: z.uuid().describe("Task id from list_tasks") }),
  summarize: () => "Görev tamamlandı olarak işaretlendi",
  async execute(ctx, i) {
    const task = await ownTask(ctx.userId, i.task_id);
    if (task.status === "done") return { alreadyDone: true, task };
    const { data, error } = await createAdminClient()
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", i.task_id)
      .eq("user_id", ctx.userId)
      .select(TASK_COLUMNS)
      .single();
    if (error) throw error;
    return { completed: true, task: data };
  },
});

export const updateTask = defineTool({
  name: "update_task",
  label: "Görev güncelleme / erteleme",
  description:
    "Changes a task's title, due date, priority or notes, e.g. to postpone it. Runs " +
    "immediately and can be undone. Get the id from list_tasks first. Set clear_due_date " +
    "to remove the date.",
  kind: "write",
  autoByDefault: true,
  reversible: true,
  input: z.strictObject({
    task_id: z.uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    due_date: z.string().regex(DATE_REGEX).optional().describe("New due day, YYYY-MM-DD"),
    clear_due_date: z.boolean().optional(),
    priority: PRIORITY.optional(),
    notes: z.string().max(2000).optional(),
    reopen: z.boolean().optional().describe("Set true to mark a done task as open again"),
  }),
  summarize: (i) => {
    const parts: string[] = [];
    if (i.title) parts.push(`başlık: ${i.title}`);
    if (i.due_date) parts.push(`tarih: ${shortDate(i.due_date)}`);
    if (i.clear_due_date) parts.push("tarih kaldırıldı");
    if (i.priority) parts.push(`öncelik: ${i.priority}`);
    if (i.reopen) parts.push("yeniden açıldı");
    return `Görev güncellendi${parts.length ? ` (${parts.join(", ")})` : ""}`;
  },
  async execute(ctx, i) {
    await ownTask(ctx.userId, i.task_id);
    const patch: Record<string, unknown> = {};
    if (i.title !== undefined) patch.title = i.title;
    if (i.due_date !== undefined) patch.due_date = i.due_date;
    if (i.clear_due_date) patch.due_date = null;
    if (i.priority !== undefined) patch.priority = i.priority;
    if (i.notes !== undefined) patch.notes = i.notes;
    if (i.reopen) Object.assign(patch, { status: "open", completed_at: null });
    if (Object.keys(patch).length === 0) throw new Error("Değiştirilecek bir alan verilmedi.");

    const { data, error } = await createAdminClient()
      .from("tasks")
      .update(patch)
      .eq("id", i.task_id)
      .eq("user_id", ctx.userId)
      .select(TASK_COLUMNS)
      .single();
    if (error) throw error;
    return { updated: true, task: data };
  },
});
