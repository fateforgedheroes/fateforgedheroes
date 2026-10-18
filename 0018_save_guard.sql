-- Fate Forged Heroes: the save guard. Run once after 0017.
-- The campaign, loot and upgrades run in the browser, so a player can edit their save. This checks every save that
-- reaches the cloud, inside the database (a trigger on saves, so no game version can skip it):
--  * impossible values: a hero above the level or stars its rarity allows, an unknown hero, the developer hero on
--    another account, gear beyond +16 / 3 ascension stars / its rarity's substats / the rolls the game can make
--    (the same rules as the arena's checkTeam), a player level above 100, absurd amounts of a currency, more progress
--    than battles won;
--  * impossible jumps between two uploads, measured with the server's clock (the save's own updated_at comes from
--    the browser): Crystals, Sigils, Mythic/Legendary and Ancient Fate Shards, Greater/Ancient Ascension Stones,
--    campaign + Boss Hall + Tower progress, battles won, player level and new heroes, each with a generous allowance
--    per upload plus per hour, so honest play (Auto x10 at 8x, a mail gift, a pile of achievements) stays well under.
-- A save that fails is never refused (a false alarm must not cost an honest player anything): the account is FLAGGED
-- in save_flags, which keeps it off every leaderboard (the arena board too) and lists it in the owner's Admin screen,
-- where Allow keeps it on the boards and Clear forgets the flag. Admin accounts are not checked.
-- The hero, set and stat tables below are the engine's data (engine.js); refresh them when heroes or sets change.

-- ---------- the game's data the checks need (from engine.js) ----------
create table if not exists public.ffh_heroes (
  id text primary key, rar int not null, base_stars int not null, max_stars int not null, max_lvl int not null,
  skills int not null, pc boolean not null default false, gift boolean not null default false
);
create table if not exists public.ffh_sets (id text primary key);
create table if not exists public.ffh_mains (slot text not null, k text not null, primary key (slot, k));
create table if not exists public.ffh_subs (k text primary key, hi int not null);   -- SUB_POOL: the highest roll
alter table public.ffh_heroes enable row level security;
alter table public.ffh_sets enable row level security;
alter table public.ffh_mains enable row level security;
alter table public.ffh_subs enable row level security;

