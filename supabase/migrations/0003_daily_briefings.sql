-- Morning summary: one briefing per user per local day.
create table public.daily_briefings (
  user_id uuid not null references auth.users (id) on delete cascade,
  briefing_date date not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, briefing_date)
);
alter table public.daily_briefings enable row level security;

-- Users read their own briefings; the server writes them.
create policy "Users read own briefings"
  on public.daily_briefings for select
  using (auth.uid() = user_id);
