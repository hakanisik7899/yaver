-- Bills extracted from Gmail (e-fatura, utility and card statements).

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_message_id text not null,      -- Gmail message id
  provider text not null,               -- e.g. "Enerjisa", "Turkcell"
  category text not null default 'diger'
    check (category in ('elektrik', 'dogalgaz', 'su', 'gsm', 'internet', 'kredi_karti', 'aidat', 'diger')),
  amount numeric(12, 2),
  currency text not null default 'TRY',
  due_date date,
  period text,                          -- e.g. "Kasım 2026"
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (user_id, source_message_id)
);
alter table public.bills enable row level security;

create policy "Users read own bills"
  on public.bills for select using (auth.uid() = user_id);
-- Users may mark their own bills paid/unpaid from the UI.
create policy "Users update own bills"
  on public.bills for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index bills_user_due_idx on public.bills (user_id, status, due_date);

-- Every email the bill scanner looked at, so each is sent to the model once.
create table public.email_scan_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id text not null,
  result text not null check (result in ('bill', 'not_bill', 'error')),
  scanned_at timestamptz not null default now(),
  primary key (user_id, message_id)
);
alter table public.email_scan_log enable row level security;
create policy "Users read own scan log"
  on public.email_scan_log for select using (auth.uid() = user_id);

-- When the daily bill scan last ran for this user.
alter table public.google_connections add column bills_scanned_at timestamptz;

-- "Bill due soon" notifications, on by default.
alter table public.notification_prefs add column bills boolean not null default true;
