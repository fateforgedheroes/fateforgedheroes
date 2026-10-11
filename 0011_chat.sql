-- Fate Forged Heroes: in-game chat (World and one chat per guild)
-- Run this once in Supabase → SQL Editor, after 0001-0010.
--
-- World chat: everyone signed in can read it; writing needs player level 10 (or a prestige), read from the save.
-- Guild chat: only the members of that guild read and write it; the Guildmaster and officers can delete messages.
-- Everything goes through the functions below (no table access for players). The server takes name, portrait,
-- level and guild tag from the cloud save, cleans the text (swear words from chat_words become ***, links are
-- removed), limits it to 200 characters and to 1 message per 3 seconds (12 a minute, no repeats within 30 s).
-- Three reports from different players hide a message until you look at it. Messages older than 14 days are
-- removed every night.
--
-- Moderation for the owner (SQL Editor):
--   reports:          select r.*, m.name, m.body from public.chat_reports r join public.chat_messages m on m.id = r.message_id order by r.created_at desc;
--   delete a message: update public.chat_messages set deleted = true, deleted_at = now() where id = 123;
--   bring one back:   update public.chat_messages set deleted = false where id = 123;
--   mute a player:    insert into public.chat_bans (user_id, until, reason) values ('<user id>', now() + interval '1 day', 'spam')
--                       on conflict (user_id) do update set until = excluded.until, reason = excluded.reason;
--   ban for good:     the same with until = null;   lift it: delete from public.chat_bans where user_id = '<user id>';
--   add a word:       insert into public.chat_words values ('word') on conflict do nothing;

create table if not exists public.chat_messages (
  id          bigint generated always as identity primary key,
  channel     text not null,               -- 'world' or 'g:<guild id>'
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  avatar      text,
  lvl         int,
  tag         text,                        -- the sender's guild tag (shown in World)
  body        text not null,
  created_at  timestamptz not null default now(),
  deleted     boolean not null default false,
  deleted_at  timestamptz
);
create index if not exists chat_messages_ch on public.chat_messages (channel, id desc);
create index if not exists chat_messages_user on public.chat_messages (user_id, created_at desc);
alter table public.chat_messages enable row level security;

create table if not exists public.chat_reports (
  message_id  bigint not null references public.chat_messages (id) on delete cascade,
  reporter    uuid not null references auth.users (id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  primary key (message_id, reporter)
);
alter table public.chat_reports enable row level security;

create table if not exists public.chat_bans (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  until       timestamptz,                 -- null = for good
  reason      text,
  created_at  timestamptz not null default now()
);
alter table public.chat_bans enable row level security;

create table if not exists public.chat_words (word text primary key);
alter table public.chat_words enable row level security;
-- no policies on any of these: only the functions below touch them

insert into public.chat_words (word) values
  ('fuck'), ('shit'), ('bitch'), ('cunt'), ('dick'), ('cock'), ('pussy'), ('asshole'), ('bastard'), ('whore'),
  ('slut'), ('fag'), ('faggot'), ('nigger'), ('nigga'), ('retard'), ('motherfucker'), ('wanker'), ('twat'), ('rape'),
  ('kanker'), ('kut'), ('klootzak'), ('hoer'), ('mongool'), ('tering'), ('tyfus'), ('godverdomme'), ('lul'), ('flikker')
on conflict do nothing;

-- the text as it is stored: spaces folded, links removed, listed words (and words starting with them) become ***
create or replace function public.ffh_chat_clean(t text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare w text;
begin
  t := btrim(regexp_replace(left(coalesce(t, ''), 600), '\s+', ' ', 'g'));
  t := regexp_replace(t, '(https?://|www\.)\S+', '[link]', 'gi');
  t := regexp_replace(t, '\m[a-z0-9-]+\.(com|net|org|gg|io|ru|xyz|ly|me|co|nl|be|de|app)\M(/\S*)?', '[link]', 'gi');
  for w in select word from public.chat_words loop
    t := regexp_replace(t, '\m' || w || '[a-z]*', '***', 'gi');
  end loop;
  return left(t, 200);
end $$;

-- the channel a player means: 'world', or their own guild's ('g:<id>'); null when they have no guild
create or replace function public.ffh_chat_channel(ch text, uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when ch = 'world' then 'world'
              when ch = 'guild' then (select 'g:' || m.guild_id from public.guild_members m where m.user_id = uid)
         end
$$;

-- may this player write in World? player level 10, or any prestige
create or replace function public.ffh_chat_level_ok(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public.ffh_int(s.data -> 'p' ->> 'lvl') >= 10 or coalesce(public.ffh_int(s.data -> 'p' ->> 'prestige'), 0) > 0
                   from public.saves s where s.user_id = uid), false)
$$;

-- send a message. Returns { ok, id } or { error }: signin, nosave, banned (with until), empty, level, noguild,
-- channel, slow, repeat
create or replace function public.chat_send(ch text, msg text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); s jsonb; chan text; ban public.chat_bans; clean text; nid bigint; gtag text;
begin
  if uid is null then return jsonb_build_object('error', 'signin'); end if;
  select data into s from public.saves where user_id = uid;
  if s is null then return jsonb_build_object('error', 'nosave'); end if;
  select * into ban from public.chat_bans where user_id = uid and (until is null or until > now());
  if found then return jsonb_build_object('error', 'banned', 'until', ban.until); end if;
  chan := public.ffh_chat_channel(ch, uid);
  if ch = 'guild' and chan is null then return jsonb_build_object('error', 'noguild'); end if;
  if chan is null then return jsonb_build_object('error', 'channel'); end if;
  if chan = 'world' and not public.ffh_chat_level_ok(uid) then return jsonb_build_object('error', 'level'); end if;
  clean := public.ffh_chat_clean(msg);
  if clean = '' then return jsonb_build_object('error', 'empty'); end if;
  if exists (select 1 from public.chat_messages where user_id = uid and created_at > now() - interval '3 seconds')
     or (select count(*) from public.chat_messages where user_id = uid and created_at > now() - interval '1 minute') >= 12
  then return jsonb_build_object('error', 'slow'); end if;
  if exists (select 1 from public.chat_messages where user_id = uid and channel = chan and body = clean and created_at > now() - interval '30 seconds')
  then return jsonb_build_object('error', 'repeat'); end if;
  select g.tag into gtag from public.guild_members m join public.guilds g on g.id = m.guild_id where m.user_id = uid;
  insert into public.chat_messages (channel, user_id, name, avatar, lvl, tag, body)
  values (chan, uid, left(coalesce(nullif(s -> 'p' ->> 'name', ''), 'Adventurer'), 20),
          coalesce(s -> 'p' ->> 'avatar', s ->> 'starter', s -> 'team' ->> 0),
          public.ffh_int(s -> 'p' ->> 'lvl'), gtag, clean)
  returning id into nid;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

-- the newest messages of a channel ('world' or 'guild'), or those after message id `after`, oldest first (at most
-- 60), plus what the player may do: can (write here), need (level for World), role (in the guild: leader/officer/
-- member, null without a guild), banned (until, when muted), del (ids hidden in the last 15 minutes, to take away)
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
        select c.id, c.user_id, c.name, c.avatar, c.lvl, c.tag, c.body, c.created_at, c.user_id = uid as mine
        from public.chat_messages c
        where c.channel = chan and not c.deleted and c.id > coalesce(after, 0)
        order by c.id desc limit 60) x), '[]'::jsonb),
    'del', coalesce((select jsonb_agg(c.id) from public.chat_messages c
        where c.channel = chan and c.deleted and c.deleted_at > now() - interval '15 minutes'), '[]'::jsonb));
