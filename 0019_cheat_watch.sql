-- Fate Forged Heroes: the cheat watch for the Admin screen. Run once after 0018.
-- 0018 flags a save that cannot be real but keeps only the latest reasons. This keeps every flagged upload
-- (save_flag_log, the newest 30 per player) and gives the owner two lists:
--  * admin_cheaters(): every account the checks flagged or the owner reviewed, with the e-mail, when it was flagged,
--    every reason, its history and the numbers that matter in its save (Crystals, Sigils, shards, Legendaries, wins);
--  * admin_watch(sort): the 25 richest or furthest accounts of the last 30 days by Crystals, Sigils, Legendary heroes,
--    Mythic shards, battles won, player level or progress, so a careful cheater who stays under every limit still
--    stands out next to honest players (compare the numbers with the battles won).
-- Both refuse everyone but the accounts in admins (0016). Admin accounts are left out of both lists.

create table if not exists public.save_flag_log (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  reasons text[] not null
);
create index if not exists save_flag_log_user on public.save_flag_log (user_id, at desc);
alter table public.save_flag_log enable row level security; -- no policies: only the functions below read or write it

-- 0018's trigger, now also writing the history
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
      insert into public.save_flag_log (user_id, reasons) values (new.user_id, r);
      delete from public.save_flag_log l where l.user_id = new.user_id
        and l.id not in (select k.id from public.save_flag_log k where k.user_id = new.user_id order by k.at desc limit 30);
    end if;
  exception when others then
    null; -- a bug in a check must never cost a player their save
  end;
  return null;
end;
$$;
revoke all on function public.ffh_save_guard() from public, anon, authenticated;

-- the numbers of a save the owner compares (also used by the watch list)
create or replace function public.ffh_save_stats(d jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'gems', coalesce(public.ffh_num(d ->> 'gems'), 0),
    'silver', coalesce(public.ffh_num(d ->> 'silver'), 0),
    'mythic', coalesce(public.ffh_num(d -> 'fs' ->> 'mythic'), 0) + coalesce(public.ffh_num(d -> 'fs' ->> 'legendary'), 0),
    'ancient', coalesce(public.ffh_num(d -> 'fs' ->> 'ancient'), 0),
    'heroes', (select count(*) from jsonb_object_keys(case when jsonb_typeof(d -> 'roster') = 'object' then d -> 'roster' else '{}'::jsonb end)),
    'legend', (select count(*) from jsonb_object_keys(case when jsonb_typeof(d -> 'roster') = 'object' then d -> 'roster' else '{}'::jsonb end) k
                 join public.ffh_heroes h on h.id = k and h.rar = 4),
    'gear', case when jsonb_typeof(d -> 'inv') = 'array' then jsonb_array_length(d -> 'inv') else 0 end,
    'won', coalesce(public.ffh_num(d -> 'p' -> 'st' ->> 'won'), 0),
    'lost', coalesce(public.ffh_num(d -> 'p' -> 'st' ->> 'lost'), 0),
    'lvl', coalesce(public.ffh_num(d -> 'p' ->> 'lvl'), 1),
    'prestige', coalesce(public.ffh_num(d -> 'p' ->> 'prestige'), 0),
    'progress', public.ffh_progress(d)
  );
$$;

create or replace function public.admin_cheaters()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out jsonb;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  select coalesce(jsonb_agg(x order by x ->> 'sortkey' desc), '[]'::jsonb) into out from (
    select jsonb_build_object(
      'user_id', s.user_id,
      'name', left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20),
      'email', u.email,
      'joined', u.created_at,
      'played', s.updated_at,
      'state', r.state,
      'reviewed', r.at,
      -- flagged again after the owner allowed it: back on the list to review
      'again', r.state = 'allowed' and f.last_at > r.at,
      'reasons', coalesce(to_jsonb(f.reasons), case when public.ffh_lb_flag(s.data) is not null then jsonb_build_array(public.ffh_lb_flag(s.data)) else '[]'::jsonb end),
      'n', coalesce(f.n, 0),
      'first', f.first_at,
      'last', f.last_at,
      'rating', (select a.rating from public.arena_players a where a.user_id = s.user_id),
      'stats', public.ffh_save_stats(s.data),
      'log', (select coalesce(jsonb_agg(jsonb_build_object('at', l.at, 'reasons', l.reasons) order by l.at desc), '[]'::jsonb)
                from (select * from public.save_flag_log l where l.user_id = s.user_id order by l.at desc limit 10) l),
      'sortkey', coalesce(f.last_at, s.updated_at)
    ) as x
      from public.saves s
      join auth.users u on u.id = s.user_id
      left join public.lb_review r on r.user_id = s.user_id
      left join public.save_flags f on f.user_id = s.user_id
     where not exists (select 1 from public.admins a where a.user_id = s.user_id)
       and (f.user_id is not null or r.state is not null or public.ffh_lb_flag(s.data) is not null)
     order by coalesce(f.last_at, s.updated_at) desc
     limit 200
  ) t;
  return out;
end;
$$;

create or replace function public.admin_watch(sort text default 'gems')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare out jsonb;
begin
  if not exists (select 1 from public.admins a where a.user_id = auth.uid()) then raise exception 'not allowed'; end if;
  if sort not in ('gems', 'silver', 'legend', 'mythic', 'won', 'lvl', 'progress') then sort := 'gems'; end if;
  select coalesce(jsonb_agg(x order by (x -> 'stats' ->> sort)::numeric desc), '[]'::jsonb) into out from (
    select jsonb_build_object(
      'user_id', s.user_id,
      'name', left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20),
      'email', u.email,
      'played', s.updated_at,
      'flagged', f.user_id is not null or public.ffh_lb_flag(s.data) is not null,
      'state', r.state,
      'stats', public.ffh_save_stats(s.data)
    ) as x
      from public.saves s
      join auth.users u on u.id = s.user_id
      left join public.lb_review r on r.user_id = s.user_id
      left join public.save_flags f on f.user_id = s.user_id
     where s.updated_at > now() - interval '30 days'
       and not exists (select 1 from public.admins a where a.user_id = s.user_id)
     order by (public.ffh_save_stats(s.data) ->> sort)::numeric desc
     limit 25
  ) t;
  return out;
end;
$$;

revoke all on function public.ffh_save_stats(jsonb) from public, anon, authenticated;
revoke all on function public.admin_cheaters() from public, anon;
revoke all on function public.admin_watch(text) from public, anon;
grant execute on function public.admin_cheaters() to authenticated;
grant execute on function public.admin_watch(text) to authenticated;
