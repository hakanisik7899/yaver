/**
 * Yaver's assistant characters, one per area of the product. The same
 * assistant answers everything; the persona only changes how it looks
 * (chat avatar, card headers), based on which tools a reply used.
 */
export const PERSONA_IDS = ["general", "planner", "finance", "creative", "wellness", "home"] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

export const PERSONAS: Record<PersonaId, { label: string; accent: string }> = {
  general: { label: "Genel Asistan", accent: "#5fd0ff" },
  planner: { label: "Planlayıcı Asistan", accent: "#a78bfa" },
  finance: { label: "Finans Asistanı", accent: "#34d399" },
  creative: { label: "Yaratıcı Asistan", accent: "#fb923c" },
  wellness: { label: "Wellness Asistanı", accent: "#86efac" },
  // No smart home features yet; the character is ready for that hub.
  home: { label: "Akıllı Ev Asistanı", accent: "#2dd4bf" },
};

/** Tools that belong to an area. Tools not listed keep the general persona. */
const TOOL_PERSONA: Record<string, PersonaId> = {
  list_calendar_events: "planner",
  find_free_slots: "planner",
  create_calendar_event: "planner",
  list_tasks: "planner",
  create_task: "planner",
  complete_task: "planner",
  update_task: "planner",
  list_bills: "finance",
  mark_bill_paid: "finance",
  create_email_reply_draft: "creative",
  get_weather_forecast: "wellness",
};

export function toolPersona(toolName: string): PersonaId {
  return TOOL_PERSONA[toolName] ?? "general";
}

/**
 * Persona of a reply after it used `toolName`: the first area-specific
 * tool decides, so the avatar does not flip back and forth mid-reply.
 */
export function nextPersona(current: PersonaId | undefined, toolName: string): PersonaId {
  if (current && current !== "general") return current;
  return toolPersona(toolName);
}
