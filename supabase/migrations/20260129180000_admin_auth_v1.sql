-- Create extension query to ensure gen_random_uuid() and hashing functions are available
create extension if not exists "pgcrypto" with schema public;

-- Create admin_users table
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS (locked down by default)
alter table public.admin_users enable row level security;

-- NOTE: No policies added -> Deny all access to public client. Only accessible via Service Role.

-- Updated At Trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();
