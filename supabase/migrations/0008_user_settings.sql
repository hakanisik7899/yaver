-- Small per-user settings. No row = defaults.
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weather_city text not null default 'İstanbul',
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
