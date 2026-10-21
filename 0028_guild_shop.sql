-- Fate Forged Heroes: guild level, Guild Coins and the Guild Shop. Run once after 0027.
-- Guild XP: every guild quest goal a guild reaches (gquest_done, 0027) gives it 100 XP, all four in a week 150 more; the
-- guild level (1-10) follows from it (ffh_guild_levels) and opens more of the Guild Shop. A new level is announced in the
-- guild chat once (guild_levels).
-- Guild Coins belong to the player and are never stored as a number: the server counts them from what it keeps itself,
-- so they cannot be edited: 40 for every guild quest claimed (80 for the bonus chest; also when it came by mail), 2, 3,
-- 5, 7 or 10 for every guild boss fight from Easy to Nightmare (fights from when this file ran on), minus what the
-- player bought (gshop_buys). They stay with the player when they change guild.
-- The Guild Shop (gshop_buy): every item needs a guild level and has a limit per week (Monday to Monday, UTC); the
-- server checks the guild level, the limit and the coins and returns the item (the game adds it with grantGift).
-- gquest_week_end (0027) is redefined to also record goals reached last week that nobody saw reached, so their guild XP
-- is never lost.

create table if not exists public.gshop_buys (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week int not null,
  item text not null,
  price int not null,
  at timestamptz not null default now()
);
create index if not exists gshop_buys_u on public.gshop_buys (user_id, week);
alter table public.gshop_buys enable row level security; -- no policies: only the functions below
create table if not exists public.guild_levels (
  guild_id bigint primary key references public.guilds (id) on delete cascade,
  lvl int not null                 -- the level last announced in the guild chat
);
alter table public.guild_levels enable row level security;
create table if not exists public.gshop_launch (
  id int primary key default 1,
  at timestamptz not null default now()  -- guild boss fights count for coins from here on
);
alter table public.gshop_launch enable row level security;
insert into public.gshop_launch (id) values (1) on conflict do nothing;

-- the guild XP each level starts at (level 1 = 0 … level 10 = 6,500)
create or replace function public.ffh_guild_levels()
returns int[] language sql immutable set search_path = ''
as $$ select array[0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500] $$;
create or replace function public.ffh_guild_xp(gid bigint)
returns int language sql stable security definer set search_path = ''
as $$ select coalesce(sum(case d.q when 'all' then 150 else 100 end), 0)::int from public.gquest_done d where d.guild_id = gid $$;
create or replace function public.ffh_guild_level(xp int)
returns int language sql immutable set search_path = ''
as $$ select count(*)::int from unnest(public.ffh_guild_levels()) t where t <= xp $$;

-- the shop: lvl = the guild level it needs, limit = how many a player may buy a week, r = what it gives
create or replace function public.ffh_gshop_items()
returns jsonb language sql immutable set search_path = ''
as $$ select '[
  {"id": "sigils", "lvl": 1, "price": 20, "limit": 5, "r": {"silver": 5000}},
  {"id": "fate", "lvl": 1, "price": 15, "limit": 5, "r": {"fs": {"fate": 1}}},
  {"id": "energy", "lvl": 2, "price": 25, "limit": 3, "r": {"energy": 30}},
  {"id": "greater", "lvl": 3, "price": 60, "limit": 3, "r": {"fs": {"greater": 1}}},
  {"id": "lesser", "lvl": 4, "price": 40, "limit": 3, "r": {"stones": 5}},
  {"id": "elixir", "lvl": 5, "price": 50, "limit": 3, "r": {"elx": {"Aether": 2}}},
  {"id": "gstone", "lvl": 6, "price": 80, "limit": 2, "r": {"st": {"greater": 1}}},
  {"id": "ancient", "lvl": 7, "price": 250, "limit": 1, "r": {"fs": {"ancient": 1}}},
  {"id": "astone", "lvl": 8, "price": 300, "limit": 1, "r": {"st": {"ancient": 1}}},
  {"id": "bundle", "lvl": 9, "price": 400, "limit": 1, "r": {"fs": {"greater": 3}, "st": {"greater": 2}}},
  {"id": "mythic", "lvl": 10, "price": 1500, "limit": 1, "r": {"fs": {"mythic": 1}}}
]'::jsonb $$;
-- coins for a quest claim, the bonus chest and a guild boss fight by difficulty (0 Easy … 4 Nightmare)
create or replace function public.ffh_gcoin_rates()
returns jsonb language sql immutable set search_path = ''
as $$ select '{"quest": 40, "bonus": 80, "boss": [2, 3, 5, 7, 10]}'::jsonb $$;

-- a player's Guild Coins: earned (quest claims, guild boss fights since the launch) minus spent
create or replace function public.ffh_gcoins(uid uuid)
returns bigint language sql stable security definer set search_path = ''
as $$
  select coalesce((select sum(case c.q when 'all' then 80 else 40 end) from public.gquest_claims c where c.user_id = uid), 0)
       + coalesce((select sum((array[2, 3, 5, 7, 10])[least(greatest(h.d, 0), 4) + 1]) from public.guild_boss_hits h
                   where h.user_id = uid and h.created_at >= (select l.at from public.gshop_launch l where l.id = 1)), 0)
       - coalesce((select sum(b.price) from public.gshop_buys b where b.user_id = uid), 0)
