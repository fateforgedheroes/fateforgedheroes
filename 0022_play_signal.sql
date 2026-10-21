-- Fate Forged Heroes: the anonymous play signal. Run once after 0021.
-- Guests play in their own browser and never reached the database, so the Admin screen only counted accounts. The game
-- now sends a small signal while it is played (play_ping): a random code it made for this browser (no name, e-mail or
-- IP address), whether an account is signed in, the player level, battles won, Easy stages cleared and whether the
-- player created their hero. One row per browser per UTC day; rows older than 120 days are removed every night.
-- admin_play() returns the numbers for the Admin screen (owner only). Nothing here pays out or changes a save.

create table if not exists public.play_pings (
  device text not null,
  day date not null,
  account boolean not null default false,  -- signed in to an account at least once that day
  guest boolean not null default false,    -- played without an account at least once that day
  lvl int not null default 0,              -- player level
  stages int not null default 0,           -- Easy campaign stages cleared (0-70)
  won int not null default 0,              -- battles won in all
  hero boolean not null default false,     -- created their own hero
  pings int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (device, day)
);
create index if not exists play_pings_last on public.play_pings (last_at);
alter table public.play_pings enable row level security; -- no policies: only play_ping writes and admin_play reads

-- the game calls this with or without an account (at start, every 15 minutes while it is shown and after signing in)
create or replace function public.play_ping(dev text, lvl int default 0, stages int default 0, won int default 0, hero boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if dev is null or dev !~ '^[a-z0-9]{16,40}$' then return; end if;
  insert into public.play_pings as p (device, day, account, guest, lvl, stages, won, hero)
  values (dev, (now() at time zone 'utc')::date, auth.uid() is not null, auth.uid() is null,
          least(greatest(coalesce(lvl, 0), 0), 1000), least(greatest(coalesce(stages, 0), 0), 70),
          least(greatest(coalesce(won, 0), 0), 10000000), coalesce(hero, false))
  on conflict (device, day) do update set
    account = p.account or excluded.account, guest = p.guest or excluded.guest, lvl = greatest(p.lvl, excluded.lvl), stages = greatest(p.stages, excluded.stages),
    won = greatest(p.won, excluded.won), hero = p.hero or excluded.hero, pings = least(p.pings + 1, 100000), last_at = now();
end $$;
revoke all on function public.play_ping(text, int, int, int, boolean) from public;
grant execute on function public.play_ping(text, int, int, int, boolean) to anon, authenticated;

-- the numbers for the Admin screen: who plays (guests and accounts), new players per day, how far new players get
-- and how many guests made an account later
create or replace function public.admin_play()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out jsonb;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  with dev as (
    select device, min(day) as first_day, bool_or(account) as acc, bool_or(guest) as guest, max(stages) as stages, max(won) as won, bool_or(hero) as hero
    from public.play_pings group by device
  ),
  win as (
    select x.w, p.device, bool_or(p.account) as a
    from public.play_pings p cross join (values ('now', interval '15 minutes'), ('24h', interval '24 hours'), ('7d', interval '7 days'), ('30d', interval '30 days')) as x (w, iv)
    where p.last_at > now() - x.iv group by x.w, p.device
  ),
  days as (select generate_series(current_date - 13, current_date, interval '1 day')::date as d),
  fresh as (select * from dev where first_day > current_date - 30)
  select jsonb_build_object(
    'active', (select coalesce(jsonb_object_agg(w, jsonb_build_object('guests', g, 'accounts', a)), '{}'::jsonb)
               from (select w, count(*) filter (where not a) as g, count(*) filter (where a) as a from win group by w) s),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('d', to_char(days.d, 'DD Mon'),
               'guests', (select count(*) from public.play_pings p where p.day = days.d and not p.account),
               'accounts', (select count(*) from public.play_pings p where p.day = days.d and p.account),
               'new', (select count(*) from dev where dev.first_day = days.d)) order by days.d), '[]'::jsonb) from days),
    'funnel', (select jsonb_build_object('started', count(*), 'hero', count(*) filter (where hero), 'won', count(*) filter (where won > 0),
               'ch1', count(*) filter (where stages >= 7), 'ch2', count(*) filter (where stages >= 14), 'ch3', count(*) filter (where stages >= 21),
               'ch5', count(*) filter (where stages >= 35), 'easy', count(*) filter (where stages >= 70)) from fresh),
    'converted', (select count(*) from fresh where guest and acc),
    'guests30', (select count(*) from fresh where guest),
    'devices', (select count(*) from dev)
  ) into out;
  return out;
end $$;
revoke all on function public.admin_play() from public;
grant execute on function public.admin_play() to authenticated;

-- every night: rows older than 120 days go
select cron.schedule('play-pings-cleanup', '40 3 * * *', $$delete from public.play_pings where day < current_date - 120$$);
