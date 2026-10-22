-- Fate Forged Heroes: weekly leaderboard prizes. Run once after 0029.
-- Every week (Monday to Monday, UTC, the weeks of 0026) the top 3 of each leaderboard win a prize by mail, #1 a royal
-- one: Campaign, Boss Hall, Tower of Essence and Siege rank the progress made THAT week (so every player can win, not
-- only the furthest), Arena ranks the players who fought that week by rating (as arena_week_end does), Guilds the guild
-- boss points of that week (every member who fought for a top 3 guild wins its guild prize).
-- Weekly progress counts in points, the harder the more: a campaign stage counts 1 on Easy up to 5 on Nightmare, a Boss
-- Hall level 1 (levels 1-2) up to 5 (levels 9-10), a Tower floor 1 more for every 50 floors (1 up to 7), a Siege wave 1
-- more for every 100 waves (1 up to 6); so a veteran clearing a few Nightmare stages competes with a new player racing
-- through Easy (ffh_lb_points: the weighted total a save holds; the week's progress is that total minus the one at the
-- start of the week, lb_week_start, written every Monday and when this file runs; a save new this week starts at 0).
-- The scores come from the saves, so the save guard's rules hold: flagged or hidden accounts and players still called
-- "Adventurer" never win (ffh_lb_ok, 0017/0018). Ties: the more advanced player first.
-- Monday 00:35 UTC lb_prizes_week_end mails last week's prizes (once per week, lb_prize_done), keeps the winners for
-- the crowns on the boards (lb_prize_winners) and starts the new week. lb_week(kind) is the "This week" board,
-- lb_prize_info() the prizes, the time left and last week's winners.

create table if not exists public.lb_week_start (
  week int not null,
  kind text not null,              -- campaign, bosses, tower, siege
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null,              -- the weighted total at the start of the week
  primary key (week, kind, user_id)
);
alter table public.lb_week_start enable row level security; -- no policies: only the functions below
create table if not exists public.lb_prize_winners (
  week int not null,
  kind text not null,              -- campaign, bosses, tower, siege, arena, guilds
  place int not null,
  user_id uuid references auth.users (id) on delete cascade,
  guild_id bigint,                 -- guilds: the guild (one row per member who won)
  name text,                       -- the player's or the guild's name, for the crowns
  score bigint not null,
  at timestamptz not null default now()
);
create index if not exists lb_prize_winners_w on public.lb_prize_winners (week);
alter table public.lb_prize_winners enable row level security;
create table if not exists public.lb_prize_done (
  week int primary key,
  at timestamptz not null default now()
);
alter table public.lb_prize_done enable row level security;

-- the prizes: for a player's place (1-3) on any leaderboard, and for every member of a top 3 guild
create or replace function public.ffh_lb_prizes()
returns jsonb language sql immutable set search_path = ''
as $$ select '{
  "player": [{"fs": {"legendary": 1}, "gems": 150, "silver": 50000}, {"fs": {"mythic": 1}, "gems": 75, "silver": 25000}, {"fs": {"ancient": 2}, "gems": 40, "silver": 15000}],
  "guild": [{"fs": {"ancient": 1}, "gems": 50, "silver": 20000}, {"fs": {"ancient": 1}, "gems": 30, "silver": 10000}, {"fs": {"greater": 2}, "gems": 20, "silver": 5000}]
}'::jsonb $$;

