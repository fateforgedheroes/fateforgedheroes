-- Fate Forged Heroes: player numbers for the owner. Run once after 0015.
-- admins lists the accounts that may see them (only the SQL Editor can add one); admin_stats() returns them as JSON
-- and refuses everyone else. The game shows an Admin item in the ☰ menu only when admin_check() says yes.
-- Guests (no account) are not in the database, so these numbers count accounts only.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security; -- no policies: nobody reads or writes it from the game

-- add yourself (the owner's account id starts with 6c7ea9be):
insert into public.admins (user_id) select id from auth.users where id::text like '6c7ea9be%' on conflict do nothing;

create or replace function public.admin_check()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.admins a where a.user_id = auth.uid()); $$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out jsonb;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  with days as (select generate_series(current_date - 13, current_date, interval '1 day')::date as d),
  -- a player counts as active on a day when a save of theirs was written that day (the current save, or a copy the
  -- history trigger kept; the history keeps at most 40 copies per player, so very busy players may miss old days)
  act as (
    select distinct user_id, (updated_at at time zone 'utc')::date as d from public.saves where updated_at > now() - interval '14 days'
    union
    select distinct user_id, (created_at at time zone 'utc')::date from public.save_history where created_at > now() - interval '14 days'
  )
  select jsonb_build_object(
    'accounts', (select count(*) from auth.users),
    'saves', (select count(*) from public.saves),
    'active24h', (select count(*) from public.saves where updated_at > now() - interval '24 hours'),
    'active7d', (select count(*) from public.saves where updated_at > now() - interval '7 days'),
    'active30d', (select count(*) from public.saves where updated_at > now() - interval '30 days'),
    'new24h', (select count(*) from auth.users where created_at > now() - interval '24 hours'),
    'new7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'arenaWeek', (select count(*) from public.arena_players where week_fights > 0),
    'arenaFights24h', (select count(*) from public.arena_log where at > now() - interval '24 hours'),
    'chatters7d', (select count(distinct user_id) from public.chat_messages where created_at > now() - interval '7 days'),
    'messages24h', (select count(*) from public.chat_messages where created_at > now() - interval '24 hours'),
    'guilds', (select count(*) from public.guilds),
    'guildMembers', (select count(*) from public.guild_members),
    'bought', (select coalesce(sum(gems), 0) from public.wallets),
    'levels', (select jsonb_agg(jsonb_build_object('band', b, 'n', n) order by b) from (
       select least(100, greatest(1, coalesce(public.ffh_int(data -> 'p' ->> 'lvl'), 1))) / 10 * 10 as b, count(*) as n
         from public.saves where updated_at > now() - interval '30 days' group by 1) l),
    'days', (select jsonb_agg(jsonb_build_object(
       'd', to_char(days.d, 'DD Mon'),
       'active', (select count(distinct a.user_id) from act a where a.d = days.d),
       'new', (select count(*) from auth.users u where (u.created_at at time zone 'utc')::date = days.d)) order by days.d) from days)
  ) into out;
  return out;
end;
$$;

revoke all on function public.admin_check() from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_check() to authenticated;
grant execute on function public.admin_stats() to authenticated;
