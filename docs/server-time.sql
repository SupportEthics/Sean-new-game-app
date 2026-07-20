-- Soulforge Knight — trusted server clock (anti clock-cheat).
-- Paste this whole file into the Supabase SQL Editor (left sidebar ->
-- SQL Editor -> New query) and press RUN once. Safe to re-run.
--
-- Why: the game must not trust the phone's clock, or players can wind it
-- forward to fake offline earnings and reset their daily allowances. This
-- exposes the server's real UTC time (in epoch milliseconds) so the app
-- can lock onto it. Read-only and harmless — it returns a single number.

create or replace function public.server_now()
returns bigint
language sql
stable
as $$
  select (extract(epoch from now()) * 1000)::bigint;
$$;

-- The app calls it with the public anon key, so let anon execute it.
grant execute on function public.server_now() to anon;
