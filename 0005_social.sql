-- Fate Forged Heroes: friends and in-game mail
-- Run this once in Supabase → SQL Editor, after 0001-0004.
--
-- Players add each other with a friend code (the first 8 characters of their account id; names are not unique).
-- A request is a row (requester a → receiver b, 'pending'); accepting turns it 'accepted'. Browsers cannot touch the
-- table directly: everything goes through the functions below, which only ever act for the signed-in player.

create table if not exists public.friends (
  a          uuid not null references auth.users (id) on delete cascade,   -- who sent the request
  b          uuid not null references auth.users (id) on delete cascade,   -- who received it
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create index if not exists friends_b on public.friends (b);
alter table public.friends enable row level security;
-- no policies: only the functions below read and write it

-- this player's friend code
create or replace function public.my_friend_code()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select upper(left(replace(auth.uid()::text, '-', ''), 8)) $$;

-- send a request by friend code; if that player already asked you, this accepts it.
-- Returns 'sent', 'accepted', 'already', 'self', 'not_found' or 'full' (50 friends and requests at most)
create or replace function public.friend_request(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid(); other uuid; c text := lower(regexp_replace(coalesce(code, ''), '[^0-9A-Fa-f]', '', 'g'));
begin
  if me is null then raise exception 'not signed in'; end if;
  if length(c) <> 8 then return 'not_found'; end if;
  select id into other from auth.users where replace(id::text, '-', '') like c || '%' limit 1;
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  if exists (select 1 from public.friends where (a = me and b = other) or (a = other and b = me and status = 'accepted')) then return 'already'; end if;
  if exists (select 1 from public.friends where a = other and b = me and status = 'pending') then
    update public.friends set status = 'accepted' where a = other and b = me;
    return 'accepted';
  end if;
  if (select count(*) from public.friends where a = me or b = me) >= 50 then return 'full'; end if;
  insert into public.friends (a, b) values (me, other);
  return 'sent';
end;
$$;

-- accept or decline a request someone sent you
create or replace function public.friend_respond(other uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if accept then
    update public.friends set status = 'accepted' where a = other and b = auth.uid() and status = 'pending';
  else
    delete from public.friends where a = other and b = auth.uid() and status = 'pending';
  end if;
end;
$$;

-- remove a friend, or cancel a request you sent
create or replace function public.friend_remove(other uuid)
returns void
language sql
security definer
set search_path = ''
as $$ delete from public.friends where (a = auth.uid() and b = other) or (a = other and b = auth.uid()); $$;

-- friends and requests with what the game shows about them (name, avatar, player level, campaign progress, arena rating).
-- kind: 'friend', 'incoming' (they asked you) or 'outgoing' (you asked them)
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
         s.data -> 'p' ->> 'avatar',
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

revoke all on function public.my_friend_code() from public, anon;
revoke all on function public.friend_request(text) from public, anon;
revoke all on function public.friend_respond(uuid, boolean) from public, anon;
revoke all on function public.friend_remove(uuid) from public, anon;
revoke all on function public.friend_list() from public, anon;
grant execute on function public.my_friend_code() to authenticated;
grant execute on function public.friend_request(text) to authenticated;
grant execute on function public.friend_respond(uuid, boolean) to authenticated;
grant execute on function public.friend_remove(uuid) to authenticated;
grant execute on function public.friend_list() to authenticated;

-- ---------- in-game mail: gifts from the server ----------
-- Send a gift from the SQL Editor (user_id null = every player; expires_at null = never expires):
--   insert into public.mail (title, body, rewards) values
--     ('Welcome gift', 'Thanks for playing Fate Forged Heroes!', '{"silver": 5000, "fs": {"greater": 2}, "stones": 5}');
--   to one player:  ... (user_id, title, body, rewards) values ('<user id>', 'Sorry!', 'For the bug yesterday.', '{"silver": 2000}');
--   find a player:  select id, email from auth.users where email = 'player@example.com';
-- rewards keys the game understands: silver (Sigils), energy (may go above the cap), stones (Ascension Stones),
-- fs: { fate, greater, ancient, mythic, legendary } (Fate Shards), gems (Gems), energy, hero: a hero id (gift-only heroes: "dio", "malvek";
-- a player who already has the hero gets a spare copy). One player by friend code:
--   insert into public.mail (user_id, title, body, rewards) select id, 'A gift: Dio', '', '{"hero": "dio"}' from auth.users where id::text ilike '6c7ea9be%';
create table if not exists public.mail (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users (id) on delete cascade,   -- null = every player
  title      text not null,
  body       text not null default '',
  rewards    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create table if not exists public.mail_claims (
  mail_id    bigint not null references public.mail (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (mail_id, user_id)
);
alter table public.mail enable row level security;
alter table public.mail_claims enable row level security;
-- no policies: only the functions below read and write them

-- this player's mail: gifts (unclaimed, plus claimed ones from the last 14 days) and unclaimed weekly arena rewards.
-- kind: 'gift' or 'arena'
create or replace function public.mail_list()
returns table (id bigint, kind text, title text, body text, rewards jsonb, created_at timestamptz, claimed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, 'gift', m.title, m.body, m.rewards, m.created_at, (c.mail_id is not null)
    from public.mail m
    left join public.mail_claims c on c.mail_id = m.id and c.user_id = auth.uid()
   where (m.user_id is null or m.user_id = auth.uid())
     and (m.expires_at is null or m.expires_at > now())
     and (c.mail_id is null or c.claimed_at > now() - interval '14 days')
  union all
  select r.id, 'arena', 'Weekly arena reward', '', jsonb_build_object('rating', r.rating, 'rank', r.rank), r.week::timestamptz, false
    from public.arena_rewards r
   where r.user_id = auth.uid() and not r.claimed
  order by 6 desc;
$$;

-- claims one gift once; returns its rewards, or null when it was already claimed or is not for this player
create or replace function public.claim_mail(mail_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.mail;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into m from public.mail
   where id = mail_id and (user_id is null or user_id = auth.uid()) and (expires_at is null or expires_at > now());
  if m.id is null then return null; end if;
  insert into public.mail_claims (mail_id, user_id) values (m.id, auth.uid()) on conflict do nothing;
  if not found then return null; end if;
  return m.rewards;
end;
$$;

revoke all on function public.mail_list() from public, anon;
revoke all on function public.claim_mail(bigint) from public, anon;
grant execute on function public.mail_list() to authenticated;
grant execute on function public.claim_mail(bigint) to authenticated;
