"use client";

import { useTransition } from "react";
import { deleteConversation } from "../actions";

export function DeleteConversationButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Bu sohbet kalıcı olarak silinsin mi?")) return;
        startTransition(() => deleteConversation(id));
      }}
      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted)] hover:text-red-500 disabled:opacity-40"
    >
      {pending ? "Siliniyor…" : "Sil"}
    </button>
  );
}
