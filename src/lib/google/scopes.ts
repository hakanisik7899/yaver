/**
 * Google OAuth scopes Yaver requests.
 * - calendar.events: read and write events (writes always need approval).
 * - gmail.readonly: read email for bills and email search. Never send.
 *   This is a RESTRICTED scope: fine for test users (<100), but a public
 *   launch needs Google verification and a CASA security assessment.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

/** Short label stored with the connection, for display and debugging. */
export const GOOGLE_SCOPES_LABEL = "calendar.events gmail.readonly";
