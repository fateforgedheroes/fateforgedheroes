-- Fate Forged Heroes: playtime chests. Run once after 0024.
-- As RAID's playtime rewards: every UTC day four chests open after 15, 30, 60 and 120 minutes of play, and the count
-- starts again at midnight (UTC), like the daily quests. The server counts the time itself: while the game is shown
-- it calls playtime_tick about every 2 minutes, and the server adds the real time since the previous tick (at most
-- 150 seconds; after a gap of more than 5 minutes it counts nothing for the gap), so calling it faster earns nothing.
-- playtime_claim(i) opens chest i when that much time was played today and returns its reward (the game adds it with
-- grantGift, as with mail). Accounts only (a guest has no server account). Rewards use the mail gift keys.

create table if not exists public.playtime (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  secs int not null default 0,          -- seconds played that UTC day
  last_at timestamptz not null default now(),
  claimed int[] not null default '{}',  -- chests opened that day (their index)
  primary key (user_id, day)
);
alter table public.playtime enable row level security; -- no policies: only the functions below read and write it

-- the four chests: minutes of play and the reward
create or replace function public.ffh_playtime_chests()
returns jsonb
language sql
immutable
set search_path = ''
as $$ select '[
  {"min": 15, "r": {"silver": 3000, "energy": 20}},
  {"min": 30, "r": {"fs": {"greater": 1}}},
  {"min": 60, "r": {"energy": 40, "gems": 10}},
  {"min": 120, "r": {"fs": {"ancient": 1}}}
]'::jsonb $$;

-- today's state: { secs, claimed, chests }
create or replace function public.ffh_playtime_state(uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('secs', coalesce(p.secs, 0), 'claimed', to_jsonb(coalesce(p.claimed, '{}'::int[])), 'chests', public.ffh_playtime_chests())
  from (select 1) x left join public.playtime p on p.user_id = uid and p.day = (now() at time zone 'utc')::date
$$;

-- the game is being played: add the real time since the previous tick (see above); returns today's state
create or replace function public.playtime_tick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'utc')::date;
begin
  if uid is null then raise exception 'sign in first'; end if;
  insert into public.playtime as p (user_id, day) values (uid, d)
  on conflict (user_id, day) do update set
    secs = p.secs + case when p.last_at > now() - interval '5 minutes' then least(150, greatest(0, extract(epoch from now() - p.last_at)))::int else 0 end,
    last_at = now();
  return public.ffh_playtime_state(uid);
end $$;

create or replace function public.playtime_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  return public.ffh_playtime_state(auth.uid());
end $$;

-- open chest i (0-3) of today: { rewards, state } when enough time was played and it is still closed, else { state }
create or replace function public.playtime_claim(i int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); d date := (now() at time zone 'utc')::date; c jsonb := public.ffh_playtime_chests() -> i; r record;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if c is null then return jsonb_build_object('state', public.ffh_playtime_state(uid)); end if;
  select secs, claimed into r from public.playtime where user_id = uid and day = d for update;
  if r is null or r.secs < (c ->> 'min')::int * 60 or i = any (r.claimed) then return jsonb_build_object('state', public.ffh_playtime_state(uid)); end if;
  update public.playtime set claimed = claimed || i where user_id = uid and day = d;
  return jsonb_build_object('rewards', c -> 'r', 'state', public.ffh_playtime_state(uid));
end $$;

revoke all on function public.ffh_playtime_chests() from public;
revoke all on function public.ffh_playtime_state(uuid) from public, anon, authenticated;
revoke all on function public.playtime_tick() from public, anon;
revoke all on function public.playtime_state() from public, anon;
revoke all on function public.playtime_claim(int) from public, anon;
grant execute on function public.ffh_playtime_chests() to anon, authenticated; -- guests may see what the chests hold
grant execute on function public.playtime_tick() to authenticated;
grant execute on function public.playtime_state() to authenticated;
grant execute on function public.playtime_claim(int) to authenticated;

-- every night: days older than a week go
select cron.schedule('playtime-cleanup', '50 3 * * *', $$delete from public.playtime where day < current_date - 7$$);
