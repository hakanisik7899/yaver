-- Tasks: the user's to-dos, managed from chat (via the Tool Layer) or the panel.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  notes text,
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.tasks enable row level security;

-- Tasks are the user's own data: they may manage them directly in the UI.
create policy "Users manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index tasks_user_open_idx on public.tasks (user_id, status, due_date);
