-- Fate Forged Heroes: guild quests. Run once after 0026.
-- As RAID's clan quests: every week (Monday to Monday, UTC, the weeks of 0026's tournaments) a guild has four shared
-- goals, one bar for the whole guild, filled only from what the server itself keeps, so nobody can fake progress:
--   Boss Breakers      guild boss points (guild_boss_hits, for this guild)
--   Key Keepers        guild boss fights, one per key (guild_boss_hits, for this guild)
--   Arena Champions    arena attacks won (arena_log)
--   Stronger Together  minutes played (playtime, 0025)
-- Each goal is a number per member times the members (at least 5, so a small guild has a chance). Only current members
-- count, arena and playtime from the day they joined. When a goal is reached, every member who helped (at least `min`
-- of it) claims its reward once (gquest_claim; the game adds it with grantGift); all four reached: a bonus chest for
-- everyone who helped with two or more. A player claims each quest once a week, whichever guild they are in, so hopping
-- between guilds pays nothing more. The guild chat hears when a goal is reached. Every Monday at 00:25 UTC
-- gquest_week_end mails what was reached but not claimed.

create table if not exists public.gquest_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  week int not null,
  q text not null,                 -- a quest key, or 'all' (the bonus chest)
  guild_id bigint,
  at timestamptz not null default now(),
  primary key (user_id, week, q)
);
alter table public.gquest_claims enable row level security; -- no policies: only the functions below
create table if not exists public.gquest_done (
  guild_id bigint not null references public.guilds (id) on delete cascade,
  week int not null,
  q text not null,                 -- reached (announced in the guild chat once)
  at timestamptz not null default now(),
  primary key (guild_id, week, q)
);
alter table public.gquest_done enable row level security;
create table if not exists public.gquest_mailed (
  week int primary key,            -- a week whose unclaimed rewards were mailed
  at timestamptz not null default now()
);
alter table public.gquest_mailed enable row level security;

-- the four quests: per = the goal per member, min = what a member must add to claim it, r = the reward per member
create or replace function public.ffh_gquest_def()
returns jsonb language sql immutable set search_path = ''
as $$ select '[
  {"k": "boss", "name": "Boss Breakers", "per": 30000, "min": 1, "r": {"silver": 10000, "fs": {"greater": 2}}},
  {"k": "keys", "name": "Key Keepers", "per": 8, "min": 1, "r": {"st": {"greater": 2}, "energy": 40}},
  {"k": "arena", "name": "Arena Champions", "per": 6, "min": 1, "r": {"gems": 25, "silver": 5000}},
  {"k": "play", "name": "Stronger Together", "per": 150, "min": 15, "r": {"elx": {"Aether": 2}, "energy": 60}}
]'::jsonb $$;
create or replace function public.ffh_gquest_bonus()
returns jsonb language sql immutable set search_path = ''
as $$ select '{"fs": {"ancient": 1}}'::jsonb $$;

-- what every current member of guild gid added in week w (the weeks of 0026: ffh_tourney_start)
create or replace function public.ffh_gquest_by(gid bigint, w int)
returns table (user_id uuid, boss bigint, keys bigint, arena bigint, play bigint)
language sql stable security definer set search_path = ''
as $$
  with t as (select public.ffh_tourney_start(w) as s, public.ffh_tourney_start(w + 1) as e)
  select m.user_id,
    coalesce((select sum(h.points) from public.guild_boss_hits h where h.user_id = m.user_id and h.guild_id = gid and h.created_at >= t.s and h.created_at < t.e), 0)::bigint,
    (select count(*) from public.guild_boss_hits h where h.user_id = m.user_id and h.guild_id = gid and h.created_at >= t.s and h.created_at < t.e)::bigint,
    (select count(*) from public.arena_log l where l.attacker = m.user_id and l.win and l.at >= greatest(t.s, m.joined_at) and l.at < t.e)::bigint,
    coalesce((select sum(p.secs) / 60 from public.playtime p where p.user_id = m.user_id
      and p.day >= (greatest(t.s, m.joined_at) at time zone 'utc')::date and p.day < (t.e at time zone 'utc')::date), 0)::bigint
  from public.guild_members m, t where m.guild_id = gid
