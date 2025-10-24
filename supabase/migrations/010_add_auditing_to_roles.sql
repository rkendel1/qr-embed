-- Enable the moddatetime extension to automatically update timestamps.
create extension if not exists moddatetime with schema extensions;

-- Add an 'updated_at' column to track when a role was last modified.
alter table public.roles add column updated_at timestamp with time zone not null default now();

-- Create a trigger function to automatically update the 'updated_at' timestamp on any row change.
create trigger handle_updated_at before update on public.roles
  for each row execute procedure moddatetime (updated_at);