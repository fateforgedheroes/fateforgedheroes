-- Fate Forged Heroes: weekly tournaments. Run once after 0025.
-- As RAID's tournaments: every week (Monday to Monday, UTC) one tournament runs, scored only from fights the server
-- itself decided, so nobody can fake points: the Arena Tournament in weeks 1 and 3 of the game's four-week event
-- cycle (10 points per arena attack won, 2 per attack lost; arena_log) and the Guild Boss Tournament in weeks 0 and 2
-- (the guild boss points of every fight: damage x difficulty; guild_boss_hits). The week number is the game's event
-- calendar (app.js evWeek): week 1 starts on Monday 5 January 1970.
-- Five milestones per tournament are claimed with tourney_claim (the game adds the reward with grantGift, as with
-- mail); the top 10 earn rank rewards. Every Monday at 00:20 UTC tourney_week_end mails last week's rank rewards and
-- every milestone reached but not claimed. The ranking leaves out flagged or hidden accounts and players still called
-- "Adventurer", as the leaderboards do (ffh_lb_ok, 0017).

create table if not exists public.tourney_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  week int not null,
  step int not null,               -- the milestone (0-4)
  at timestamptz not null default now(),
  primary key (user_id, week, step)
);
alter table public.tourney_claims enable row level security; -- no policies: only the functions below
create table if not exists public.tourney_done (
  week int primary key,            -- a week whose rewards were mailed
  kind text not null,
  at timestamptz not null default now()
);
alter table public.tourney_done enable row level security;

create or replace function public.ffh_tourney_week(t timestamptz)
returns int language sql immutable set search_path = ''
as $$ select floor((((t at time zone 'utc')::date - date '1970-01-01') + 3) / 7.0)::int $$;
create or replace function public.ffh_tourney_start(w int)
returns timestamptz language sql immutable set search_path = ''
as $$ select ((date '1970-01-05' + (w - 1) * 7)::timestamp at time zone 'utc') $$;
create or replace function public.ffh_tourney_kind(w int)
returns text language sql immutable set search_path = ''
as $$ select case when ((w % 4) + 4) % 4 in (1, 3) then 'arena' else 'guild' end $$;

-- the milestones (points, reward) and the rank rewards (up to rank, reward) of a kind
create or replace function public.ffh_tourney_def(kind text)
returns jsonb language sql immutable set search_path = ''
as $$ select jsonb_build_object(
  'steps', case kind when 'arena' then '[
      {"p": 30, "r": {"silver": 5000}}, {"p": 80, "r": {"fs": {"greater": 2}}}, {"p": 150, "r": {"gems": 30}},
      {"p": 250, "r": {"fs": {"ancient": 1}}}, {"p": 400, "r": {"fs": {"ancient": 2}, "st": {"greater": 2}}}]'::jsonb
    else '[
      {"p": 25000, "r": {"silver": 5000}}, {"p": 100000, "r": {"fs": {"greater": 2}}}, {"p": 300000, "r": {"gems": 30}},
      {"p": 800000, "r": {"fs": {"ancient": 1}}}, {"p": 2000000, "r": {"fs": {"ancient": 2}, "st": {"greater": 2}}}]'::jsonb end,
  'ranks', '[
      {"to": 1, "r": {"fs": {"mythic": 1}, "gems": 100}}, {"to": 3, "r": {"fs": {"ancient": 2}, "gems": 50}},
      {"to": 10, "r": {"fs": {"ancient": 1}, "gems": 25}}]'::jsonb) $$;