$$;

-- every quest of guild gid in week w: its goal, the guild's total and what player uid added
create or replace function public.ffh_gquest_sum(gid bigint, w int, uid uuid)
returns table (k text, name text, target bigint, total bigint, mine bigint, min bigint, r jsonb)
language sql stable security definer set search_path = ''
as $$
  with b as (select * from public.ffh_gquest_by(gid, w)),
       n as (select greatest(5, count(*))::bigint as n from public.guild_members m where m.guild_id = gid)
  select x.q ->> 'k', x.q ->> 'name', (x.q ->> 'per')::bigint * n.n,
    coalesce((select sum(case x.q ->> 'k' when 'boss' then b.boss when 'keys' then b.keys when 'arena' then b.arena else b.play end) from b), 0)::bigint,
    coalesce((select sum(case x.q ->> 'k' when 'boss' then b.boss when 'keys' then b.keys when 'arena' then b.arena else b.play end) from b where b.user_id = uid), 0)::bigint,
    (x.q ->> 'min')::bigint, x.q -> 'r'
  from jsonb_array_elements(public.ffh_gquest_def()) with ordinality as x (q, i), n
  order by x.i
$$;

-- this week's guild quests for the player: the four goals with the guild's total, my part, claimed or not, the bonus
-- chest, and every member's part. A goal reached for the first time is announced in the guild chat (once).
create or replace function public.gquest_state()
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); w int := public.ffh_tourney_week(now()); gid bigint; gname text; gtag text;
  qs jsonb; done int; helped int; r record;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select m.guild_id, g.name, g.tag into gid, gname, gtag from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = uid;
  if gid is null then return jsonb_build_object('guild', false); end if;
  -- reached for the first time: a line in the guild chat (never lets the state fail)
  for r in select s.k, s.name from public.ffh_gquest_sum(gid, w, uid) s where s.total >= s.target loop
    begin
      insert into public.gquest_done (guild_id, week, q) values (gid, w, r.k);
      insert into public.chat_messages (channel, user_id, name, tag, body, kind, data)
      values ('g:' || gid, uid, gname, gtag, format('Guild quest complete: %s! Everyone who helped can claim the reward under Guild Quests.', r.name), 'sys', jsonb_build_object('ev', 'gq', 'q', r.k));
    exception when others then null; -- unique_violation: announced already
    end;
  end loop;
  select count(*) filter (where s.total >= s.target), count(*) filter (where s.mine >= s.min),
         jsonb_agg(jsonb_build_object('k', s.k, 'name', s.name, 'target', s.target, 'total', s.total, 'mine', s.mine, 'min', s.min, 'r', s.r,
           'claimed', exists (select 1 from public.gquest_claims c where c.user_id = uid and c.week = w and c.q = s.k)) order by array_position(array['boss', 'keys', 'arena', 'play'], s.k))
    into done, helped, qs from public.ffh_gquest_sum(gid, w, uid) s;
  if done = 4 then
    begin
      insert into public.gquest_done (guild_id, week, q) values (gid, w, 'all');
      insert into public.chat_messages (channel, user_id, name, tag, body, kind, data)
      values ('g:' || gid, uid, gname, gtag, 'All four guild quests complete! A bonus chest waits for everyone who helped with two or more.', 'sys', jsonb_build_object('ev', 'gq', 'q', 'all'));
    exception when others then null;
    end;
  end if;
  return jsonb_build_object('guild', true, 'week', w, 'end', public.ffh_tourney_start(w + 1), 'quests', qs,
    'bonus', jsonb_build_object('r', public.ffh_gquest_bonus(), 'done', done = 4, 'ok', helped >= 2,
      'claimed', exists (select 1 from public.gquest_claims c where c.user_id = uid and c.week = w and c.q = 'all')),
    'by', (select coalesce(jsonb_agg(jsonb_build_object('user_id', b.user_id, 'me', b.user_id = uid,
              'name', coalesce(nullif(s.data -> 'p' ->> 'name', ''), 'Adventurer'), 'avatar', s.data -> 'p' ->> 'avatar',
              'boss', b.boss, 'keys', b.keys, 'arena', b.arena, 'play', b.play) order by b.boss + b.keys * 1000 + b.arena * 1000 + b.play * 100 desc), '[]'::jsonb)
           from public.ffh_gquest_by(gid, w) b left join public.saves s on s.user_id = b.user_id));