-- a save's weighted progress for a leaderboard kind (see the top of the file)
create or replace function public.ffh_lb_points(d jsonb, kind text)
returns int language sql immutable set search_path = ''
as $$
  select case kind
    when 'campaign' then
      greatest(0, coalesce(public.ffh_int(d ->> 'cleared'), -1) + 1)
      + coalesce((select sum(greatest(0, public.ffh_int(e.v) + 1) * (e.i::int))   -- dcl[d] at position d (Normal = 1 counts ×2)
                    from jsonb_array_elements_text(case when jsonb_typeof(d -> 'dcl') = 'array' then d -> 'dcl' else '[]'::jsonb end) with ordinality as e (v, i)
                   where e.i > 1 and public.ffh_int(e.v) is not null), 0)::int
    when 'bosses' then
      coalesce((select sum(l.w) from jsonb_each_text(case when jsonb_typeof(d -> 'bh') = 'object' then d -> 'bh' else '{}'::jsonb end) as b (k, v),
                 lateral (select sum((n - 1) / 2 + 1) as w from generate_series(1, least(10, greatest(0, coalesce(public.ffh_int(b.v), 0)))) n) l), 0)::int
    when 'tower' then
      coalesce((select sum(f + (select sum(greatest(0, f - 50 * k + 1)) from generate_series(1, 6) k))
                  from (select least(300, greatest(0, coalesce(public.ffh_int(t.v), 0))) as f
                          from jsonb_each_text(case when jsonb_typeof(d -> 'tw' -> 'prog') = 'object' then d -> 'tw' -> 'prog' else '{}'::jsonb end) as t (k, v)) x), 0)::int
    when 'siege' then
      (select w + (select sum(greatest(0, w - 100 * k + 1)) from generate_series(1, 5) k)
         from (select least(500, greatest(0, coalesce(public.ffh_int(d -> 'sg' ->> 'best'), 0))) as w) x)::int
    else 0 end
$$;

-- the start of week w: every save's weighted totals (kept when they are there already)
create or replace function public.ffh_lb_snapshot(w int)
returns void language sql security definer set search_path = ''
as $$
  insert into public.lb_week_start (week, kind, user_id, score)
  select w, k.kind, s.user_id, public.ffh_lb_points(s.data, k.kind)
    from public.saves s cross join (values ('campaign'), ('bosses'), ('tower'), ('siege')) as k (kind)
  on conflict do nothing
$$;

-- week w's progress board for a kind: every named player the leaderboards accept, by points gained, then by total
create or replace function public.ffh_lb_week_board(w int, kind text)
returns table (user_id uuid, name text, avatar text, lvl int, gain int, total int, rank int)
language sql stable security definer set search_path = ''
as $$
  select x.user_id, x.name, x.avatar, x.lvl, x.gain, x.total, (row_number() over (order by x.gain desc, x.total desc, x.user_id))::int
    from (select s.user_id, left(s.data -> 'p' ->> 'name', 20) as name, s.data -> 'p' ->> 'avatar' as avatar, public.ffh_int(s.data -> 'p' ->> 'lvl') as lvl,
                 public.ffh_lb_points(s.data, kind) as total,
                 public.ffh_lb_points(s.data, kind) - coalesce((select b.score from public.lb_week_start b where b.week = w and b.kind = ffh_lb_week_board.kind and b.user_id = s.user_id), 0) as gain
            from public.saves s) x
   where x.gain > 0 and lower(trim(coalesce(x.name, 'Adventurer'))) not in ('adventurer', '') and public.ffh_lb_ok(x.user_id, kind)
$$;

-- the "This week" board of a kind (campaign, bosses, tower, siege): the top 100 and my own place
create or replace function public.lb_week(kind text)
returns table (rank int, name text, avatar text, lvl int, gain int, total int, me boolean)
language sql stable security definer set search_path = ''
as $$
  select b.rank, b.name, b.avatar, b.lvl, b.gain, b.total, b.user_id = auth.uid()
    from public.ffh_lb_week_board(public.ffh_tourney_week(now()), kind) b
   where kind in ('campaign', 'bosses', 'tower', 'siege') and (b.rank <= 100 or b.user_id = auth.uid())
   order by b.rank limit 101
$$;

-- the prizes, when the week ends, and last week's winners (for the crowns on the boards)
create or replace function public.lb_prize_info()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('prizes', public.ffh_lb_prizes(), 'end', public.ffh_tourney_start(public.ffh_tourney_week(now()) + 1),
    'winners', (select coalesce(jsonb_agg(distinct jsonb_build_object('kind', x.kind, 'place', x.place, 'name', x.name)), '[]'::jsonb)
                  from public.lb_prize_winners x where x.week = public.ffh_tourney_week(now()) - 1))
$$;

-- Monday: last week's prizes by mail (once per week), the winners kept, then the new week's start
create or replace function public.lb_prizes_week_end()
returns void language plpgsql security definer set search_path = ''
as $$
declare w int := public.ffh_tourney_week(now()); lw int := w - 1; pz jsonb := public.ffh_lb_prizes(); k text; r record;
  nm jsonb := '{"campaign": "Campaign", "bosses": "Boss Hall", "tower": "Tower of Essence", "siege": "Siege", "arena": "Arena", "guilds": "Guilds"}'::jsonb;
