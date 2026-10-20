-- Fate Forged Heroes: chat announcements and guild activity. Run once after 0020.
-- 1. World chat announces two moments, written by the database itself from the cloud saves (so nobody can post a fake
--    one from the browser): a hero ascended to 6 stars, and a Legendary hero summoned (a new Legendary in the roster
--    while the save's summon count went up; gifts and mission rewards do not count). A trigger on saves compares the
--    new save with the previous one; at most 3 announcements per upload, never on a first upload (a linked guest save),
--    never for an account the save guard flagged or the owner hid, never for a player still called "Adventurer".
--    chat_messages gets kind ('sys' for these) and data ({ ev: 'asc6' | 'leg', hero: id }); chat_list returns both.
-- 2. guild_mine adds per member when they were last seen (the server's time of their last save upload, chat message or
--    guild boss fight), the guild boss keys they used today and on how many of the last 7 days they were active.

alter table public.chat_messages add column if not exists kind text;
alter table public.chat_messages add column if not exists data jsonb;

-- hero names for the announcement text (engine.js CHAMPS; the Fateborn is never announced)
create table if not exists public.ffh_hero_names (id text primary key, name text not null);
alter table public.ffh_hero_names enable row level security;
insert into public.ffh_hero_names (id, name) values
  ('bromir', 'Bromir'), ('grythor', 'Grythor'), ('skavren', 'Skavren'), ('draelyn', 'Draelyn'), ('vaessa', 'Vaessa'), ('brukkar', 'Brukkar'),
  ('karnok', 'Karnok'), ('morgrim', 'Morgrim'), ('vorlund', 'Vorlund'), ('valkessa', 'Valkessa'), ('faedrin', 'Faedrin'), ('krothar', 'Krothar'),
  ('ithyra', 'Ithyra'), ('nyressa', 'Nyressa'), ('selenia', 'Selenia'), ('drakulen', 'Drakulen'), ('keldrax', 'Keldrax'), ('oraneth', 'Oraneth'),
  ('zarvion', 'Zarvion'), ('sylreth', 'Sylreth'), ('thalnir', 'Thalnir'), ('aurelion', 'Aurelion'), ('zyrael', 'Zyrael'), ('velmira', 'Velmira'),
  ('nithara', 'Nithara'), ('kaelira', 'Kaelira'), ('vorak', 'Vorak'), ('elyndra', 'Elyndra'), ('morveth', 'Morveth'), ('theryn', 'Theryn'),
  ('arkanis', 'Arkanis'), ('liora', 'Liora'), ('gorvann', 'Gorvann'), ('sylvara', 'Sylvara'), ('veyrith', 'Veyrith'), ('astraea', 'Astraea'),
  ('korran', 'Korran'), ('zephara', 'Zephara'), ('malreth', 'Malreth'), ('eryndor', 'Eryndor'), ('ignara', 'Ignara'), ('thalessa', 'Thalessa'),
  ('ravok', 'Ravok'), ('seraphine', 'Seraphine'), ('draevan', 'Draevan'), ('mirella', 'Mirella'), ('volkaris', 'Volkaris'), ('nyxara', 'Nyxara'),
  ('orvyn', 'Orvyn'), ('celesthyr', 'Celesthyr'), ('grimtar', 'Grimtar'), ('krogash', 'Krogash'), ('zulgroth', 'Zulgroth'), ('bloodsnarl', 'Bloodsnarl'),
  ('dio', 'Dio'), ('malvek', 'Malvek'), ('j3duin', 'J3DUIN')
on conflict (id) do update set name = excluded.name;

create or replace function public.ffh_chat_announce()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare r record; n int := 0; nm text; av text; lv int; tg text; summoned boolean; hn text;
begin
  begin
    if tg_op <> 'UPDATE' or jsonb_typeof(new.data -> 'roster') <> 'object' or jsonb_typeof(old.data -> 'roster') <> 'object' then return null; end if;
    if exists (select 1 from public.save_flags f where f.user_id = new.user_id)
       or exists (select 1 from public.lb_review v where v.user_id = new.user_id and v.state = 'hidden') then return null; end if;
    nm := left(coalesce(new.data -> 'p' ->> 'name', 'Adventurer'), 20);
    if lower(trim(nm)) = 'adventurer' then return null; end if;
    av := coalesce(new.data -> 'p' ->> 'avatar', new.data ->> 'starter');
    lv := public.ffh_int(new.data -> 'p' ->> 'lvl');
    select g.tag into tg from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = new.user_id;
    summoned := coalesce(public.ffh_num(new.data -> 'p' -> 'st' ->> 'summons'), 0) > coalesce(public.ffh_num(old.data -> 'p' -> 'st' ->> 'summons'), 0);
    for r in
      select x.k, h.rar, h.gift, coalesce(public.ffh_num(x.v ->> 'stars'), 0) as st,
             (old.data -> 'roster') ? x.k as had, coalesce(public.ffh_num(old.data -> 'roster' -> x.k ->> 'stars'), 0) as ost
        from jsonb_each(new.data -> 'roster') as x(k, v) join public.ffh_heroes h on h.id = x.k
       where jsonb_typeof(x.v) = 'object' and not h.pc
    loop
      exit when n >= 3;
      hn := coalesce((select hn0.name from public.ffh_hero_names hn0 where hn0.id = r.k), r.k);
      if r.had and r.ost between 1 and 5 and r.st >= 6 then
        insert into public.chat_messages (channel, user_id, name, avatar, lvl, tag, body, kind, data)
        values ('world', new.user_id, nm, av, lv, tg, format('%s ascended %s to 6 stars!', nm, hn), 'sys', jsonb_build_object('ev', 'asc6', 'hero', r.k));
        n := n + 1;
      elsif not r.had and r.rar = 4 and not r.gift and summoned then
        insert into public.chat_messages (channel, user_id, name, avatar, lvl, tag, body, kind, data)
        values ('world', new.user_id, nm, av, lv, tg, format('%s summoned the Legendary hero %s!', nm, hn), 'sys', jsonb_build_object('ev', 'leg', 'hero', r.k));
        n := n + 1;
      end if;
    end loop;
  exception when others then
    null; -- an announcement must never cost a player their save
  end;
  return null;
end;
$$;
revoke all on function public.ffh_chat_announce() from public, anon, authenticated;

-- named to fire after saves_guard (triggers fire in name order), so a save the guard flags is not announced
drop trigger if exists saves_zz_announce on public.saves;
create trigger saves_zz_announce after update on public.saves
  for each row execute function public.ffh_chat_announce();

-- 0011's chat_list, now with kind and data
create or replace function public.chat_list(ch text, after bigint default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); chan text; r text; ban public.chat_bans;
begin
  if uid is null then return jsonb_build_object('error', 'signin'); end if;
  chan := public.ffh_chat_channel(ch, uid);
  select m.role into r from public.guild_members m where m.user_id = uid;
  select * into ban from public.chat_bans where user_id = uid and (until is null or until > now());
  return jsonb_build_object(
    'channel', chan, 'role', r, 'need', 10,
    'banned', case when ban.user_id is null then null else coalesce(ban.until::text, 'forever') end,
    'can', chan is not null and (chan <> 'world' or public.ffh_chat_level_ok(uid)),
    'msgs', coalesce((select jsonb_agg(x order by x.id) from (
        select c.id, c.user_id, c.name, c.avatar, c.lvl, c.tag, c.body, c.created_at, c.user_id = uid as mine, c.kind, c.data
        from public.chat_messages c
        where c.channel = chan and not c.deleted and c.id > coalesce(after, 0)
        order by c.id desc limit 60) x), '[]'::jsonb),
    'del', coalesce((select jsonb_agg(c.id) from public.chat_messages c
        where c.channel = chan and c.deleted and c.deleted_at > now() - interval '15 minutes'), '[]'::jsonb));
end $$;
revoke all on function public.chat_list(text, bigint) from public, anon;
grant execute on function public.chat_list(text, bigint) to authenticated;

-- 0006's guild_mine, now with each member's activity: seen (last save upload on the server's clock, chat message or
-- guild boss fight), today (guild boss keys used today) and days7 (days active in the last 7, from the same sources and
-- the save history)
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
        'hits', (select count(*) from public.guild_boss_hits h, wk where h.user_id = m.user_id and h.week = wk.w),
        'today', (select count(*) from public.guild_boss_hits h, wk where h.user_id = m.user_id and h.day = wk.d),
        'seen', greatest((select ss.at from public.save_seen ss where ss.user_id = m.user_id), least(s.updated_at, now()),
                         (select max(c.created_at) from public.chat_messages c where c.user_id = m.user_id and c.kind is null),
                         (select max(h.created_at) from public.guild_boss_hits h where h.user_id = m.user_id)),
        'days7', (select count(distinct t.d) from (
            select (ss.at at time zone 'utc')::date as d from public.save_seen ss where ss.user_id = m.user_id
            union all select (sh.created_at at time zone 'utc')::date from public.save_history sh where sh.user_id = m.user_id and sh.created_at > now() - interval '7 days'
            union all select h.day from public.guild_boss_hits h where h.user_id = m.user_id and h.created_at > now() - interval '7 days'
            union all select (c.created_at at time zone 'utc')::date from public.chat_messages c where c.user_id = m.user_id and c.kind is null and c.created_at > now() - interval '7 days'
          ) t where t.d > (now() at time zone 'utc')::date - 7)
      ) order by m.role = 'leader' desc, m.role = 'officer' desc, m.joined_at), '[]'::jsonb)
      from public.guild_members m left join public.saves s on s.user_id = m.user_id where m.guild_id = g.id))
  from me join public.guilds g on g.id = me.guild_id;
$$;
revoke all on function public.guild_mine() from public, anon;
grant execute on function public.guild_mine() to authenticated;
