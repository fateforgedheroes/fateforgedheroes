-- Fate Forged Heroes: global leaderboards (Town Hall → Leaderboards). Run once after 0009.
-- Redefines leaderboard(kind) from 0003 with more kinds:
--   'arena' | 'campaign' | 'bosses'   as before (arena rating, campaign stages over every difficulty, Boss Hall levels in total)
--   'boss:<id>'                       the highest level beaten on one Boss Hall boss (save: bh.<id>, 0-10)
--   'tower'                           floors of every Tower of Essence together (save: tw.prog.<tower>, 0-300 each),
--                                     detail.best = the highest single tower
--   'tower:<tower>'                   floors of one tower (Ember, Verdant, Storm, Frost, Radiant, Umbral or All)
-- Top 100 plus the caller's own row (me = true). Everything but the arena comes from the cloud saves, so it is only as
-- honest as the saves; no rewards hang on these lists.
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
  ), ranked as (
    select rank() over (order by score desc) as rank, name, avatar, lvl, score, detail, user_id = auth.uid() as me
      from board where score > 0
  )
  select * from ranked where rank <= 100 or me order by rank limit 150;
$$;
revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;
