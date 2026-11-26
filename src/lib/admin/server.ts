import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "./access";

/** The signed-in admin's user id, or null for everyone else. */
export async function currentAdminId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  const email = data?.claims?.email as string | undefined;
  return id && isAdminEmail(email) ? id : null;
}
