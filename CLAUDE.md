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
- Audit log is append-only; reads are logged too.
- `npm test` covers these rules; keep it green when touching the Tool Layer.

## Roadmap
- **v0.1 (current):** Google sign-in, Calendar read + approved event creation (`calendar.events`, no invites), chat over calendar, approvals panel, morning summary card ([src/lib/briefing/generate.ts](src/lib/briefing/generate.ts): generated on first visit of the day; add a 07:00 Vercel Cron calling the same function at deploy time). Shown times always come from calendar data, never from the model.
- **v0.2:** Bills from Gmail e-invoices (Gmail is a *restricted* scope: fine for <100 beta testers, needs Google verification + CASA assessment before public launch), web research (events, venues, weather), weekend/plan generation.
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
