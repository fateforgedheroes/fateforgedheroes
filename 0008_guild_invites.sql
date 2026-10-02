-- Fate Forged Heroes: guild invites (they arrive in the player's Mail)
-- Run this once in Supabase → SQL Editor, after 0001-0007.
--
-- The Guildmaster or an officer invites a player by friend code. The invite shows up in that player's Mail with
-- Accept and Decline; accepting joins the guild even when it is closed (there must be room, the player must not be
-- in a guild yet and must have cleared Chapter II). Invites older than 14 days are not shown.

create table if not exists public.guild_invites (
  guild_id    bigint not null references public.guilds (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (guild_id, user_id)
);
create index if not exists guild_invites_user on public.guild_invites (user_id);
alter table public.guild_invites enable row level security;
-- no policies: only the functions below touch it

-- invite a player by friend code. Returns 'sent', 'already', 'in_guild' (they are in a guild), 'self', 'full',
-- 'not_found' or 'not_allowed' (only the Guildmaster and officers can invite)
create or replace function public.guild_invite(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare me public.guild_members; other uuid; c text := lower(regexp_replace(coalesce(code, ''), '[^0-9A-Fa-f]', '', 'g'));
begin
  select * into me from public.guild_members where user_id = auth.uid();
  if me.role is null or me.role not in ('leader', 'officer') then return 'not_allowed'; end if;
  if length(c) <> 8 then return 'not_found'; end if;
  select id into other from auth.users where replace(id::text, '-', '') like c || '%' limit 1;
  if other is null then return 'not_found'; end if;
  if other = auth.uid() then return 'self'; end if;
  if exists (select 1 from public.guild_members where user_id = other) then return 'in_guild'; end if;
  if (select count(*) from public.guild_members where guild_id = me.guild_id) >= 25 then return 'full'; end if;
  if exists (select 1 from public.guild_invites where guild_id = me.guild_id and user_id = other and created_at > now() - interval '14 days') then return 'already'; end if;
  insert into public.guild_invites (guild_id, user_id, invited_by) values (me.guild_id, other, auth.uid())
    on conflict (guild_id, user_id) do update set invited_by = excluded.invited_by, created_at = now();
  return 'sent';
end;
$$;

-- the signed-in player's open invites (for the Mail screen)
create or replace function public.guild_invites()
returns table (guild_id bigint, name text, tag text, members int, invited_by text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.name, g.tag, (select count(*)::int from public.guild_members m where m.guild_id = g.id),
         left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20), i.created_at
    from public.guild_invites i
    join public.guilds g on g.id = i.guild_id
    left join public.saves s on s.user_id = i.invited_by
   where i.user_id = auth.uid() and i.created_at > now() - interval '14 days'
   order by i.created_at desc;
$$;

-- accept or decline an invite. Accept returns 'ok', 'in_guild', 'full', 'locked' or 'not_found'; decline 'ok'
create or replace function public.guild_invite_respond(gid bigint, accept boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from public.guild_invites where guild_id = gid and user_id = me) then return 'not_found'; end if;
  if not accept then delete from public.guild_invites where guild_id = gid and user_id = me; return 'ok'; end if;
  if exists (select 1 from public.guild_members where user_id = me) then return 'in_guild'; end if;
  if not public.guild_ok(me) then return 'locked'; end if;
  perform 1 from public.guilds where id = gid for update;
  if not found then delete from public.guild_invites where guild_id = gid and user_id = me; return 'not_found'; end if;
  if (select count(*) from public.guild_members where guild_id = gid) >= 25 then return 'full'; end if;
  insert into public.guild_members (user_id, guild_id) values (me, gid);
  delete from public.guild_invites where user_id = me;   -- one guild: the other invites are done
  return 'ok';
end;
$$;

revoke all on function public.guild_invite(text) from public, anon;
revoke all on function public.guild_invites() from public, anon;
revoke all on function public.guild_invite_respond(bigint, boolean) from public, anon;
grant execute on function public.guild_invite(text) to authenticated;
grant execute on function public.guild_invites() to authenticated;
grant execute on function public.guild_invite_respond(bigint, boolean) to authenticated;
