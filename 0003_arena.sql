-- Fate Forged Heroes: arena + leaderboards
-- Run this once in Supabase → SQL Editor, after 0001_saves.sql and 0002_save_history.sql.
--
-- The arena tables are only written by the `arena` Edge Function (supabase/functions/arena), which uses the
-- service role and plays every fight itself. Players can read their own fight log and rewards, and call the
-- leaderboard and reward functions below. Rule of thumb: nothing a browser sends is trusted for arena results.

-- ---------- players ----------
create table if not exists public.arena_players (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  name          text not null default 'Adventurer',
  avatar        text,
  rating        int not null default 1000,
  wins          int not null default 0,
  losses        int not null default 0,
  def_wins      int not null default 0,
  def_losses    int not null default 0,
  defense       jsonb,                          -- checked team snapshot (see K.checkTeam)
  defense_power int not null default 0,
  tokens        int not null default 10,
  tokens_at     timestamptz not null default now(),
  offers        jsonb,                          -- the three opponents currently offered (players and bots)
  week_fights   int not null default 0,
  updated_at    timestamptz not null default now(),
  constraint arena_defense_size check (defense is null or pg_column_size(defense) < 20000)
);
create index if not exists arena_players_rating on public.arena_players (rating desc);
alter table public.arena_players enable row level security;
-- no policies: browsers cannot read or write this table directly

-- ---------- fight log ----------
create table if not exists public.arena_log (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  attacker      uuid not null references auth.users (id) on delete cascade,
  defender      uuid references auth.users (id) on delete set null,   -- null for bots
  defender_name text not null,
  attacker_name text not null,
  seed          bigint not null,
  win           boolean not null,
  att_delta     int not null,
  def_delta     int not null,
  att_team      jsonb not null,
  def_team      jsonb not null
);
create index if not exists arena_log_attacker on public.arena_log (attacker, at desc);
create index if not exists arena_log_defender on public.arena_log (defender, at desc);
alter table public.arena_log enable row level security;
drop policy if exists "own fights: select" on public.arena_log;
create policy "own fights: select" on public.arena_log for select to authenticated using (auth.uid() = attacker or auth.uid() = defender);

-- ---------- weekly rewards ----------
create table if not exists public.arena_rewards (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week    date not null,
  rating  int not null,
  claimed boolean not null default false,
  unique (user_id, week)
);
alter table public.arena_rewards enable row level security;
drop policy if exists "own rewards: select" on public.arena_rewards;
create policy "own rewards: select" on public.arena_rewards for select to authenticated using (auth.uid() = user_id);

-- ---------- functions for the Edge Function (service role only) ----------
-- takes one arena token; tokens refill one per per_min minutes up to max_tokens. Returns tokens left, or -1 when empty.
create or replace function public.arena_take_token(uid uuid, per_min int, max_tokens int)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  t int; ta timestamptz; gained int;
begin
  select tokens, tokens_at into t, ta from public.arena_players where user_id = uid for update;
  if t is null then return -1; end if;
  gained := floor(extract(epoch from (now() - ta)) / (per_min * 60));
  if t + gained >= max_tokens then t := max_tokens; ta := now();
  else t := t + gained; ta := ta + gained * per_min * interval '1 minute'; end if;
  if t < 1 then
    update public.arena_players set tokens = t, tokens_at = ta where user_id = uid;
    return -1;
  end if;
  update public.arena_players set tokens = t - 1, tokens_at = ta where user_id = uid;
  return t - 1;
end;
$$;

