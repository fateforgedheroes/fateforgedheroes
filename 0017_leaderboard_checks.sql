-- Fate Forged Heroes: honest leaderboards. Run once after 0016.
-- The campaign, Boss Hall, Tower and Siege boards read the saves, which a player can edit. This leaves out saves
-- that cannot be real, and lets the owner hide or clear accounts by hand (from the game's Admin screen):
--  * every stage, Boss Hall level and Tower floor first needs a win, so a save with more of them than battles won
--    (p.st.won, with a margin of 20 for old saves) is left out;
--  * every Siege wave below the best needs at least one kill, so a best wave above the kills is left out.
-- lb_review: 'hidden' leaves an account out of every board (the arena too), 'allowed' keeps it in whatever the
-- checks say (a false alarm). Only admin RPCs and the SQL Editor change it.

create table if not exists public.lb_review (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state text not null check (state in ('hidden', 'allowed')),
  note text,
  at timestamptz not null default now()
);
alter table public.lb_review enable row level security; -- no policies: only the functions below read or write it

-- why a save cannot be real, or null when it can
create or replace function public.ffh_lb_flag(d jsonb)
returns text
language sql
stable
set search_path = ''
as $$
  with v as (
    select public.ffh_int(d -> 'p' -> 'st' ->> 'won') as won,
      least(70, greatest(0, coalesce(public.ffh_int(d ->> 'cleared'), -1) + 1))
      + coalesce((select sum(least(70, greatest(0, public.ffh_int(e) + 1))) from jsonb_array_elements_text(
          case when jsonb_typeof(d -> 'dcl') = 'array' then d -> 'dcl' else '[]'::jsonb end) e where public.ffh_int(e) is not null), 0)
      + coalesce((select sum(least(10, greatest(0, coalesce(public.ffh_int(x), 0)))) from jsonb_each_text(
          case when jsonb_typeof(d -> 'bh') = 'object' then d -> 'bh' else '{}'::jsonb end) as b(k, x)), 0)
      + coalesce((select sum(least(300, greatest(0, coalesce(public.ffh_int(x), 0)))) from jsonb_each_text(
          case when jsonb_typeof(d -> 'tw' -> 'prog') = 'object' then d -> 'tw' -> 'prog' else '{}'::jsonb end) as t(k, x)), 0) as progress,
      coalesce(public.ffh_int(d -> 'sg' ->> 'best'), 0) as wave, coalesce(public.ffh_int(d -> 'sg' ->> 'kills'), 0) as kills
  )
  select case
    when won is not null and progress > won + 20 then format('%s stages, levels and floors cleared, only %s battles won', progress, won)
    when wave > 0 and kills < wave then format('Siege wave %s with only %s kills', wave, kills)
  end from v;
$$;

-- is this account on the boards? (hidden by hand: never; allowed by hand: always; else the checks decide; the
-- arena's ratings come from the server, so only a hand-hidden account leaves the arena board)
create or replace function public.ffh_lb_ok(uid uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (select r.state from public.lb_review r where r.user_id = uid)
    when 'hidden' then false
    when 'allowed' then true
    else kind = 'arena' or coalesce((select public.ffh_lb_flag(s.data) is null from public.saves s where s.user_id = uid), true)
  end;
$$;
revoke all on function public.ffh_lb_ok(uuid, text) from public, anon, authenticated;

create or replace function public.leaderboard(kind text)
returns table (rank bigint, name text, avatar text, lvl int, score int, detail jsonb, me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with board as (
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
    union all
    -- one boss: the highest level beaten on it
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), s.data -> 'p' ->> 'avatar',
           public.ffh_int(s.data -> 'p' ->> 'lvl'),
           least(10, greatest(0, coalesce(public.ffh_int(s.data -> 'bh' ->> substr(kind, 6)), 0))),
           null::jsonb
      from public.saves s
     where kind like 'boss:%' and jsonb_typeof(s.data -> 'bh') = 'object'
    union all
    -- every tower together, with the best single tower
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), s.data -> 'p' ->> 'avatar',
           public.ffh_int(s.data -> 'p' ->> 'lvl'),
           coalesce((select sum(least(300, greatest(0, coalesce(public.ffh_int(v), 0)))) from jsonb_each_text(
             case when jsonb_typeof(s.data -> 'tw' -> 'prog') = 'object' then s.data -> 'tw' -> 'prog' else '{}'::jsonb end) as t(k, v)), 0)::int,
           jsonb_build_object('best', (select max(least(300, greatest(0, coalesce(public.ffh_int(v), 0)))) from jsonb_each_text(
             case when jsonb_typeof(s.data -> 'tw' -> 'prog') = 'object' then s.data -> 'tw' -> 'prog' else '{}'::jsonb end) as t(k, v)))
      from public.saves s
     where kind = 'tower'
    union all
    -- one tower
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), s.data -> 'p' ->> 'avatar',
           public.ffh_int(s.data -> 'p' ->> 'lvl'),
           least(300, greatest(0, coalesce(public.ffh_int(s.data -> 'tw' -> 'prog' ->> substr(kind, 7)), 0))),
           null::jsonb
      from public.saves s
     where kind like 'tower:%' and jsonb_typeof(s.data -> 'tw' -> 'prog') = 'object'
    union all
    -- the Siege: the best wave held
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), s.data -> 'p' ->> 'avatar',
           public.ffh_int(s.data -> 'p' ->> 'lvl'),
           least(500, greatest(0, coalesce(public.ffh_int(s.data -> 'sg' ->> 'best'), 0))),
           jsonb_build_object('kills', coalesce(public.ffh_int(s.data -> 'sg' ->> 'kills'), 0))
      from public.saves s
     where kind = 'siege' and jsonb_typeof(s.data -> 'sg') = 'object'
  ), ranked as (
    select rank() over (order by score desc) as rank, name, avatar, lvl, score, detail, user_id = auth.uid() as me
      from board where score > 0 and lower(trim(coalesce(name, 'Adventurer'))) <> 'adventurer' and public.ffh_lb_ok(user_id, kind)
  )
  select * from ranked where rank <= 100 or me order by rank limit 150;
$$;
revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;

-- the owner's list (Admin screen): every account the checks flag, and every account reviewed by hand
create or replace function public.admin_lb_list()
returns table (user_id uuid, name text, lvl int, reason text, state text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  return query
    select s.user_id, left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), public.ffh_int(s.data -> 'p' ->> 'lvl'),
           public.ffh_lb_flag(s.data), r.state
      from public.saves s left join public.lb_review r on r.user_id = s.user_id
     where public.ffh_lb_flag(s.data) is not null or r.state is not null
     order by r.state nulls first, s.updated_at desc
     limit 100;
end;
$$;

-- hide an account, allow it (a false alarm), or clear the decision (state null)
create or replace function public.admin_lb_set(uid uuid, state text, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  if state is null then delete from public.lb_review r where r.user_id = uid; return; end if;
  if state not in ('hidden', 'allowed') then raise exception 'bad state'; end if;
  insert into public.lb_review (user_id, state, note) values (uid, admin_lb_set.state, left(note, 200))
  on conflict (user_id) do update set state = excluded.state, note = excluded.note, at = now();
end;
$$;

revoke all on function public.admin_lb_list() from public, anon;
revoke all on function public.admin_lb_set(uuid, text, text) from public, anon;
grant execute on function public.admin_lb_list() to authenticated;
grant execute on function public.admin_lb_set(uuid, text, text) to authenticated;
