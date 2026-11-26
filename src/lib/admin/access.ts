/** Pure check: is this email in the comma-separated ADMIN_EMAILS list? */
export function isAdminEmail(email: string | null | undefined, list = process.env.ADMIN_EMAILS ?? ""): boolean {
  if (!email) return false;
  const admins = list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
