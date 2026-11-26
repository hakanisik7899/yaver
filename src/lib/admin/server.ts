import "server-only";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "./access";

/** The signed-in admin's user id, or null for everyone else. */
export async function currentAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  const email = data?.claims?.email as string | undefined;
  return id && isAdminEmail(email) ? id : null;
}

/** User ids of everyone in ADMIN_EMAILS who has signed in at least once. */
export async function adminUserIds(): Promise<string[]> {
  if (!process.env.ADMIN_EMAILS?.trim()) return [];
  const { data, error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error("adminUserIds failed", error);
    return [];
  }
  return data.users.filter((u) => isAdminEmail(u.email)).map((u) => u.id);
}