end $$;

-- claim quest q ('boss', 'keys', 'arena', 'play' or 'all' for the bonus chest) of this week: { rewards } when the
-- guild reached it, I helped enough and I did not claim it this week yet (in any guild), else {}
create or replace function public.gquest_claim(q text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); w int := public.ffh_tourney_week(now()); gid bigint; ok boolean; rw jsonb; n int;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select m.guild_id into gid from public.guild_members m where m.user_id = uid;
  if gid is null then return '{}'::jsonb; end if;
  if q = 'all' then
    select count(*) filter (where s.total >= s.target) = 4 and count(*) filter (where s.mine >= s.min) >= 2 into ok from public.ffh_gquest_sum(gid, w, uid) s;
    rw := public.ffh_gquest_bonus();
  else
    select s.total >= s.target and s.mine >= s.min, s.r into ok, rw from public.ffh_gquest_sum(gid, w, uid) s where s.k = q;
  end if;
  if not coalesce(ok, false) then return '{}'::jsonb; end if;
  insert into public.gquest_claims (user_id, week, q, guild_id) values (uid, w, q, gid) on conflict do nothing;
  get diagnostics n = row_count;
  return case when n = 1 then jsonb_build_object('rewards', rw) else '{}'::jsonb end;
end $$;

-- Monday: last week's goals reached but not claimed, by mail to every member who helped (once per week)
create or replace function public.gquest_week_end()
returns void language plpgsql security definer set search_path = ''
as $$
declare w int := public.ffh_tourney_week(now()) - 1; m record; s record; done int; helped int;
begin
  if exists (select 1 from public.gquest_mailed x where x.week = w) then return; end if;
  for m in select gm.user_id, gm.guild_id from public.guild_members gm loop
    done := 0; helped := 0;
    for s in select * from public.ffh_gquest_sum(m.guild_id, w, m.user_id) loop
      if s.total >= s.target then done := done + 1; end if;
      if s.mine >= s.min then helped := helped + 1; end if;
      if s.total >= s.target and s.mine >= s.min and not exists (select 1 from public.gquest_claims c where c.user_id = m.user_id and c.week = w and c.q = s.k) then
        insert into public.gquest_claims (user_id, week, q, guild_id) values (m.user_id, w, s.k, m.guild_id) on conflict do nothing;
        insert into public.mail (user_id, title, body, rewards)
        values (m.user_id, 'Guild quest: ' || s.name, 'Your guild completed this quest last week and you helped. You had not claimed the reward yet, so here it is.', s.r);
      end if;
    end loop;
    if done = 4 and helped >= 2 and not exists (select 1 from public.gquest_claims c where c.user_id = m.user_id and c.week = w and c.q = 'all') then
      insert into public.gquest_claims (user_id, week, q, guild_id) values (m.user_id, w, 'all', m.guild_id) on conflict do nothing;
      insert into public.mail (user_id, title, body, rewards)
      values (m.user_id, 'Guild quests: bonus chest', 'Your guild completed all four quests last week. Your bonus chest for helping.', public.ffh_gquest_bonus());
    end if;
  end loop;
  insert into public.gquest_mailed (week) values (w);
end $$;

revoke all on function public.ffh_gquest_by(bigint, int) from public, anon, authenticated;
revoke all on function public.ffh_gquest_sum(bigint, int, uuid) from public, anon, authenticated;
revoke all on function public.gquest_week_end() from public, anon, authenticated;
revoke all on function public.gquest_state() from public, anon;
revoke all on function public.gquest_claim(text) from public, anon;
grant execute on function public.gquest_state() to authenticated;
grant execute on function public.gquest_claim(text) to authenticated;

select cron.schedule('gquest-week-end', '25 0 * * 1', $$select public.gquest_week_end()$$);