insert into public.ffh_heroes (id, rar, base_stars, max_stars, max_lvl, skills, pc, gift) values
  ('zarvion', 4, 5, 6, 60, 3, false, false), ('krothar', 3, 4, 6, 60, 3, false, false), ('sylreth', 4, 5, 6, 60, 3, false, false),
  ('valkessa', 2, 3, 5, 50, 3, false, false), ('draelyn', 1, 2, 5, 50, 3, false, false), ('grimtar', 1, 2, 5, 50, 3, false, false),
  ('krogash', 1, 2, 5, 50, 3, false, false), ('zulgroth', 1, 2, 5, 50, 3, false, false), ('bloodsnarl', 1, 2, 5, 50, 3, false, false),
  ('ithyra', 3, 4, 6, 60, 3, false, false), ('thalnir', 3, 4, 6, 60, 3, false, false), ('nyressa', 2, 3, 5, 50, 3, false, false),
  ('vaessa', 1, 2, 5, 50, 3, false, false), ('grythor', 1, 2, 5, 50, 3, false, false), ('selenia', 2, 3, 5, 50, 3, false, false),
  ('brukkar', 1, 2, 5, 50, 3, false, false), ('aurelion', 4, 5, 6, 60, 3, false, false), ('zyrael', 3, 4, 6, 60, 3, false, false),
  ('drakulen', 3, 4, 6, 60, 3, false, false), ('keldrax', 2, 3, 5, 50, 3, false, false), ('faedrin', 2, 3, 5, 50, 3, false, false),
  ('skavren', 1, 2, 5, 50, 3, false, false), ('velmira', 4, 5, 6, 60, 3, false, false), ('oraneth', 2, 3, 5, 50, 3, false, false),
  ('nithara', 3, 4, 6, 60, 3, false, false), ('bromir', 1, 2, 5, 50, 3, false, false), ('morgrim', 2, 3, 5, 50, 3, false, false),
  ('vorlund', 1, 2, 5, 50, 3, false, false), ('karnok', 1, 2, 5, 50, 3, false, false), ('kaelira', 3, 4, 6, 60, 3, false, false),
  ('vorak', 3, 4, 6, 60, 3, false, false), ('elyndra', 2, 3, 5, 50, 3, false, false), ('morveth', 4, 5, 6, 60, 3, false, false),
  ('theryn', 2, 3, 5, 50, 3, false, false), ('arkanis', 3, 4, 6, 60, 3, false, false), ('liora', 4, 5, 6, 60, 3, false, false),
  ('gorvann', 2, 3, 5, 50, 3, false, false), ('sylvara', 3, 4, 6, 60, 3, false, false), ('veyrith', 3, 4, 6, 60, 3, false, false),
  ('astraea', 4, 5, 6, 60, 3, false, false), ('korran', 2, 3, 5, 50, 3, false, false), ('zephara', 3, 4, 6, 60, 3, false, false),
  ('malreth', 3, 4, 6, 60, 3, false, false), ('eryndor', 4, 5, 6, 60, 3, false, false), ('ignara', 3, 4, 6, 60, 3, false, false),
  ('thalessa', 3, 4, 6, 60, 3, false, false), ('ravok', 2, 3, 5, 50, 3, false, false), ('seraphine', 3, 4, 6, 60, 3, false, false),
  ('draevan', 4, 5, 6, 60, 3, false, false), ('mirella', 2, 3, 5, 50, 3, false, false), ('volkaris', 4, 5, 6, 60, 3, false, false),
  ('nyxara', 3, 4, 6, 60, 3, false, false), ('orvyn', 2, 3, 5, 50, 3, false, false), ('dio', 4, 5, 6, 60, 3, false, true),
  ('malvek', 4, 5, 6, 60, 3, false, true), ('celesthyr', 4, 5, 6, 60, 3, false, false), ('j3duin', 4, 5, 6, 60, 3, false, true),
  ('pc_tank_m', 3, 4, 6, 60, 3, true, false), ('pc_tank_f', 3, 4, 6, 60, 3, true, false), ('pc_warrior_m', 3, 4, 6, 60, 3, true, false),
  ('pc_warrior_f', 3, 4, 6, 60, 3, true, false), ('pc_mage_m', 3, 4, 6, 60, 3, true, false), ('pc_mage_f', 3, 4, 6, 60, 3, true, false),
  ('pc_ranger_m', 3, 4, 6, 60, 3, true, false), ('pc_ranger_f', 3, 4, 6, 60, 3, true, false), ('pc_rogue_m', 3, 4, 6, 60, 3, true, false),
  ('pc_rogue_f', 3, 4, 6, 60, 3, true, false), ('pc_healer_m', 3, 4, 6, 60, 3, true, false), ('pc_healer_f', 3, 4, 6, 60, 3, true, false),
  ('botkrijger', 0, 1, 5, 50, 1, false, false), ('cryptschutter', 0, 1, 5, 50, 2, false, false), ('schim', 1, 2, 5, 50, 2, false, false),
  ('zombie', 0, 1, 5, 50, 1, false, false), ('pestbrenger', 1, 2, 5, 50, 2, false, false), ('skeletridder', 1, 2, 5, 50, 2, false, false),
  ('doodsmagier', 2, 3, 5, 50, 2, false, false), ('banshee', 2, 3, 5, 50, 2, false, false), ('vampier', 1, 2, 5, 50, 2, false, false),
  ('bloedpriesteres', 2, 3, 5, 50, 2, false, false), ('gevallenridder', 1, 2, 5, 50, 1, false, false), ('hellehond', 1, 2, 5, 50, 2, false, false),
  ('helsebruut', 2, 3, 5, 50, 2, false, false), ('succubus', 2, 3, 5, 50, 2, false, false), ('afgrondsduivel', 1, 2, 5, 50, 2, false, false),
  ('hagedisstrijder', 0, 1, 5, 50, 2, false, false), ('hagedissjamaan', 1, 2, 5, 50, 2, false, false), ('hagedisbruut', 1, 2, 5, 50, 2, false, false),
  ('moerasheks', 2, 3, 5, 50, 2, false, false), ('krokodilbeest', 2, 3, 5, 50, 2, false, false), ('cultist', 0, 1, 5, 50, 2, false, false),
  ('cultgruwel', 2, 3, 5, 50, 2, false, false), ('wouddruide', 1, 2, 5, 50, 2, false, false), ('steengolem', 2, 3, 5, 50, 2, false, false),
  ('ijselementaal', 2, 3, 5, 50, 2, false, false), ('gravestalker', 0, 1, 5, 50, 2, false, false), ('cryptguard', 0, 1, 5, 50, 2, false, false),
  ('soulreaver', 1, 2, 5, 50, 2, false, false), ('dreadarcher', 1, 2, 5, 50, 2, false, false), ('gravewarden', 2, 3, 5, 50, 3, false, false),
  ('ashgoblin', 0, 1, 5, 50, 2, false, false), ('flameberserker', 1, 2, 5, 50, 2, false, false), ('cinderhound', 0, 1, 5, 50, 2, false, false),
  ('magmabrute', 2, 3, 5, 50, 2, false, false), ('hellfireshaman', 2, 3, 5, 50, 2, false, false), ('mosscrawler', 0, 1, 5, 50, 2, false, false),
  ('thornbeast', 1, 2, 5, 50, 2, false, false), ('rotvineshambler', 1, 2, 5, 50, 2, false, false), ('bogreaper', 2, 3, 5, 50, 2, false, false),
  ('woodwraith', 2, 3, 5, 50, 2, false, false), ('frostfangwolf', 0, 1, 5, 50, 2, false, false), ('iceboundknight', 1, 2, 5, 50, 2, false, false),
  ('glacierbrute', 2, 3, 5, 50, 2, false, false), ('frostbornwitch', 2, 3, 5, 50, 2, false, false), ('frozenhorror', 2, 3, 5, 50, 2, false, false),
  ('stormimp', 0, 1, 5, 50, 2, false, false), ('thunderraider', 1, 2, 5, 50, 2, false, false), ('tempestharpy', 1, 2, 5, 50, 2, false, false),
  ('stormcaller', 2, 3, 5, 50, 2, false, false), ('thundergolem', 2, 3, 5, 50, 2, false, false)
