-- Yaver core: conversations, Trust Center permissions and audit log.

-- Conversations ---------------------------------------------------------
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ai_conversations enable row level security;

create policy "Users manage own conversations"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index ai_conversations_user_idx
  on public.ai_conversations (user_id, updated_at desc);

-- Messages store the raw Messages API content blocks (text, tool_use,
-- tool_result, thinking) so a conversation can be replayed unchanged.
create table public.ai_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ai_messages enable row level security;

create policy "Users read own messages"
  on public.ai_messages for select
  using (auth.uid() = user_id);
-- Inserts happen server-side only (secret key), after the agent loop.

create index ai_messages_conversation_idx
  on public.ai_messages (conversation_id, id);

-- Trust Center: per-tool user setting ------------------------------------
-- No row = default (reads run, writes ask). 'auto' = L4 for that tool
-- (ignored by the server for sensitive tools). 'deny' = never run.
create table public.tool_permissions (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_name text not null,
  mode text not null check (mode in ('auto', 'ask', 'deny')),
  updated_at timestamptz not null default now(),
  primary key (user_id, tool_name)
);
alter table public.tool_permissions enable row level security;

create policy "Users manage own tool permissions"
  on public.tool_permissions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Pending actions: link to agent and conversation ------------------------
alter table public.pending_actions
  add column agent text not null default 'core',
  add column conversation_id uuid references public.ai_conversations (id) on delete set null;

-- Approval now goes through a server action that validates and executes,
-- so users no longer update rows directly.
drop policy "Users decide own pending actions" on public.pending_actions;

-- Audit log: append-only record of everything the assistant did ----------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  agent text not null,
  tool_name text not null,
  event text not null
    check (event in ('executed', 'proposed', 'approved', 'rejected', 'denied', 'failed')),
  permission_level smallint check (permission_level between 1 and 4),
  input jsonb,
  summary text not null,
  approved_by_user boolean not null default false,
  reversible boolean not null default false,
  pending_action_id uuid references public.pending_actions (id) on delete set null,
  conversation_id uuid references public.ai_conversations (id) on delete set null,
  error text,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

-- Users can read their history; nobody can edit or delete it via the API.
create policy "Users read own audit log"
  on public.audit_logs for select
  using (auth.uid() = user_id);

create index audit_logs_user_idx on public.audit_logs (user_id, created_at desc);
