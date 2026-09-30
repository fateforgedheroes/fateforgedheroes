-- Fate Forged Heroes: save history (safety net against a bad release)
-- Run this once in Supabase → SQL Editor, after 0001_saves.sql.
--
-- Every time a cloud save is overwritten, the database first copies the old version into save_history
-- (at most one copy per 15 minutes per player, plus always when the new save has fewer heroes or less
-- campaign progress than the old one). The newest 40 copies per player are kept.
-- This runs inside the database, so it works even when a buggy game version uploads broken saves.

create table if not exists public.save_history (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  data       jsonb not null,
  version    int not null default 0,
  saved_at   timestamptz not null,          -- updated_at of the save that was copied
  created_at timestamptz not null default now(),
  reason     text not null default 'interval'
);
create index if not exists save_history_user on public.save_history (user_id, created_at desc);

-- Players may read their own history (for a future "restore" button); nobody can write to it
-- directly: only the trigger below (security definer) inserts and prunes rows.
alter table public.save_history enable row level security;
drop policy if exists "own history: select" on public.save_history;
create policy "own history: select" on public.save_history for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.save_history from anon, authenticated;

create or replace function public.keep_save_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_at timestamptz;
  why text := null;
begin
  -- nothing to keep when the content did not change
  if new.data is not distinct from old.data then
    return new;
  end if;
  -- a save that loses heroes or campaign progress is suspicious: always keep the old one
  if coalesce((select count(*) from jsonb_object_keys(coalesce(new.data -> 'roster', '{}'::jsonb))), 0)
       < coalesce((select count(*) from jsonb_object_keys(coalesce(old.data -> 'roster', '{}'::jsonb))), 0)
     or coalesce((new.data ->> 'cleared')::int, -1) < coalesce((old.data ->> 'cleared')::int, -1) then
    why := 'shrink';
  else
    select max(created_at) into last_at from public.save_history where user_id = old.user_id;
    if last_at is null or last_at < now() - interval '15 minutes' then
      why := 'interval';
    end if;
  end if;
  if why is not null then
    insert into public.save_history (user_id, data, version, saved_at, reason)
    values (old.user_id, old.data, old.version, old.updated_at, why);
    delete from public.save_history
    where user_id = old.user_id
      and id not in (select id from public.save_history where user_id = old.user_id order by created_at desc limit 40);
  end if;
  return new;
end;
$$;

drop trigger if exists saves_keep_history on public.saves;
create trigger saves_keep_history
  before update on public.saves
  for each row execute function public.keep_save_history();

-- Restore (run by the owner in the SQL Editor, not callable by players):
--   1. find the player:   select id, email from auth.users where email = 'player@example.com';
--   2. list the copies:   select id, created_at, reason, data -> 'p' ->> 'lvl' as player_lvl, data ->> 'cleared' as cleared
--                         from public.save_history where user_id = '<user id>' order by created_at desc;
--   3. put one back:      select public.restore_save(<history id>);
-- The restored save gets a new updated_at, so the player's devices pick it up on their next sync.
create or replace function public.restore_save(history_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.save_history;
begin
  select * into h from public.save_history where id = history_id;
  if h.id is null then
    raise exception 'no save_history row %', history_id;
  end if;
  update public.saves set data = h.data, version = h.version, updated_at = now() where user_id = h.user_id;
end;
$$;
revoke all on function public.restore_save(bigint) from public, anon, authenticated;
