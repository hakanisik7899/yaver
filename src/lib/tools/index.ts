import "server-only";
import { createCalendarEvent, findFreeSlots, listCalendarEvents } from "./builtin/calendar";
import { getCurrentDatetime } from "./builtin/datetime";
import { ToolRegistry } from "./registry";

/** All tools Yaver can use. New integrations register their tools here. */
export const registry = new ToolRegistry().register(
  getCurrentDatetime,
  listCalendarEvents,
  findFreeSlots,
  createCalendarEvent,
);

export { invokeTool, executeApprovedAction, rejectAction } from "./executor";
export type { ToolContext, ToolOutcome } from "./types";
