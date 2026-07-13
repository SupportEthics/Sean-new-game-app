-- Soulforge Knight — global leaderboard schema.
-- Paste this whole file into the Supabase SQL Editor (left sidebar ->
-- SQL Editor -> New query) and press RUN once. Safe to re-run.
--
-- Security model: the app ships the public anon key. Reads are open
-- (it's a public leaderboard); writes are ONLY possible through the
-- submit_score function below, which validates everything and rate
-- limits rewrites, so the anon key can't vandalise the board.

create table if not exists public.leaderboard (
  device_id  uuid primary key,
  name       text not null check (name ~ '^[A-Z0-9 ]{3,20}$'),
  stage      int  not null check (stage between 1 and 999),
  prestiges  int  not null default 0 check (prestiges between 0 and 99),
  skin       text not null default 'squire' check (char_length(skin) <= 20),
  platform   text not null default 'web' check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_stage_idx
  on public.leaderboard (stage desc, updated_at asc);

alter table public.leaderboard enable row level security;

-- Anyone may read the board…
drop policy if exists "public read" on public.leaderboard;
create policy "public read" on public.leaderboard
  for select using (true);

-- …but nobody may write directly (no insert/update/delete policies).
-- All writes go through this validated, rate-limited function:
create or replace function public.submit_score(
  p_device uuid,
  p_name text,
  p_stage int,
  p_prestiges int default 0,
  p_skin text default 'squire',
  p_platform text default 'web'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_device is null
     or p_name !~ '^[A-Z0-9 ]{3,20}$'
     or p_stage is null or p_stage < 1 or p_stage > 999 then
    return; -- silently drop garbage
  end if;

  insert into leaderboard (device_id, name, stage, prestiges, skin, platform)
  values (
    p_device,
    p_name,
    p_stage,
    least(greatest(coalesce(p_prestiges, 0), 0), 99),
    left(coalesce(p_skin, 'squire'), 20),
    case when p_platform in ('ios', 'android', 'web') then p_platform else 'web' end
  )
  on conflict (device_id) do update
    set name       = excluded.name,
        stage      = greatest(leaderboard.stage, excluded.stage),
        prestiges  = greatest(leaderboard.prestiges, excluded.prestiges),
        skin       = excluded.skin,
        platform   = excluded.platform,
        updated_at = now()
    -- rate limit: a device may rewrite its row at most every 10 seconds
    where leaderboard.updated_at < now() - interval '10 seconds';
end;
$$;

grant execute on function public.submit_score to anon;
