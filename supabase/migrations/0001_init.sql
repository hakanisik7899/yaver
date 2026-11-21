-- Yaver v0.1 initial schema

-- Google OAuth refresh tokens. Sensitive: RLS on with NO policies,
-- so only the server (secret key) can read or write them.
create table public.google_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  scopes text not null,
  updated_at timestamptz not null default now()
);
alter table public.google_connections enable row level security;

-- Actions the assistant proposes that change something (create event,
-- send email...). Reads are free; every write waits here for approval.
create table public.pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,               -- e.g. 'calendar.create_event'
  summary text not null,            -- human-readable, Turkish
  payload jsonb not null,           -- exact arguments to execute
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'executed', 'failed')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.pending_actions enable row level security;

create policy "Users read own pending actions"
  on public.pending_actions for select
  using (auth.uid() = user_id);

-- Approve/reject only; execution happens server-side.
create policy "Users decide own pending actions"
  on public.pending_actions for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status in ('approved', 'rejected'));

create index pending_actions_user_status_idx
  on public.pending_actions (user_id, status);