begin
  if exists (select 1 from public.lb_prize_done d where d.week = lw) then return; end if;
  -- progress boards: the top 3 of last week (current totals against the start of last week)
  foreach k in array array['campaign', 'bosses', 'tower', 'siege'] loop
    for r in select * from public.ffh_lb_week_board(lw, k) b where b.rank <= 3 loop
      insert into public.lb_prize_winners (week, kind, place, user_id, name, score) values (lw, k, r.rank, r.user_id, r.name, r.gain);
      insert into public.mail (user_id, title, body, rewards)
      values (r.user_id, format('Leaderboard prize: %s #%s', nm ->> k, r.rank),
              format('You finished #%s on last week''s %s leaderboard with %s points of progress. Well played!', r.rank, nm ->> k, r.gain), pz -> 'player' -> (r.rank - 1));
    end loop;
  end loop;
  -- the arena: the players who fought last week, by rating (arena_week_end ranked them at Monday 00:00 in arena_rewards)
  for r in select x.user_id, x.rating, (row_number() over (order by x.rank))::int as place, left(s.data -> 'p' ->> 'name', 20) as name
             from public.arena_rewards x join public.saves s on s.user_id = x.user_id
            where x.week = (public.ffh_tourney_start(w) at time zone 'utc')::date
              and lower(trim(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'))) not in ('adventurer', '') and public.ffh_lb_ok(x.user_id, 'arena')
            order by x.rank limit 3 loop
    insert into public.lb_prize_winners (week, kind, place, user_id, name, score) values (lw, 'arena', r.place, r.user_id, r.name, r.rating);
    insert into public.mail (user_id, title, body, rewards)
    values (r.user_id, format('Leaderboard prize: Arena #%s', r.place), format('You finished #%s on last week''s Arena leaderboard with a rating of %s. Well played!', r.place, r.rating), pz -> 'player' -> (r.place - 1));
  end loop;
  -- guilds: the top 3 by last week's guild boss points; every member who fought for that guild that week
  for r in with g as (
             select h.guild_id, sum(h.points) as pts, (row_number() over (order by sum(h.points) desc, h.guild_id))::int as place
               from public.guild_boss_hits h where h.guild_id is not null and h.week = (public.ffh_tourney_start(lw) at time zone 'utc')::date
              group by h.guild_id)
           select g.guild_id, g.pts, g.place, gu.name as gname, m.user_id
             from g join public.guilds gu on gu.id = g.guild_id
             join lateral (select distinct h.user_id from public.guild_boss_hits h where h.guild_id = g.guild_id and h.week = (public.ffh_tourney_start(lw) at time zone 'utc')::date) m on true
            where g.place <= 3 and public.ffh_lb_ok(m.user_id, 'guilds') loop
    insert into public.lb_prize_winners (week, kind, place, user_id, guild_id, name, score) values (lw, 'guilds', r.place, r.user_id, r.guild_id, r.gname, r.pts);
    insert into public.mail (user_id, title, body, rewards)
    values (r.user_id, format('Guild leaderboard prize: #%s', r.place),
            format('Your guild %s finished #%s on last week''s guild leaderboard with %s guild boss points, and you fought for it. Well played!', r.gname, r.place, to_char(r.pts, 'FM999,999,999,999')), pz -> 'guild' -> (r.place - 1));
  end loop;
  insert into public.lb_prize_done (week) values (lw);
  perform public.ffh_lb_snapshot(w);
  delete from public.lb_week_start where week < w - 1;
end $$;

-- this week counts from now on (a save new this week starts at 0)
select public.ffh_lb_snapshot(public.ffh_tourney_week(now()));

revoke all on function public.ffh_lb_snapshot(int) from public, anon, authenticated;
revoke all on function public.ffh_lb_week_board(int, text) from public, anon, authenticated;
revoke all on function public.lb_prizes_week_end() from public, anon, authenticated;
revoke all on function public.lb_week(text) from public, anon;
revoke all on function public.lb_prize_info() from public, anon;
grant execute on function public.lb_week(text) to authenticated;
grant execute on function public.lb_prize_info() to authenticated;

select cron.schedule('lb-prizes-week-end', '35 0 * * 1', $$select public.lb_prizes_week_end()$$);
