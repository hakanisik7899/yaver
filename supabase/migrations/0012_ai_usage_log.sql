-- One row per Claude API response, with the tokens it billed and its cost
-- at list prices (src/lib/usage/cost.ts). Server only: RLS on, no policies.
create table public.ai_usage_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  -- Türkiye calendar day, for daily charts.
  day date not null,
  source text not null check (source in ('chat', 'briefing', 'bill_scan')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  web_searches integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_log_day_idx on public.ai_usage_log (day);
create index ai_usage_log_user_day_idx on public.ai_usage_log (user_id, day);
alter table public.ai_usage_log enable row level security;

-- Admin page aggregates, computed in the database so they never hit the
-- API's row limit. Service role only.

-- One row per Türkiye day from p_from to today (days without use included).
create function public.admin_daily_stats(p_from date, p_to date)
returns table (day date, messages bigint, web_searches bigint, active_users bigint, cost_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  select d::date as day,
    coalesce(u.messages, 0), coalesce(u.web_searches, 0), coalesce(u.active_users, 0),
    coalesce(c.cost_usd, 0)
  from generate_series(p_from, p_to, interval '1 day') as d
  left join (
    select day, sum(messages) as messages, sum(web_searches) as web_searches,
      count(*) filter (where messages > 0) as active_users
    from usage_daily where day between p_from and p_to group by day
  ) u on u.day = d::date
  left join (
    select day, sum(cost_usd) as cost_usd from ai_usage_log where day between p_from and p_to group by day
  ) c on c.day = d::date
  order by 1;
$$;

-- Cost and messages per user over the period.
create function public.admin_user_totals(p_from date, p_to date)
returns table (user_id uuid, messages bigint, cost_usd numeric)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(m.user_id, c.user_id), coalesce(m.messages, 0), coalesce(c.cost_usd, 0)
  from (
    select user_id, sum(messages) as messages from usage_daily
    where day between p_from and p_to group by user_id
  ) m
  full join (
    select user_id, sum(cost_usd) as cost_usd from ai_usage_log
    where day between p_from and p_to and user_id is not null group by user_id
  ) c on c.user_id = m.user_id;
$$;

-- Cost per source (chat, briefing, bill_scan) over the period.
create function public.admin_cost_by_source(p_from date, p_to date)
returns table (source text, cost_usd numeric, calls bigint)
language sql
stable
security definer
set search_path = public
as $$
  select source, sum(cost_usd), count(*) from ai_usage_log
  where day between p_from and p_to group by source order by 2 desc;
$$;

revoke execute on function public.admin_daily_stats(date, date) from public, anon, authenticated;
revoke execute on function public.admin_user_totals(date, date) from public, anon, authenticated;
revoke execute on function public.admin_cost_by_source(date, date) from public, anon, authenticated;
grant execute on function public.admin_daily_stats(date, date) to service_role;
grant execute on function public.admin_user_totals(date, date) to service_role;
grant execute on function public.admin_cost_by_source(date, date) to service_role;
