import "server-only";
import { createCalendarEvent, findFreeSlots, listCalendarEvents } from "./builtin/calendar";
import { getCurrentDatetime } from "./builtin/datetime";
import { completeTask, createTask, listTasks, updateTask } from "./builtin/tasks";
import { ToolRegistry } from "./registry";

/** All tools Yaver can use. New integrations register their tools here. */
export const registry = new ToolRegistry().register(
  getCurrentDatetime,
  listCalendarEvents,
  findFreeSlots,
  createCalendarEvent,
  listTasks,
  createTask,
  completeTask,
  updateTask,
);

export { invokeTool, executeApprovedAction, rejectAction } from "./executor";
export type { ToolContext, ToolOutcome } from "./types";