$$;

-- the guild's level and XP, my coins and the shop with what I bought this week; a new level is announced once
create or replace function public.gshop_state()
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); w int := public.ffh_tourney_week(now()); gid bigint; gname text; gtag text; xp int; lv int; was int; lv_at int[] := public.ffh_guild_levels();
begin
  if uid is null then raise exception 'sign in first'; end if;
  select m.guild_id, g.name, g.tag into gid, gname, gtag from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = uid;
  if gid is null then return jsonb_build_object('guild', false, 'coins', public.ffh_gcoins(uid)); end if;
  xp := public.ffh_guild_xp(gid); lv := public.ffh_guild_level(xp);
  select l.lvl into was from public.guild_levels l where l.guild_id = gid;
  if was is null then
    insert into public.guild_levels (guild_id, lvl) values (gid, lv) on conflict do nothing;
  elsif lv > was then
    update public.guild_levels set lvl = lv where guild_id = gid and lvl < lv;
    if found then
      begin
        insert into public.chat_messages (channel, user_id, name, tag, body, kind, data)
        values ('g:' || gid, uid, gname, gtag, format('%s reached guild level %s! New items wait in the Guild Shop.', gname, lv), 'sys', jsonb_build_object('ev', 'glv', 'lvl', lv));
      exception when others then null;
      end;
    end if;
  end if;
  return jsonb_build_object('guild', true, 'level', lv, 'xp', xp, 'cur', lv_at[lv], 'next', lv_at[lv + 1], 'coins', public.ffh_gcoins(uid),
    'end', public.ffh_tourney_start(w + 1), 'rates', public.ffh_gcoin_rates(),
    'items', (select jsonb_agg(x.it || jsonb_build_object('bought', (select count(*) from public.gshop_buys b where b.user_id = uid and b.week = w and b.item = x.it ->> 'id')) order by x.i)
              from jsonb_array_elements(public.ffh_gshop_items()) with ordinality as x (it, i)));
end $$;

-- buy an item: { rewards, coins } when my guild's level allows it, this week's limit is not reached and I have the
-- coins, else { error: 'no_guild' | 'unknown' | 'level' | 'limit' | 'coins' }
create or replace function public.gshop_buy(it_id text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); w int := public.ffh_tourney_week(now()); gid bigint; it jsonb; coins bigint;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select m.guild_id into gid from public.guild_members m where m.user_id = uid;
  if gid is null then return jsonb_build_object('error', 'no_guild'); end if;
  perform pg_advisory_xact_lock(hashtext('gshop:' || uid::text)); -- one purchase at a time per player
  select x into it from jsonb_array_elements(public.ffh_gshop_items()) x where x ->> 'id' = it_id;
  if it is null then return jsonb_build_object('error', 'unknown'); end if;
  if public.ffh_guild_level(public.ffh_guild_xp(gid)) < (it ->> 'lvl')::int then return jsonb_build_object('error', 'level'); end if;
  if (select count(*) from public.gshop_buys b where b.user_id = uid and b.week = w and b.item = it_id) >= (it ->> 'limit')::int then return jsonb_build_object('error', 'limit'); end if;
  coins := public.ffh_gcoins(uid);
  if coins < (it ->> 'price')::int then return jsonb_build_object('error', 'coins'); end if;
  insert into public.gshop_buys (user_id, week, item, price) values (uid, w, it_id, (it ->> 'price')::int);
  return jsonb_build_object('rewards', it -> 'r', 'coins', coins - (it ->> 'price')::int);
end $$;

-- 0027's Monday job, now also recording last week's goals nobody saw reached (their guild XP), then the mail as before
create or replace function public.gquest_week_end()
returns void language plpgsql security definer set search_path = ''
as $$
declare w int := public.ffh_tourney_week(now()) - 1; g record; m record; s record; done int; helped int;
begin
  if exists (select 1 from public.gquest_mailed x where x.week = w) then return; end if;
  for g in select distinct gm.guild_id from public.guild_members gm loop
    insert into public.gquest_done (guild_id, week, q)
      select g.guild_id, w, s2.k from public.ffh_gquest_sum(g.guild_id, w, null) s2 where s2.total >= s2.target on conflict do nothing;
    if (select count(*) from public.ffh_gquest_sum(g.guild_id, w, null) s2 where s2.total >= s2.target) = 4 then
      insert into public.gquest_done (guild_id, week, q) values (g.guild_id, w, 'all') on conflict do nothing;
    end if;
  end loop;
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

revoke all on function public.ffh_guild_xp(bigint) from public, anon, authenticated;
revoke all on function public.ffh_gcoins(uuid) from public, anon, authenticated;
revoke all on function public.gquest_week_end() from public, anon, authenticated;
revoke all on function public.gshop_state() from public, anon;
revoke all on function public.gshop_buy(text) from public, anon;
grant execute on function public.gshop_state() to authenticated;
grant execute on function public.gshop_buy(text) to authenticated;
