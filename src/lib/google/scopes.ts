/**
 * Google OAuth scopes Yaver requests.
 * v0.1 is read-only calendar. Gmail (restricted scope, needs CASA
 * assessment for public launch) comes in a later milestone.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");
