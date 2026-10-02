-- Fate Forged Heroes: guilds, the guild boss and the weekly Guild Chest
-- Run this once in Supabase → SQL Editor, after 0001-0005.
--
-- A guild has a name and a tag (both unique), info the guildmaster writes (max 250 characters) and at most 25 members.
-- Roles: leader (guildmaster), officer, member. Joining or creating needs Chapter II cleared on Easy (read from the save).
-- Guild boss fights are played by the Edge Function `arena` (action 'gboss'), which writes guild_boss_hits; browsers
-- cannot write any of these tables directly. Every Monday 00:05 UTC guild_week_end() sends each player who hit the
-- boss last week a Guild Chest by mail (tier by that week's points, see GCHEST in engine.js).

create table if not exists public.guilds (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 3 and 20),
  tag        text not null check (char_length(tag) between 2 and 4),
  info       text not null default '' check (char_length(info) <= 250),
  leader     uuid references auth.users (id) on delete set null,
  open       boolean not null default true,   -- false: nobody can join
  created_at timestamptz not null default now()
);
create unique index if not exists guilds_name_u on public.guilds (lower(name));
create unique index if not exists guilds_tag_u on public.guilds (lower(tag));

create table if not exists public.guild_members (
  user_id    uuid primary key references auth.users (id) on delete cascade,   -- one guild per player
  guild_id   bigint not null references public.guilds (id) on delete cascade,
  role       text not null default 'member' check (role in ('leader', 'officer', 'member')),
  joined_at  timestamptz not null default now()
);
create index if not exists guild_members_g on public.guild_members (guild_id);

-- one row per guild boss fight; day and week in UTC (week = its Monday)
create table if not exists public.guild_boss_hits (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  guild_id   bigint references public.guilds (id) on delete set null,
  day        date not null default (now() at time zone 'utc')::date,
  week       date not null default date_trunc('week', now() at time zone 'utc')::date,
  d          int not null,
  ess        text not null,
  seed       bigint not null,
  dmg        bigint not null,
  points     bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists gbh_user_day on public.guild_boss_hits (user_id, day);
create index if not exists gbh_week on public.guild_boss_hits (week, user_id);

alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.guild_boss_hits enable row level security;
-- no policies: only the functions below (and the Edge Function with the service role) touch them

-- Chapter II cleared on Easy (stage index 13), read from the player's cloud save
create or replace function public.guild_ok(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((select public.ffh_int(s.data ->> 'cleared') from public.saves s where s.user_id = uid), -1) >= 13 $$;

-- the signed-in player's guild with members, their roles and this week's guild boss points, plus keys left today.
-- null when not in a guild.
create or replace function public.guild_mine()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select m.guild_id, m.role from public.guild_members m where m.user_id = auth.uid()),
       wk as (select date_trunc('week', now() at time zone 'utc')::date as w, (now() at time zone 'utc')::date as d)
  select jsonb_build_object(
    'id', g.id, 'name', g.name, 'tag', g.tag, 'info', g.info, 'open', g.open, 'created_at', g.created_at, 'role', me.role,
    'keys_used', (select count(*) from public.guild_boss_hits h, wk where h.user_id = auth.uid() and h.day = wk.d),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'me', m.user_id = auth.uid(), 'role', m.role, 'joined_at', m.joined_at,
        'name', left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), 'avatar', coalesce(s.data -> 'p' ->> 'avatar', s.data ->> 'starter', s.data -> 'team' ->> 0),
        'lvl', public.ffh_int(s.data -> 'p' ->> 'lvl'), 'cleared', public.ffh_int(s.data ->> 'cleared'),
        'points', (select coalesce(sum(h.points), 0) from public.guild_boss_hits h, wk where h.user_id = m.user_id and h.week = wk.w),
        'hits', (select count(*) from public.guild_boss_hits h, wk where h.user_id = m.user_id and h.week = wk.w)
      ) order by m.role = 'leader' desc, m.role = 'officer' desc, m.joined_at), '[]'::jsonb)
      from public.guild_members m left join public.saves s on s.user_id = m.user_id where m.guild_id = g.id))
  from me join public.guilds g on g.id = me.guild_id;
$$;

-- guilds to join (search by name or tag), biggest first
create or replace function public.guild_list(q text)
returns table (id bigint, name text, tag text, info text, open boolean, members int, leader_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.tag, g.info, g.open, (select count(*)::int from public.guild_members m where m.guild_id = g.id),
         left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20)
    from public.guilds g left join public.saves s on s.user_id = g.leader
   where coalesce(q, '') = '' or g.name ilike '%' || q || '%' or g.tag ilike '%' || q || '%'
   order by 6 desc, g.created_at
   limit 30;
