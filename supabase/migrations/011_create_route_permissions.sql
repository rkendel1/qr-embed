-- 1. Create the table to store route permissions
create table public.route_permissions (
  id uuid primary key default gen_random_uuid(),
  route_path text not null unique,
  role_ids uuid[] not null default '{}',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 2. Enable Row Level Security
alter table public.route_permissions enable row level security;

-- 3. Add updated_at trigger
create trigger handle_updated_at before update on public.route_permissions
  for each row execute procedure moddatetime (updated_at);