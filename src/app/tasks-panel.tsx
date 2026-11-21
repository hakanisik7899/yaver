import { createClient } from "@/lib/supabase/server";
import { TASK_COLUMNS, groupOf, sortTasks, type Task, type TaskGroup } from "@/lib/tasks/types";
import { todayLocal } from "@/lib/time";
import { AddTaskForm, TaskItem } from "./task-controls";

const GROUPS: { key: TaskGroup; label: string }[] = [
  { key: "overdue", label: "Gecikmiş" },
  { key: "today", label: "Bugün" },
  { key: "upcoming", label: "Yaklaşan" },
  { key: "someday", label: "Tarihsiz" },
];

function dueLabel(date: string) {
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "short", weekday: "short" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export async function TasksPanel() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);

  const today = todayLocal();
  const tasks = sortTasks((data ?? []) as Task[]);
  const grouped = GROUPS.map((g) => ({
    ...g,
    tasks: tasks.filter((t) => groupOf(t, today) === g.key),
  })).filter((g) => g.tasks.length > 0);

  return (
    <div className="space-y-4">
      <AddTaskForm />
      {grouped.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Açık görevin yok. Buradan ekleyebilir ya da Yaver&apos;e &quot;cumaya kadar raporu bitirmem gerek&quot;
          diyebilirsin.
        </p>
      ) : (
        grouped.map((g) => (
          <div key={g.key} className="space-y-1.5">
            <h3
              className={`text-xs font-medium uppercase tracking-wide ${
                g.key === "overdue" ? "text-red-500" : "text-[var(--muted)]"
              }`}
            >
              {g.label} · {g.tasks.length}
            </h3>
            <ul className="space-y-1">
              {g.tasks.map((t) => (
                <TaskItem
                  key={t.id}
                  id={t.id}
                  title={t.title}
                  meta={[
                    t.due_date && g.key !== "today" ? dueLabel(t.due_date) : null,
                    t.priority === "high" ? "Önemli" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  important={t.priority === "high"}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
