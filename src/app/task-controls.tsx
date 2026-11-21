"use client";

import { useRef, useState, useTransition } from "react";
import { addTask, setTaskDone } from "./actions";

export function TaskItem({
  id,
  title,
  meta,
  important,
}: {
  id: string;
  title: string;
  meta: string;
  important: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  return (
    <li className={`flex items-start gap-3 py-1 ${done ? "opacity-40" : ""}`}>
      <button
        type="button"
        aria-label={`${title} tamamlandı olarak işaretle`}
        disabled={pending || done}
        onClick={() => {
          setDone(true);
          startTransition(async () => {
            const res = await setTaskDone(id, true);
            if (!res.ok) setDone(false);
          });
        }}
        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition ${
          important ? "border-[var(--accent)]" : "border-[var(--muted)]"
        } ${done ? "bg-[var(--accent)]" : "hover:bg-[var(--accent-soft)]"}`}
      />
      <span className="min-w-0 text-sm">
        <span className={done ? "line-through" : ""}>{title}</span>
        {meta && <span className="block text-xs text-[var(--muted)]">{meta}</span>}
      </span>
    </li>
  );
}

export function AddTaskForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const title = String(data.get("title") ?? "");
        const due_date = String(data.get("due_date") ?? "");
        if (!title.trim()) return;
        startTransition(async () => {
          const res = await addTask({ title, due_date });
          if (res.ok) {
            form.current?.reset();
            setError(null);
          } else setError(res.message);
        });
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <input
          name="title"
          placeholder="Yeni görev…"
          maxLength={200}
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-base outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)] sm:text-sm"
        />
        <button
          disabled={pending}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
        >
          Ekle
        </button>
      </div>
      <input
        type="date"
        name="due_date"
        aria-label="Son tarih (isteğe bağlı)"
        className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-1.5 text-base text-[var(--muted)] outline-none sm:text-sm"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}
