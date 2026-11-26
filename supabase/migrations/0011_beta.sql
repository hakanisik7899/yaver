-- Closed beta: waitlist, in-app feedback, first-run onboarding.

-- People asking to join the beta (public form). Server only: RLS on with
-- no policies, read and written through the service role.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'invited', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index waitlist_email_key on public.waitlist (lower(email));
alter table public.waitlist enable row level security;

-- Feedback sent from inside the app. Server only, like the waitlist.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null,
  page text,
  user_agent text,
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;

-- When the user finished (or skipped) the first-run introduction.
alter table public.user_settings add column onboarded_at timestamptz;