end $$;

-- new messages by others since the ids a player has seen (for the unread count on the chat button), at most 99 each
create or replace function public.chat_unread(w_after bigint default 0, g_after bigint default 0)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'w', (select count(*) from (select 1 from public.chat_messages c where c.channel = 'world' and not c.deleted
          and c.id > coalesce(w_after, 0) and c.user_id <> auth.uid() limit 99) a),
    'g', (select count(*) from (select 1 from public.chat_messages c where c.channel = public.ffh_chat_channel('guild', auth.uid())
          and not c.deleted and c.id > coalesce(g_after, 0) and c.user_id <> auth.uid() limit 99) b),
    'wl', (select max(c.id) from public.chat_messages c where c.channel = 'world'),
    'gl', (select max(c.id) from public.chat_messages c where c.channel = public.ffh_chat_channel('guild', auth.uid())))
  where auth.uid() is not null
$$;

-- delete a message: your own, or (Guildmaster and officers) any in your guild's chat. Returns 'ok' or 'not_allowed'
create or replace function public.chat_delete(mid bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); m public.chat_messages; me public.guild_members;
begin
  select * into m from public.chat_messages where id = mid;
  if m.id is null or uid is null then return 'not_allowed'; end if;
  select * into me from public.guild_members where user_id = uid;
  if m.user_id = uid or (me.role in ('leader', 'officer') and m.channel = 'g:' || me.guild_id) then
    update public.chat_messages set deleted = true, deleted_at = now() where id = mid;
    return 'ok';
  end if;
  return 'not_allowed';
end $$;

-- report a message (once per player); three reports from different players hide it. Returns 'ok'
create or replace function public.chat_report(mid bigint, why text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.chat_messages where id = mid) then return 'not_found'; end if;
  insert into public.chat_reports (message_id, reporter, reason) values (mid, uid, left(why, 200)) on conflict do nothing;
  if (select count(*) from public.chat_reports where message_id = mid) >= 3 then
    update public.chat_messages set deleted = true, deleted_at = now() where id = mid and not deleted;
  end if;
  return 'ok';
end $$;

revoke all on function public.ffh_chat_clean(text) from public, anon, authenticated;
revoke all on function public.ffh_chat_channel(text, uuid) from public, anon, authenticated;
revoke all on function public.ffh_chat_level_ok(uuid) from public, anon, authenticated;
revoke all on function public.chat_send(text, text) from public, anon;
revoke all on function public.chat_list(text, bigint) from public, anon;
revoke all on function public.chat_unread(bigint, bigint) from public, anon;
revoke all on function public.chat_delete(bigint) from public, anon;
revoke all on function public.chat_report(bigint, text) from public, anon;
grant execute on function public.chat_send(text, text) to authenticated;
grant execute on function public.chat_list(text, bigint) to authenticated;
grant execute on function public.chat_unread(bigint, bigint) to authenticated;
grant execute on function public.chat_delete(bigint) to authenticated;
grant execute on function public.chat_report(bigint, text) to authenticated;

-- every night: messages older than 14 days go (their reports with them)
select cron.schedule('chat-cleanup', '30 3 * * *', $$delete from public.chat_messages where created_at < now() - interval '14 days'$$);