$$;

-- found a guild (the game takes the 5,000 Sigils). Returns 'ok', 'in_guild', 'locked', 'bad_name', 'bad_tag',
-- 'name_taken' or 'tag_taken'
create or replace function public.guild_create(gname text, gtag text, ginfo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := auth.uid(); n text := btrim(coalesce(gname, '')); t text := upper(btrim(coalesce(gtag, ''))); gid bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.guild_members where user_id = me) then return 'in_guild'; end if;
  if not public.guild_ok(me) then return 'locked'; end if;
  if n !~ '^[A-Za-z0-9][A-Za-z0-9 ''-]{1,18}[A-Za-z0-9]$' then return 'bad_name'; end if;
  if t !~ '^[A-Z0-9]{2,4}$' then return 'bad_tag'; end if;
  if exists (select 1 from public.guilds where lower(name) = lower(n)) then return 'name_taken'; end if;
  if exists (select 1 from public.guilds where lower(tag) = lower(t)) then return 'tag_taken'; end if;
  insert into public.guilds (name, tag, info, leader) values (n, t, left(coalesce(ginfo, ''), 250), me) returning id into gid;
  insert into public.guild_members (user_id, guild_id, role) values (me, gid, 'leader');
  return 'ok';
end;
$$;

-- join an open guild. Returns 'ok', 'in_guild', 'locked', 'not_found', 'closed' or 'full' (25 members)
create or replace function public.guild_join(gid bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := auth.uid(); g public.guilds;
begin
  if me is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.guild_members where user_id = me) then return 'in_guild'; end if;
  if not public.guild_ok(me) then return 'locked'; end if;
  select * into g from public.guilds where id = gid for update;
  if g.id is null then return 'not_found'; end if;
  if not g.open then return 'closed'; end if;
  if (select count(*) from public.guild_members where guild_id = gid) >= 25 then return 'full'; end if;
  insert into public.guild_members (user_id, guild_id) values (me, gid);
  return 'ok';
end;
$$;

-- leave your guild. A leader who leaves passes the lead to the longest-serving officer, else member; the last member
-- leaving closes the guild. Returns 'ok' or 'not_in_guild'
create or replace function public.guild_leave()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := auth.uid(); m public.guild_members; heir uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into m from public.guild_members where user_id = me;
  if m.user_id is null then return 'not_in_guild'; end if;
  delete from public.guild_members where user_id = me;
  if m.role = 'leader' then
    select user_id into heir from public.guild_members where guild_id = m.guild_id order by role = 'officer' desc, joined_at limit 1;
    if heir is null then delete from public.guilds where id = m.guild_id;
    else update public.guild_members set role = 'leader' where user_id = heir; update public.guilds set leader = heir where id = m.guild_id;
    end if;
  end if;
  return 'ok';
end;
$$;

