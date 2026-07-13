-- Soulforge Knight — cloud saves bound to Sign in with Apple accounts.
-- Paste into the Supabase SQL Editor and RUN once (safe to re-run).
-- Run AFTER docs/leaderboard.sql (either order works; they're independent).
--
-- Security model: rows live under the player's Supabase Auth user id
-- (created by Sign in with Apple). Row Level Security means a signed-in
-- player can only ever read and write THEIR OWN save; the anon key alone
-- can't touch anything here.

create table if not exists public.cloud_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  save       jsonb not null,
  stage      int not null default 1 check (stage between 1 and 9999),
  updated_at timestamptz not null default now()
);

alter table public.cloud_saves enable row level security;

drop policy if exists "own save read" on public.cloud_saves;
create policy "own save read" on public.cloud_saves
  for select using (auth.uid() = user_id);

drop policy if exists "own save insert" on public.cloud_saves;
create policy "own save insert" on public.cloud_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "own save update" on public.cloud_saves;
create policy "own save update" on public.cloud_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
