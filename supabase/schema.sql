create extension if not exists pgcrypto;

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  participant_id text not null,
  participant_name text not null,
  amount integer not null check (amount > 0),
  comment text not null check (length(trim(comment)) > 0),
  entry_date date not null,
  created_by_telegram_id text not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_entry_date_idx on public.entries (entry_date desc);
create index if not exists entries_participant_id_idx on public.entries (participant_id);
create index if not exists entries_created_at_idx on public.entries (created_at desc);

alter table public.entries enable row level security;

revoke all on table public.entries from anon;
revoke all on table public.entries from authenticated;
grant all on table public.entries to service_role;

create or replace function public.set_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;

create trigger entries_set_updated_at
before update on public.entries
for each row
execute function public.set_entries_updated_at();
