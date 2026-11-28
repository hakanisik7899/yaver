/**
 * Spoken welcome when the user opens Yaver, with their first name when
 * known: "Merhaba, Ayşe! Ben asistanın Yaver! Bugün ne yapalım?"
 */
export function greetingText(firstName?: string | null): string {
  const name = firstName?.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{M}'-]/gu, "");
  return `${name ? `Merhaba, ${name}!` : "Merhaba!"} Ben asistanın Yaver! Bugün ne yapalım?`;
}
