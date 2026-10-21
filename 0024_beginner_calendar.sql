-- Fate Forged Heroes: the beginner calendar. Run once after 0023.
-- 28 rewards, one per UTC day the player logs in and claims (missing a day loses nothing; one claim per day), as RAID's
-- new-player login rewards: day 7 Seraphine (Epic healer), day 14 Thalnir (Epic tank), day 21 a Mythic Fate Shard,
-- day 28 Aurelion (Legendary, one of the heroes of the prologue). The server decides which day may be claimed and what
-- it gives (beginner_claim); the game only adds the reward it returns to the save, as claim_mail does. Every account
-- can collect it once. Rewards use the mail gift keys: silver, gems, energy, fs, stones (Lesser), st, elx, hero.

create table if not exists public.beginner_login (
  user_id uuid primary key references auth.users (id) on delete cascade,
  n int not null default 0,        -- days claimed
  last date,                       -- the UTC day of the last claim
  updated_at timestamptz not null default now()
);
alter table public.beginner_login enable row level security; -- no policies: only the functions below read and write it

-- the 28 days (big: the highlights)
create or replace function public.ffh_beginner_days()
returns jsonb
language sql
immutable
set search_path = ''
as $$ select '[
  {"r": {"silver": 5000}},
  {"r": {"energy": 60}},
  {"r": {"fs": {"greater": 2}}},
  {"r": {"elx": {"Aether": 2}}},
  {"r": {"gems": 30}},
  {"r": {"stones": 10}},
  {"r": {"hero": "seraphine"}, "big": true},
  {"r": {"silver": 10000}},
  {"r": {"fs": {"ancient": 1}}},
  {"r": {"energy": 100}},
  {"r": {"st": {"greater": 2}}},
  {"r": {"gems": 40}},
  {"r": {"elx": {"Aether": 3}}},
  {"r": {"hero": "thalnir"}, "big": true},
  {"r": {"silver": 20000}},
  {"r": {"fs": {"greater": 3}}},
  {"r": {"stones": 15}},
  {"r": {"energy": 100}},
  {"r": {"fs": {"ancient": 1}}},
  {"r": {"gems": 50}},
  {"r": {"fs": {"mythic": 1}}, "big": true},
  {"r": {"silver": 30000}},
  {"r": {"st": {"greater": 3}}},
  {"r": {"elx": {"Aether": 4}}},
  {"r": {"fs": {"ancient": 2}}},
  {"r": {"energy": 150}},
  {"r": {"gems": 75}},
  {"r": {"hero": "aurelion"}, "big": true}
]'::jsonb $$;

-- where the player is: { n (days claimed), today (claimed today already), days (all 28) }
create or replace function public.beginner_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); r record;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select n, last into r from public.beginner_login where user_id = uid;
  return jsonb_build_object('n', coalesce(r.n, 0), 'today', coalesce(r.last = (now() at time zone 'utc')::date, false), 'days', public.ffh_beginner_days());
end $$;

-- claim today's day: { day, rewards } (the game adds them), or { today: true } / { done: true } when there is nothing
create or replace function public.beginner_claim()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); r record; days jsonb := public.ffh_beginner_days(); d date := (now() at time zone 'utc')::date;
begin
  if uid is null then raise exception 'sign in first'; end if;
  insert into public.beginner_login (user_id) values (uid) on conflict (user_id) do nothing;
  select n, last into r from public.beginner_login where user_id = uid for update;
  if r.n >= jsonb_array_length(days) then return jsonb_build_object('done', true); end if;
  if r.last = d then return jsonb_build_object('today', true, 'n', r.n); end if;
  update public.beginner_login set n = r.n + 1, last = d, updated_at = now() where user_id = uid;
  return jsonb_build_object('day', r.n + 1, 'rewards', days -> r.n -> 'r');
end $$;

revoke all on function public.ffh_beginner_days() from public;
revoke all on function public.beginner_state() from public, anon;
revoke all on function public.beginner_claim() from public, anon;
grant execute on function public.ffh_beginner_days() to anon, authenticated; -- guests may see what it holds
grant execute on function public.beginner_state() to authenticated;
grant execute on function public.beginner_claim() to authenticated;