-- guildmaster only: the guild info (max 250 characters) and whether new members can join
create or replace function public.guild_set(ginfo text, gopen boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare m public.guild_members;
begin
  select * into m from public.guild_members where user_id = auth.uid();
  if m.role is distinct from 'leader' then return 'not_leader'; end if;
  update public.guilds set info = left(coalesce(ginfo, ''), 250), open = coalesce(gopen, open) where id = m.guild_id;
  return 'ok';
end;
$$;

-- guildmaster only: make a member an officer or a member again, or hand over the lead ('leader': you become officer)
create or replace function public.guild_set_role(other uuid, new_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare m public.guild_members; o public.guild_members;
begin
  select * into m from public.guild_members where user_id = auth.uid();
  select * into o from public.guild_members where user_id = other;
  if m.role is distinct from 'leader' then return 'not_leader'; end if;
  if o.guild_id is distinct from m.guild_id or other = auth.uid() then return 'not_found'; end if;
  if new_role = 'leader' then
    update public.guild_members set role = 'officer' where user_id = auth.uid();
    update public.guild_members set role = 'leader' where user_id = other;
    update public.guilds set leader = other where id = m.guild_id;
  elsif new_role in ('officer', 'member') then
    update public.guild_members set role = new_role where user_id = other;
  else return 'bad_role';
  end if;
  return 'ok';
end;
$$;

-- remove someone from the guild: the guildmaster can remove anyone, an officer only members
create or replace function public.guild_kick(other uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare m public.guild_members; o public.guild_members;
begin
  select * into m from public.guild_members where user_id = auth.uid();
  select * into o from public.guild_members where user_id = other;
  if o.guild_id is distinct from m.guild_id or other = auth.uid() then return 'not_found'; end if;
  if not (m.role = 'leader' or (m.role = 'officer' and o.role = 'member')) then return 'not_allowed'; end if;
  delete from public.guild_members where user_id = other;
  return 'ok';
end;
$$;

-- Edge Function only (service role): how many guild boss fights this player had today, and their guild
create or replace function public.gboss_keys_used(uid uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$ select count(*)::int from public.guild_boss_hits where user_id = uid and day = (now() at time zone 'utc')::date $$;

-- weekly Guild Chest: by last week's points (same tiers as GCHEST in engine.js), sent as mail the game can claim
create or replace function public.guild_week_end()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.mail (user_id, title, body, rewards)
  select p.user_id, 'Guild Chest: ' || t.name,
         'Your guild boss damage last week: ' || to_char(p.points, 'FM999,999,999,999') || ' points.',
         t.rewards
    from (select user_id, sum(points) as points from public.guild_boss_hits
           where week = date_trunc('week', now() at time zone 'utc')::date - 7 group by user_id) p
    cross join lateral (
      select * from (values
        (1, 'Wooden Chest', '{"silver": 2000, "stones": 2}'::jsonb),
        (50000, 'Bronze Chest', '{"silver": 5000, "stones": 4, "fs": {"fate": 1}}'::jsonb),
        (150000, 'Silver Chest', '{"silver": 8000, "stones": 6, "fs": {"fate": 2}}'::jsonb),
        (400000, 'Gold Chest', '{"silver": 12000, "stones": 10, "fs": {"greater": 1}}'::jsonb),
        (1000000, 'Royal Chest', '{"silver": 18000, "stones": 14, "fs": {"greater": 2}}'::jsonb),
        (2500000, 'Mythic Chest', '{"silver": 26000, "stones": 20, "fs": {"ancient": 1}}'::jsonb)
      ) v(min, name, rewards) where p.points >= v.min order by v.min desc limit 1) t
   where p.points > 0;
$$;


-- friend list again (from 0005): a player who never picked an avatar shows their starter hero
create or replace function public.friend_list()
returns table (user_id uuid, kind text, name text, avatar text, lvl int, cleared int, rating int, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.other,
         case when f.status = 'accepted' then 'friend' when f.b = auth.uid() then 'incoming' else 'outgoing' end,
         left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20),
         coalesce(s.data -> 'p' ->> 'avatar', s.data ->> 'starter', s.data -> 'team' ->> 0),
         public.ffh_int(s.data -> 'p' ->> 'lvl'),
         public.ffh_int(s.data ->> 'cleared'),
         ap.rating,
         f.created_at
    from public.friends f
    cross join lateral (select case when f.a = auth.uid() then f.b else f.a end as other) o
    left join public.saves s on s.user_id = o.other
    left join public.arena_players ap on ap.user_id = o.other
   where f.a = auth.uid() or f.b = auth.uid()
   order by 2, 3;
$$;
revoke all on function public.guild_ok(uuid) from public, anon, authenticated;
revoke all on function public.gboss_keys_used(uuid) from public, anon, authenticated;
revoke all on function public.guild_week_end() from public, anon, authenticated;
revoke all on function public.guild_mine() from public, anon;
revoke all on function public.guild_list(text) from public, anon;
revoke all on function public.guild_create(text, text, text) from public, anon;
revoke all on function public.guild_join(bigint) from public, anon;
revoke all on function public.guild_leave() from public, anon;
revoke all on function public.guild_set(text, boolean) from public, anon;
revoke all on function public.guild_set_role(uuid, text) from public, anon;
revoke all on function public.guild_kick(uuid) from public, anon;
grant execute on function public.guild_mine() to authenticated;
grant execute on function public.guild_list(text) to authenticated;
grant execute on function public.guild_create(text, text, text) to authenticated;
grant execute on function public.guild_join(bigint) to authenticated;
grant execute on function public.guild_leave() to authenticated;
grant execute on function public.guild_set(text, boolean) to authenticated;
grant execute on function public.guild_set_role(uuid, text) to authenticated;
grant execute on function public.guild_kick(uuid) to authenticated;

-- every Monday 00:05 UTC (after the arena week end at 00:00)
select cron.schedule('guild-week-end', '5 0 * * 1', 'select public.guild_week_end()');
