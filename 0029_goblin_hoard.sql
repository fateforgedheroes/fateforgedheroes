-- Fate Forged Heroes: the Goblin Hoard, a secret level behind a rare portal (like Diablo's Cow Level). Run once after 0028.
-- After every battle a player wins, the game asks the server to roll for a portal (hoard_roll). The server decides:
-- only with the Boss Hall open (Chapter III cleared on Easy, read from the save), at most one roll a minute (by the
-- server's clock, so calling faster rolls nothing), never within 4 days of the last portal, then a 1 in 150 chance; an
-- active player finds about one a week. A portal stays open 24 hours and is good for one run. The run itself is played
-- by the Edge Function (`arena`, action 'hoard', engine K.hoardFight): it checks the open portal, plays the fight, pays
-- the Sigils and marks the portal used (hoard_portals.used_at, run), so a portal is never used twice.
-- A portal for a player by hand (a gift or a test), in the SQL Editor:
--   insert into public.hoard_portals (user_id, expires_at) values ('<user id>', now() + interval '24 hours');

create table if not exists public.hoard_portals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  opened_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,             -- set by the Edge Function when the run was played
  run jsonb                        -- that run: seed, level, team, goblins slain, the King, Sigils
);
create index if not exists hoard_portals_u on public.hoard_portals (user_id, opened_at desc);
alter table public.hoard_portals enable row level security; -- no policies: only the functions below and the Edge Function
create table if not exists public.hoard_rolls (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_at timestamptz not null default now(),
  rolls int not null default 0     -- rolls since the last portal
);
alter table public.hoard_rolls enable row level security;

-- the rules: one roll per `gap` seconds, no portal within `rest` days of the last one, the chance per roll, hours open
create or replace function public.ffh_hoard_def()
returns jsonb language sql immutable set search_path = ''
as $$ select '{"gap": 60, "rest": 4, "chance": 0.00667, "hours": 24, "stage": 20}'::jsonb $$;

-- the open portal of a player (not used, not expired), or null
create or replace function public.ffh_hoard_open(uid uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$ select jsonb_build_object('id', p.id, 'opened_at', p.opened_at, 'expires_at', p.expires_at) from public.hoard_portals p
      where p.user_id = uid and p.used_at is null and p.expires_at > now() order by p.opened_at desc limit 1 $$;

-- after a won battle: { portal, new: true } when a portal opened just now, { portal } when one is open already, else {}
create or replace function public.hoard_roll()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare uid uuid := auth.uid(); d jsonb := public.ffh_hoard_def(); op jsonb; r record; fresh int; last_portal timestamptz; pid bigint; exp timestamptz;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if coalesce((select public.ffh_int(s.data ->> 'cleared') from public.saves s where s.user_id = uid), -1) < (d ->> 'stage')::int then return '{}'::jsonb; end if;
  op := public.ffh_hoard_open(uid);
  if op is not null then return jsonb_build_object('portal', op); end if;
  insert into public.hoard_rolls (user_id, last_at, rolls) values (uid, now(), 0) on conflict do nothing;
  get diagnostics fresh = row_count;
  select * into r from public.hoard_rolls x where x.user_id = uid for update;
  if fresh = 0 and now() - r.last_at < make_interval(secs => (d ->> 'gap')::int) then return '{}'::jsonb; end if;
  update public.hoard_rolls set last_at = now(), rolls = rolls + 1 where user_id = uid;
  select max(p.opened_at) into last_portal from public.hoard_portals p where p.user_id = uid;
  if last_portal is not null and now() - last_portal < make_interval(days => (d ->> 'rest')::int) then return '{}'::jsonb; end if;
  if random() >= (d ->> 'chance')::float then return '{}'::jsonb; end if;
  exp := now() + make_interval(hours => (d ->> 'hours')::int);
  insert into public.hoard_portals (user_id, expires_at) values (uid, exp) returning id into pid;
  update public.hoard_rolls set rolls = 0 where user_id = uid;
  return jsonb_build_object('portal', jsonb_build_object('id', pid, 'opened_at', now(), 'expires_at', exp), 'new', true);
end $$;

-- the open portal (or none) and the last run of the past two days, for the Boss Hall
create or replace function public.hoard_state()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('portal', public.ffh_hoard_open(auth.uid()),
    'last', (select p.run || jsonb_build_object('at', p.used_at) from public.hoard_portals p
             where p.user_id = auth.uid() and p.used_at > now() - interval '2 days' order by p.used_at desc limit 1))
$$;

revoke all on function public.ffh_hoard_open(uuid) from public, anon, authenticated;
revoke all on function public.hoard_roll() from public, anon;
revoke all on function public.hoard_state() from public, anon;
grant execute on function public.hoard_roll() to authenticated;
grant execute on function public.hoard_state() to authenticated;
