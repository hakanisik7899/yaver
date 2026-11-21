-- Proactive notifications: device subscriptions, preferences, send log.

-- One row per device/browser that allowed notifications.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

-- Users see and remove their own devices; the server registers them.
create policy "Users read own subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Users delete own subscriptions"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- What to notify about and when to stay quiet. No row = defaults.
create table public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  briefing boolean not null default true,      -- morning summary ready
  meetings boolean not null default true,      -- event starting soon
  overdue_tasks boolean not null default true, -- daily overdue reminder
  approvals boolean not null default true,     -- action waiting for approval
  quiet_start time not null default '22:00',   -- local time (Türkiye)
  quiet_end time not null default '07:00',
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;

create policy "Users manage own notification prefs"
  on public.notification_prefs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Every notification sent, keyed so the same thing is never sent twice
-- (e.g. 'meeting' + event id + start time).
create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref_key text not null,
  title text not null,
  body text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref_key)
);
alter table public.notification_log enable row level security;

create policy "Users read own notification log"
  on public.notification_log for select using (auth.uid() = user_id);