on conflict (id) do update set rar = excluded.rar, base_stars = excluded.base_stars, max_stars = excluded.max_stars,
  max_lvl = excluded.max_lvl, skills = excluded.skills, pc = excluded.pc, gift = excluded.gift;

insert into public.ffh_sets (id) values
  ('krijger'), ('levensbron'), ('precisie'), ('vlammenhart'), ('wilgenbast'), ('vampierbloed'), ('windloper'), ('scherpte'),
  ('vernieling'), ('lotsbestemming'), ('woede'), ('nachtscherf'), ('wraak'), ('asvloek'), ('bs_grakk'), ('bs_lizardking'),
  ('bs_plaguelord'), ('bs_boneking'), ('bs_frostcolossus'), ('bs_ashenphoenix'), ('bs_celestial'), ('bs_treant'), ('bs_dunewyrm'),
  ('bs_stormbehemoth'), ('bs_ironjuggernaut'), ('bs_serpentpriest'), ('bs_bloodempress'), ('bs_voidtitan'), ('bs_brimstone'),
  ('bs_shadowlich'), ('bs_frostwitch'), ('bs_sealeviathan'), ('bs_overlord'), ('bs_netherqueen'), ('bs_vampirelord'),
  ('bs_doomharvester'), ('bs_crystaltitan'), ('bs_chaosabom'), ('bs_stonedragon')
on conflict do nothing;

insert into public.ffh_mains (slot, k) values
  ('wapen', 'atk'), ('helm', 'hp'), ('schild', 'def'),
  ('handschoenen', 'atkP'), ('handschoenen', 'defP'), ('handschoenen', 'hpP'), ('handschoenen', 'crit'), ('handschoenen', 'cdmg'),
  ('borstpantser', 'atkP'), ('borstpantser', 'defP'), ('borstpantser', 'hpP'), ('borstpantser', 'acc'), ('borstpantser', 'res'),
  ('laarzen', 'atkP'), ('laarzen', 'defP'), ('laarzen', 'hpP'), ('laarzen', 'spd')
on conflict do nothing;

insert into public.ffh_subs (k, hi) values
  ('hpP', 7), ('atkP', 7), ('defP', 7), ('crit', 6), ('cdmg', 8), ('acc', 9), ('res', 9), ('atk', 11), ('hp', 80), ('def', 6), ('spd', 5)
on conflict (k) do update set hi = excluded.hi;