-- applies a fight result to both ratings in one go; returns the new ratings
create or replace function public.arena_apply(att uuid, def uuid, att_delta int, def_delta int, won boolean)
returns table (att_rating int, def_rating int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  ar int; dr int;
begin
  update public.arena_players
     set rating = greatest(0, rating + att_delta), wins = wins + won::int, losses = losses + (not won)::int,
         week_fights = week_fights + 1, updated_at = now()
   where user_id = att returning rating into ar;
  if def is not null then
    update public.arena_players
       set rating = greatest(0, rating + def_delta), def_wins = def_wins + (not won)::int, def_losses = def_losses + won::int
     where user_id = def returning rating into dr;
  end if;
  return query select ar, dr;
end;
$$;

-- end of the arena week: everyone who attacked that week gets a reward row (the game pays it out by rating tier,
-- see K.ARENA_TIERS), the weekly counters reset and fight logs older than 30 days are removed
create or replace function public.arena_week_end()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.arena_rewards (user_id, week, rating)
    select user_id, current_date, rating from public.arena_players where week_fights > 0
    on conflict (user_id, week) do nothing;
  update public.arena_players set week_fights = 0 where week_fights > 0;
  delete from public.arena_log where at < now() - interval '30 days';
end;
$$;

revoke all on function public.arena_take_token(uuid, int, int) from public, anon, authenticated;
revoke all on function public.arena_apply(uuid, uuid, int, int, boolean) from public, anon, authenticated;
revoke all on function public.arena_week_end() from public, anon, authenticated;
grant execute on function public.arena_take_token(uuid, int, int) to service_role;
grant execute on function public.arena_apply(uuid, uuid, int, int, boolean) to service_role;

-- every Monday 00:00 UTC
create extension if not exists pg_cron;
select cron.schedule('arena-week-end', '0 0 * * 1', 'select public.arena_week_end()');

-- ---------- functions for players ----------
-- hands out this player's unclaimed weekly rewards once (the game adds them to the save)
create or replace function public.claim_arena_rewards()
returns table (week date, rating int)
language sql
security definer
set search_path = ''
as $$
  update public.arena_rewards set claimed = true
   where user_id = auth.uid() and not claimed
  returning week, rating;
$$;
revoke all on function public.claim_arena_rewards() from public, anon;
grant execute on function public.claim_arena_rewards() to authenticated;

-- text to int, null when it is not a whole number (save data comes from browsers)
create or replace function public.ffh_int(v text)
returns int
language sql
immutable
set search_path = ''
as $$ select case when v ~ '^-?[0-9]{1,9}$' then v::int end $$;

-- Leaderboards: kind = 'arena' | 'campaign' | 'bosses'. Top 100 plus the caller's own row (me = true).
-- Campaign and Boss Hall come from the cloud saves, so they are only as honest as the saves; the arena
-- ranking comes from fights the server played itself.
create or replace function public.leaderboard(kind text)
returns table (rank bigint, name text, avatar text, lvl int, score int, detail jsonb, me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with rows as (
    select a.user_id, a.name, a.avatar, null::int as lvl, a.rating as score,
           jsonb_build_object('wins', a.wins, 'losses', a.losses) as detail
      from public.arena_players a
     where kind = 'arena' and a.wins + a.losses > 0
    union all
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), s.data -> 'p' ->> 'avatar',
           public.ffh_int(s.data -> 'p' ->> 'lvl'),
           coalesce(public.ffh_int(s.data ->> 'cleared'), -1) + 1
             + coalesce((select sum(public.ffh_int(e) + 1) from jsonb_array_elements_text(
                 case when jsonb_typeof(s.data -> 'dcl') = 'array' then s.data -> 'dcl' else '[]'::jsonb end) e
                 where public.ffh_int(e) is not null), 0)::int,
           jsonb_build_object('cleared', s.data -> 'cleared', 'dcl', s.data -> 'dcl')
      from public.saves s
     where kind = 'campaign'
    union all
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), s.data -> 'p' ->> 'avatar',
           public.ffh_int(s.data -> 'p' ->> 'lvl'),
           coalesce((select sum(least(10, greatest(0, coalesce(public.ffh_int(v), 0)))) from jsonb_each_text(
             case when jsonb_typeof(s.data -> 'bh') = 'object' then s.data -> 'bh' else '{}'::jsonb end) as b(k, v)), 0)::int,
           jsonb_build_object('maxed', (select count(*) from jsonb_each_text(
             case when jsonb_typeof(s.data -> 'bh') = 'object' then s.data -> 'bh' else '{}'::jsonb end) as b(k, v)
             where public.ffh_int(v) >= 10))
      from public.saves s
     where kind = 'bosses'
  ), ranked as (
    select rank() over (order by score desc) as rank, name, avatar, lvl, score, detail, user_id = auth.uid() as me
      from rows where score > 0
  )
  select * from ranked where rank <= 100 or me order by rank limit 150;
$$;
revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;
