@AGENTS.md

# Yaver

AI personal assistant layer for busy professionals in Turkey. The user states a goal in natural language; Yaver gathers info from connected sources, plans, suggests, and executes only approved actions.

## Product rules
- UI copy is Turkish. Code, comments and identifiers are English.
- **Reads are free, writes need approval.** Any action that changes external state (calendar event, email, payment) is inserted into `pending_actions` and executed only after the user approves it.
- Freemium + Pro subscription.

## Tool Layer (core rule)
The model never touches the database or external services directly. Every tool call goes through `invokeTool()` in [src/lib/tools/executor.ts](src/lib/tools/executor.ts):
validate input (zod) → check permission ([policy.ts](src/lib/tools/policy.ts)) → run now or queue in `pending_actions` → write `audit_logs`.
- Permission levels: L1 read, L2 draft, L3 write after approval, L4 write automatically (user set `auto` in `tool_permissions`, or `autoByDefault` with no user setting; never for `sensitive` tools).
- `autoByDefault` is only for reversible writes to Yaver's own data (tasks). Anything touching an external service (calendar, email) stays approval-first.
- Define tools with `defineTool()` and register them in [src/lib/tools/index.ts](src/lib/tools/index.ts). Set `kind`, and `sensitive: true` for email/payment/account changes.
- Approved actions run via `executeApprovedAction()`; never call `tool.execute` directly.
- Every tool needs a Turkish `label` (shown in the Trust Center at `/trust`) and an entry in [tool-labels.ts](src/lib/agent/tool-labels.ts) for chat chips. The Trust Center reads modes via `allowedModes` / `defaultMode` / `effectiveMode` in policy.ts, so what it shows always matches what `decide()` enforces.
- Server tools run by Anthropic (web search) live in [server-tools.ts](src/lib/tools/server-tools.ts): not sent when the Trust Center denies them, and each use is audited after the response in `auditServerToolUses` (agent/run.ts).
- Conversations outlive deploys: the agent loop sends `thinking.block_binding.prefix_mismatch_behavior: "drop_block"` (beta `thinking-binding-controls-2026-08-01`), so changing the system prompt or tool list never breaks a saved conversation (it would be a 400 on new Anthropic accounts). Keep it.
- Audit log is append-only; reads are logged too.
- `npm test` covers these rules; keep it green when touching the Tool Layer.

## Roadmap
- **v0.1 (current):** Google sign-in, Calendar read + approved event creation (`calendar.events`, no invites), chat over calendar, approvals panel, morning summary card ([src/lib/briefing/generate.ts](src/lib/briefing/generate.ts): generated on first visit of the day; add a 07:00 Vercel Cron calling the same function at deploy time). Shown times always come from calendar data, never from the model.
- **v0.2 (in progress):** Gmail read-only (`gmail.readonly`, a *restricted* scope: fine for <100 test users, needs Google verification + CASA before public launch). Done: email search/read tools, daily bill scan ([src/lib/bills/scan.ts](src/lib/bills/scan.ts), extraction on `claude-haiku-5-5` by user decision, each email sent to the model once via `email_scan_log`; if the text lacks amount or due date, the bill-like PDF attachment (≤5 MB) is sent to Haiku as a document and merged), bills panel, bills in briefing and notifications. Email content is untrusted: returned under `untrusted_email(s)` keys and never treated as instructions. Also done: web search (server tool, max 5/turn, TR location) + weather (Open-Meteo, `get_weather_forecast`) + outing/weekend planning in the prompt. A web-research turn costs ~$0.4 (search results are large input).
- Later: Microsoft 365, Pro billing, Telegram/WhatsApp channel.

## Stack
- Next.js 16 App Router (`src/`), TypeScript, Tailwind v4. Note: `middleware` is now `src/proxy.ts`; `cookies()`/`headers()` are async only.
- Supabase: auth (Google provider) + Postgres. Migrations in `supabase/migrations/`.
- Google refresh tokens live in `google_connections` (RLS on, no policies). Access them only via `createAdminClient()` on the server.
- Claude API (`@anthropic-ai/sdk`) for the agent: self-hosted manual loop on the Messages API in [src/lib/agent/run.ts](src/lib/agent/run.ts) (`claude-opus-5-5`, effort `medium`, server-side `fallbacks: "default"`). Chat history in `ai_messages` is append-only and stores raw content blocks (thinking/fallback included); never edit or filter stored turns.
- Notifications: web push via `public/sw.js` (push only, no fetch handler/caching) and `web-push` (named imports only). Checks in [src/lib/notifications/check.ts](src/lib/notifications/check.ts) run every 5 min from Supabase pg_cron → `/api/cron/notify` (migration 0006; secret in Vault). They read data directly (not via Tool Layer, to keep the audit log clean) but must respect Trust Center read denials; every send is deduped in `notification_log`.
- Time: Türkiye-only for now, fixed UTC+3 helpers in [src/lib/time.ts](src/lib/time.ts).
- Deploy: Vercel.

## Commands
- `npm run dev` / `npm run build` / `npm run lint` / `npm test`

## Product vision reference
The long-term concept (8 hubs, agent center, proactive intelligence, Trust Center, Starter/Plus/Pro/Family plans) came from a "NEXORA" concept doc. Name stays **Yaver**; stack stays single TypeScript (no separate Python/Redis/n8n until a real need). Build in thin vertical slices toward that vision.
