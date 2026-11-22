import "server-only";
import { createCalendarEvent, findFreeSlots, listCalendarEvents } from "./builtin/calendar";
import { listBills, markBillPaid } from "./builtin/bills";
import { getCurrentDatetime } from "./builtin/datetime";
import { readEmail, searchEmails } from "./builtin/email";
import { completeTask, createTask, listTasks, updateTask } from "./builtin/tasks";
import { getWeatherForecast } from "./builtin/weather";
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
  searchEmails,
  readEmail,
  listBills,
  markBillPaid,
  getWeatherForecast,
);

export { invokeTool, executeApprovedAction, rejectAction } from "./executor";
export type { ToolContext, ToolOutcome } from "./types";