-- every player's points in week w (only fights the server decided)
create or replace function public.ffh_tourney_points_all(w int)
returns table (user_id uuid, points bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare s timestamptz := public.ffh_tourney_start(w); e timestamptz := public.ffh_tourney_start(w + 1);
begin
  if public.ffh_tourney_kind(w) = 'arena' then
    return query select l.attacker, sum(case when l.win then 10 else 2 end)::bigint from public.arena_log l where l.at >= s and l.at < e group by l.attacker;
  else
    return query select h.user_id, sum(h.points)::bigint from public.guild_boss_hits h where h.created_at >= s and h.created_at < e group by h.user_id;
  end if;
end $$;

-- the ranking of week w: named players the leaderboards accept, by points
create or replace function public.ffh_tourney_board(w int)
returns table (user_id uuid, points bigint, rank int, name text, avatar text)
language sql stable security definer set search_path = ''
as $$
  select p.user_id, p.points, (rank() over (order by p.points desc))::int, s.data -> 'p' ->> 'name', s.data -> 'p' ->> 'avatar'
  from public.ffh_tourney_points_all(w) p join public.saves s on s.user_id = p.user_id
  where p.points > 0 and coalesce(s.data -> 'p' ->> 'name', '') !~* '^\s*adventurer\s*$' and coalesce(s.data -> 'p' ->> 'name', '') <> ''
    and public.ffh_lb_ok(p.user_id, case public.ffh_tourney_kind(w) when 'arena' then 'arena' else 'guild' end)
$$;

-- this week's tournament for the player: kind, start and end, points, milestones claimed, the rules, the top 20, my rank
create or replace function public.tourney_state()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); w int := public.ffh_tourney_week(now()); k text := public.ffh_tourney_kind(w); s timestamptz := public.ffh_tourney_start(w);
begin
  if uid is null then raise exception 'sign in first'; end if;
  return jsonb_build_object(
    'week', w, 'kind', k, 'start', s, 'end', public.ffh_tourney_start(w + 1),
    'points', coalesce((select p.points from public.ffh_tourney_points_all(w) p where p.user_id = uid), 0),
    'claimed', (select coalesce(jsonb_agg(c.step order by c.step), '[]'::jsonb) from public.tourney_claims c where c.user_id = uid and c.week = w),
    'def', public.ffh_tourney_def(k),
    'board', (select coalesce(jsonb_agg(jsonb_build_object('rank', b.rank, 'name', b.name, 'avatar', b.avatar, 'points', b.points, 'me', b.user_id = uid) order by b.rank, b.name), '[]'::jsonb)
              from (select * from public.ffh_tourney_board(w) order by rank limit 20) b),
    'me', (select jsonb_build_object('rank', b.rank, 'points', b.points) from public.ffh_tourney_board(w) b where b.user_id = uid));
end $$;

-- claim milestone i of this week's tournament: { rewards } when the points reach it and it was not claimed, else {}
create or replace function public.tourney_claim(i int)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); w int := public.ffh_tourney_week(now()); st jsonb := public.ffh_tourney_def(public.ffh_tourney_kind(w)) -> 'steps' -> i; n int;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if st is null or coalesce((select p.points from public.ffh_tourney_points_all(w) p where p.user_id = uid), 0) < (st ->> 'p')::bigint then return '{}'::jsonb; end if;
  insert into public.tourney_claims (user_id, week, step) values (uid, w, i) on conflict do nothing;
  get diagnostics n = row_count;
  return case when n = 1 then jsonb_build_object('rewards', st -> 'r') else '{}'::jsonb end;
end $$;

-- Monday: last week's rank rewards and every milestone reached but not claimed, by mail (once per week)
create or replace function public.tourney_week_end()
returns void language plpgsql security definer set search_path = ''
as $$
declare w int := public.ffh_tourney_week(now()) - 1; k text := public.ffh_tourney_kind(w); d jsonb := public.ffh_tourney_def(k);
  nm text := case k when 'arena' then 'Arena Tournament' else 'Guild Boss Tournament' end;
begin
  if exists (select 1 from public.tourney_done t where t.week = w) then return; end if;
  insert into public.mail (user_id, title, body, rewards)
  select b.user_id, nm || ': rank ' || b.rank,
         'You finished #' || b.rank || ' in last week''s ' || nm || ' with ' || to_char(b.points, 'FM999,999,999,999') || ' points. Well fought!',
         (select x -> 'r' from jsonb_array_elements(d -> 'ranks') x where (x ->> 'to')::int >= b.rank order by (x ->> 'to')::int limit 1)
  from public.ffh_tourney_board(w) b where b.rank <= 10;
  insert into public.mail (user_id, title, body, rewards)
  select p.user_id, nm || ': ' || to_char((st.x ->> 'p')::bigint, 'FM999,999,999') || ' points',
         'A milestone you reached in last week''s ' || nm || ' but did not claim.', st.x -> 'r'
  from public.ffh_tourney_points_all(w) p cross join lateral jsonb_array_elements(d -> 'steps') with ordinality st (x, i)
  where p.points >= (st.x ->> 'p')::bigint
    and not exists (select 1 from public.tourney_claims c where c.user_id = p.user_id and c.week = w and c.step = st.i - 1);
  insert into public.tourney_done (week, kind) values (w, k);
end $$;

revoke all on function public.ffh_tourney_points_all(int) from public, anon, authenticated;
revoke all on function public.ffh_tourney_board(int) from public, anon, authenticated;
revoke all on function public.tourney_week_end() from public, anon, authenticated;
revoke all on function public.tourney_state() from public, anon;
revoke all on function public.tourney_claim(int) from public, anon;
grant execute on function public.tourney_state() to authenticated;
grant execute on function public.tourney_claim(int) to authenticated;

select cron.schedule('tourney-week-end', '20 0 * * 1', $$select public.tourney_week_end()$$);
