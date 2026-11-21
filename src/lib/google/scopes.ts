/**
 * Google OAuth scopes Yaver requests.
 * calendar.events = read and write events (no access to calendar settings
 * or sharing). Every write still goes through the approval queue.
 * Gmail (restricted scope, needs CASA assessment for public launch) comes
 * in a later milestone.
 */
export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"].join(" ");

/** Short label stored with the connection, for display and debugging. */
export const GOOGLE_SCOPES_LABEL = "calendar.events";
