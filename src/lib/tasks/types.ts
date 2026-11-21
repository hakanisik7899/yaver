export type TaskPriority = "low" | "normal" | "high";
export type TaskStatus = "open" | "done";

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null; // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  completed_at: string | null;
}

export const TASK_COLUMNS = "id, title, notes, due_date, priority, status, created_at, completed_at";

export type TaskGroup = "overdue" | "today" | "upcoming" | "someday";

/** Buckets an open task relative to `today` (YYYY-MM-DD, user's zone). */
export function groupOf(task: Pick<Task, "due_date">, today: string): TaskGroup {
  if (!task.due_date) return "someday";
  if (task.due_date < today) return "overdue";
  if (task.due_date === today) return "today";
  return "upcoming";
}

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 };

/** Overdue first, then by due date, then priority; undated last. */
export function sortTasks<T extends Pick<Task, "due_date" | "priority" | "created_at">>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date < b.due_date ? -1 : 1;
    }
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return p !== 0 ? p : a.created_at.localeCompare(b.created_at);
  });
}