-- ---------- what the guard keeps ----------
create table if not exists public.save_flags (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reasons text[] not null,                       -- what the latest flagged upload got wrong
  n int not null default 1,                      -- how many uploads were flagged
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create table if not exists public.save_seen (     -- the server's time of each player's last upload
  user_id uuid primary key references auth.users (id) on delete cascade,
  at timestamptz not null
);
alter table public.save_flags enable row level security;
alter table public.save_seen enable row level security;  -- no policies: only the functions below read or write them

-- a number from a save field (any size, so a huge edited value does not slip through as "not a number")
create or replace function public.ffh_num(v text)
returns numeric
language sql
immutable
set search_path = ''
as $$ select case when v ~ '^-?[0-9]{1,30}(\.[0-9]+)?$' then v::numeric end $$;

-- one gear piece: true when the game cannot have made it (the arena's checkTeam rules)
create or replace function public.ffh_gear_bad(it jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  rar numeric := public.ffh_num(it ->> 'rar'); lvl numeric := public.ffh_num(it ->> 'lvl');
  il numeric := coalesce(public.ffh_num(it ->> 'il'), 1); asc_ numeric := coalesce(public.ffh_num(it ->> 'asc'), 0);
  boosts int; s jsonb; hi int; v numeric; keys text[];
begin
  if rar is null or rar not in (0, 1, 2, 3, 4, 5) then return true; end if;
  if lvl is null or lvl < 0 or lvl > 16 or lvl <> trunc(lvl) then return true; end if;
  if il < 1 or il > 84 then return true; end if;                                 -- MAX_IL: the strongest enemies' level
  if asc_ not in (0, 1, 2, 3) or (asc_ > 0 and lvl < 16) then return true; end if;
  if it ? 'set' and not exists (select 1 from public.ffh_sets x where x.id = it ->> 'set') then return true; end if;
  if not exists (select 1 from public.ffh_mains m where m.slot = it ->> 'slot' and m.k = it ->> 'main') then return true; end if;
  boosts := floor(lvl / 4); keys := array[it ->> 'main'];
  if jsonb_typeof(it -> 'subs') = 'array' then
    if jsonb_array_length(it -> 'subs') > least(4, rar + boosts) then return true; end if;
    for s in select x from jsonb_array_elements(it -> 'subs') x loop
      hi := (select p.hi from public.ffh_subs p where p.k = s ->> 0);
      if hi is null or (s ->> 0) = any (keys) then return true; end if;
      keys := keys || (s ->> 0);
      v := public.ffh_num(s ->> 1);
      -- every roll is at most round(max x scale), boosted once per milestone; +25% slack for older items
      if v is null or v < 1 or v > ceil((1 + boosts) * round(hi * (case when s ->> 0 = 'spd' then 1 else 1 + il / 25 end)
          * (case when rar >= 5 then 1.25 else 1 end)) * 1.25) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

-- impossible values in one save (old: the previous save, to skip the heroes and gear when they did not change)
create or replace function public.ffh_save_abs(d jsonb, old jsonb, uid uuid)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare r text[] := '{}'; bad int; ex text; why text;
begin
  if jsonb_typeof(d -> 'roster') = 'object' and (old is null or d -> 'roster' is distinct from old -> 'roster') then
    select count(*), min(x.k) into bad, ex
      from jsonb_each(d -> 'roster') as x(k, v) left join public.ffh_heroes h on h.id = x.k
     where jsonb_typeof(x.v) = 'object' and (
       h.id is null
       or coalesce(public.ffh_num(x.v ->> 'stars'), 0) < h.base_stars or coalesce(public.ffh_num(x.v ->> 'stars'), 99) > h.max_stars
       or coalesce(public.ffh_num(x.v ->> 'lvl'), 0) < 1
       or public.ffh_num(x.v ->> 'lvl') > least(h.max_lvl, public.ffh_num(x.v ->> 'stars') * 10)
       or (jsonb_typeof(x.v -> 'sk') = 'array' and (jsonb_array_length(x.v -> 'sk') > h.skills
           or exists (select 1 from jsonb_array_elements_text(x.v -> 'sk') sk where coalesce(public.ffh_num(sk), -1) not between 0 and 5)))
       or (x.k = 'j3duin' and uid::text not like '6c7ea9be%'));
    if bad > 0 then r := r || format('%s impossible hero(es), e.g. %s', bad, ex); end if;
  end if;
  if jsonb_typeof(d -> 'inv') = 'array' and (old is null or d -> 'inv' is distinct from old -> 'inv') then
    select count(*), min(coalesce(it ->> 'slot', '?') || ' +' || coalesce(it ->> 'lvl', '?')) into bad, ex
      from jsonb_array_elements(d -> 'inv') it where jsonb_typeof(it) = 'object' and public.ffh_gear_bad(it);
    if bad > 0 then r := r || format('%s impossible gear piece(s), e.g. %s', bad, ex); end if;
  end if;
  if coalesce(public.ffh_num(d -> 'p' ->> 'lvl'), 1) not between 1 and 100 or coalesce(public.ffh_num(d -> 'p' ->> 'prestige'), 0) not between 0 and 100 then
    r := r || 'impossible player level'::text;
  end if;
  if coalesce(public.ffh_num(d ->> 'gems'), 0) > 10000000 or coalesce(public.ffh_num(d ->> 'silver'), 0) > 100000000000
     or exists (select 1 from jsonb_each_text(case when jsonb_typeof(d -> 'fs') = 'object' then d -> 'fs' else '{}'::jsonb end) f where coalesce(public.ffh_num(f.value), 0) > 100000)
     or coalesce(public.ffh_num(d ->> 'gems'), 0) < 0 or coalesce(public.ffh_num(d ->> 'silver'), 0) < 0 then
    r := r || 'impossible amount of Crystals, Sigils or shards'::text;
  end if;
  why := public.ffh_lb_flag(d); if why is not null then r := r || why; end if;
  return r;
end;
$$;

-- impossible jumps between the previous save (o) and this one (n), secs apart on the server's clock
create or replace function public.ffh_save_delta(o jsonb, n jsonb, secs numeric)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  r text[] := '{}'; h numeric := greatest(secs, 0) / 3600; g numeric;
  span text := case when secs < 3600 then round(greatest(secs, 0) / 60) || ' min' else round(secs / 3600, 1) || ' h' end;
begin
  -- how much a field grew (a field that shrank or is missing grows 0)
  g := coalesce(public.ffh_num(n ->> 'gems'), 0) - coalesce(public.ffh_num(o ->> 'gems'), 0);
  if g > 1500 + 1000 * h then r := r || format('Crystals +%s in %s', to_char(g, 'FM999,999,999,999'), span); end if;
  g := coalesce(public.ffh_num(n ->> 'silver'), 0) - coalesce(public.ffh_num(o ->> 'silver'), 0);
  if g > 2000000 + 5000000 * h then r := r || format('Sigils +%s in %s', to_char(g, 'FM999,999,999,999'), span); end if;
  g := coalesce(public.ffh_num(n -> 'fs' ->> 'mythic'), 0) + coalesce(public.ffh_num(n -> 'fs' ->> 'legendary'), 0)
     - coalesce(public.ffh_num(o -> 'fs' ->> 'mythic'), 0) - coalesce(public.ffh_num(o -> 'fs' ->> 'legendary'), 0);
  if g > 3 + 2 * h then r := r || format('Mythic/Legendary Fate Shards +%s in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'fs' ->> 'ancient'), 0) - coalesce(public.ffh_num(o -> 'fs' ->> 'ancient'), 0);
  if g > 15 + 15 * h then r := r || format('Ancient Fate Shards +%s in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'stx' ->> 'greater'), 0) - coalesce(public.ffh_num(o -> 'stx' ->> 'greater'), 0);
  if g > 30 + 100 * h then r := r || format('Greater Ascension Stones +%s in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'stx' ->> 'ancient'), 0) - coalesce(public.ffh_num(o -> 'stx' ->> 'ancient'), 0);
  if g > 10 + 50 * h then r := r || format('Ancient Ascension Stones +%s in %s', g, span); end if;
  g := public.ffh_progress(n) - public.ffh_progress(o);
  if g > 10 + 300 * h then r := r || format('%s stages, Boss Hall levels and Tower floors in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'p' -> 'st' ->> 'won'), 0) - coalesce(public.ffh_num(o -> 'p' -> 'st' ->> 'won'), 0);
  if g > 10 + 500 * h then r := r || format('%s battles won in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'p' ->> 'lvl'), 1) - coalesce(public.ffh_num(o -> 'p' ->> 'lvl'), 1);
  if g > 10 + 40 * h then r := r || format('player level +%s in %s', g, span); end if;
  g := (select count(*) from jsonb_object_keys(case when jsonb_typeof(n -> 'roster') = 'object' then n -> 'roster' else '{}'::jsonb end))
     - (select count(*) from jsonb_object_keys(case when jsonb_typeof(o -> 'roster') = 'object' then o -> 'roster' else '{}'::jsonb end));
  if g > 20 + 200 * h then r := r || format('%s new heroes in %s', g, span); end if;
  return r;
end;
$$;

-- campaign stages on every difficulty + Boss Hall levels + Tower floors, as in the leaderboard checks (0017)
create or replace function public.ffh_progress(d jsonb)
returns numeric
language sql
stable
set search_path = ''
as $$
  select least(70, greatest(0, coalesce(public.ffh_int(d ->> 'cleared'), -1) + 1))
    + coalesce((select sum(least(70, greatest(0, public.ffh_int(e) + 1))) from jsonb_array_elements_text(
        case when jsonb_typeof(d -> 'dcl') = 'array' then d -> 'dcl' else '[]'::jsonb end) e where public.ffh_int(e) is not null), 0)
    + coalesce((select sum(least(10, greatest(0, coalesce(public.ffh_int(x), 0)))) from jsonb_each_text(
        case when jsonb_typeof(d -> 'bh') = 'object' then d -> 'bh' else '{}'::jsonb end) as b(k, x)), 0)
    + coalesce((select sum(least(300, greatest(0, coalesce(public.ffh_int(x), 0)))) from jsonb_each_text(
        case when jsonb_typeof(d -> 'tw' -> 'prog') = 'object' then d -> 'tw' -> 'prog' else '{}'::jsonb end) as t(k, x)), 0);
$$;

-- the trigger: after every save that reaches the cloud; it never refuses or fails a save
create or replace function public.ffh_save_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare r text[]; seen timestamptz;
begin
  begin
    if exists (select 1 from public.admins a where a.user_id = new.user_id) then return null; end if;
    select s.at into seen from public.save_seen s where s.user_id = new.user_id;
    r := public.ffh_save_abs(new.data, case when tg_op = 'UPDATE' then old.data end, new.user_id);
    -- jumps only from the second upload this guard sees (no false alarm for what happened before it existed)
    if tg_op = 'UPDATE' and seen is not null then
      r := r || public.ffh_save_delta(old.data, new.data, extract(epoch from now() - seen));
    end if;
    insert into public.save_seen (user_id, at) values (new.user_id, now())
    on conflict (user_id) do update set at = excluded.at;
    if coalesce(array_length(r, 1), 0) > 0 then
      insert into public.save_flags (user_id, reasons) values (new.user_id, r)
      on conflict (user_id) do update set reasons = excluded.reasons, n = public.save_flags.n + 1, last_at = now();
    end if;
  exception when others then
    null; -- a bug in a check must never cost a player their save
  end;
  return null;
end;
$$;
revoke all on function public.ffh_save_guard() from public, anon, authenticated;

drop trigger if exists saves_guard on public.saves;
create trigger saves_guard after insert or update on public.saves
  for each row execute function public.ffh_save_guard();

-- ---------- the leaderboards and the Admin screen (0017's functions, now with the flags) ----------
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
    else not exists (select 1 from public.save_flags f where f.user_id = uid)
      and (kind = 'arena' or coalesce((select public.ffh_lb_flag(s.data) is null from public.saves s where s.user_id = uid), true))
  end;
$$;
revoke all on function public.ffh_lb_ok(uuid, text) from public, anon, authenticated;

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
           coalesce(array_to_string(f.reasons, '; ') || case when f.n > 1 then format(' (%s uploads flagged)', f.n) else '' end,
                    public.ffh_lb_flag(s.data)),
           r.state
      from public.saves s
      left join public.lb_review r on r.user_id = s.user_id
      left join public.save_flags f on f.user_id = s.user_id
     where f.user_id is not null or public.ffh_lb_flag(s.data) is not null or r.state is not null
     order by r.state nulls first, coalesce(f.last_at, s.updated_at) desc
     limit 100;
end;
$$;

-- hide, allow (a false alarm), or clear: the review and the guard's flag are both forgotten
create or replace function public.admin_lb_set(uid uuid, state text, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  if state is null then
    delete from public.lb_review r where r.user_id = uid;
    delete from public.save_flags f where f.user_id = uid;
    return;
  end if;
  if state not in ('hidden', 'allowed') then raise exception 'bad state'; end if;
  insert into public.lb_review (user_id, state, note) values (uid, admin_lb_set.state, left(note, 200))
  on conflict (user_id) do update set state = excluded.state, note = excluded.note, at = now();
end;
$$;

revoke all on function public.admin_lb_list() from public, anon;
revoke all on function public.admin_lb_set(uuid, text, text) from public, anon;
grant execute on function public.admin_lb_list() to authenticated;
grant execute on function public.admin_lb_set(uuid, text, text) to authenticated;

-- The owner's view (SQL Editor): every flagged account and why
--   select f.user_id, u.email, f.reasons, f.n, f.first_at, f.last_at from public.save_flags f join auth.users u on u.id = f.user_id order by f.last_at desc;
