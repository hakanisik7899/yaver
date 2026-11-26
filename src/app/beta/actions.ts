"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

const Join = z.object({
  email: z.email().max(254),
  name: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
  /** Honeypot: hidden from people, bots fill it in. */
  website: z.string().max(0).optional(),
});

/** Public beta waitlist form. Same answer whether or not the address was already listed. */
export async function joinWaitlist(input: { email: string; name?: string; note?: string; website?: string }) {
  const parsed = Join.safeParse({ ...input, email: input.email?.trim().toLowerCase() });
  if (!parsed.success) {
    return { ok: false as const, message: "Geçerli bir Gmail ya da Google hesabı adresi yaz." };
  }
  // A bot filled the hidden field: pretend it worked.
  if (input.website) return { ok: true as const };

  const { email, name, note } = parsed.data;
  const { error } = await createAdminClient()
    .from("waitlist")
    .insert({ email, name: name || null, note: note || null });
  // 23505 = already on the list: fine, don't reveal it.
  if (error && error.code !== "23505") {
    console.error("joinWaitlist failed", error);
    return { ok: false as const, message: "Kaydedilemedi, lütfen tekrar dene." };
  }
  return { ok: true as const };
}
