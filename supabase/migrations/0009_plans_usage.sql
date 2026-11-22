-- Plans (Ücretsiz / Pro) and daily usage counters.
-- Plans are assigned by hand for now (no payments yet). As the project
-- owner, in the SQL Editor:
--   insert into public.user_plans (user_id, plan, note)
--   select id, 'pro', 'beta' from auth.users where email = '<user email>'
--   on conflict (user_id) do update set plan = 'pro', updated_at = now();

create table public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  -- Pro ends at this moment; null = no end date.
  pro_until timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.user_plans enable row level security;
-- Users can read their plan, never change it.
create policy "Users read own plan" on public.user_plans for select using (auth.uid() = user_id);

create table public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Türkiye calendar day.
  day date not null,
  messages integer not null default 0,
  web_searches integer not null default 0,
  primary key (user_id, day)
);

alter table public.usage_daily enable row level security;
create policy "Users read own usage" on public.usage_daily for select using (auth.uid() = user_id);

-- Atomically takes one message from today's allowance.
-- Returns the new count, or -1 when the limit is already reached.
create function public.consume_message(p_user uuid, p_day date, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into usage_daily as u (user_id, day, messages)
  values (p_user, p_day, 1)
  on conflict (user_id, day) do update set messages = u.messages + 1
    where u.messages < p_limit
  returning messages into n;
  return coalesce(n, -1);
end;
$$;

-- Adds to (or, with negative values, gives back) today's counters.
create function public.add_usage(p_user uuid, p_day date, p_messages integer, p_web_searches integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into usage_daily as u (user_id, day, messages, web_searches)
  values (p_user, p_day, greatest(p_messages, 0), greatest(p_web_searches, 0))
  on conflict (user_id, day) do update set
    messages = greatest(u.messages + p_messages, 0),
    web_searches = greatest(u.web_searches + p_web_searches, 0);
$$;

-- Only the server (service role) may change counters.
revoke execute on function public.consume_message(uuid, date, integer) from public, anon, authenticated;
revoke execute on function public.add_usage(uuid, date, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_message(uuid, date, integer) to service_role;
grant execute on function public.add_usage(uuid, date, integer, integer) to service_role;
