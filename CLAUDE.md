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
- Permission levels: L1 read, L2 draft, L3 write after approval, L4 write automatically (user set `auto` in `tool_permissions`; never for `sensitive` tools).
- Define tools with `defineTool()` and register them in [src/lib/tools/index.ts](src/lib/tools/index.ts). Set `kind`, and `sensitive: true` for email/payment/account changes.
- Approved actions run via `executeApprovedAction()`; never call `tool.execute` directly.
- Audit log is append-only; reads are logged too.
- `npm test` covers these rules; keep it green when touching the Tool Layer.

## Roadmap
- **v0.1 (current):** Google sign-in, Calendar read + approved event creation (`calendar.events`, no invites), chat over calendar, approvals panel. Still to do: daily morning summary.
- **v0.2:** Bills from Gmail e-invoices (Gmail is a *restricted* scope: fine for <100 beta testers, needs Google verification + CASA assessment before public launch), web research (events, venues, weather), weekend/plan generation.
- Later: Microsoft 365, Pro billing, Telegram/WhatsApp channel.

## Stack
- Next.js 16 App Router (`src/`), TypeScript, Tailwind v4. Note: `middleware` is now `src/proxy.ts`; `cookies()`/`headers()` are async only.
- Supabase: auth (Google provider) + Postgres. Migrations in `supabase/migrations/`.
- Google refresh tokens live in `google_connections` (RLS on, no policies). Access them only via `createAdminClient()` on the server.
- Claude API (`@anthropic-ai/sdk`) for the agent: self-hosted manual loop on the Messages API in [src/lib/agent/run.ts](src/lib/agent/run.ts) (`claude-opus-5-5`, effort `medium`, server-side `fallbacks: "default"`). Chat history in `ai_messages` is append-only and stores raw content blocks (thinking/fallback included); never edit or filter stored turns.
- Time: Türkiye-only for now, fixed UTC+3 helpers in [src/lib/time.ts](src/lib/time.ts).
- Deploy: Vercel.

## Commands
- `npm run dev` / `npm run build` / `npm run lint` / `npm test`

## Product vision reference
The long-term concept (8 hubs, agent center, proactive intelligence, Trust Center, Starter/Plus/Pro/Family plans) came from a "NEXORA" concept doc. Name stays **Yaver**; stack stays single TypeScript (no separate Python/Redis/n8n until a real need). Build in thin vertical slices toward that vision.
