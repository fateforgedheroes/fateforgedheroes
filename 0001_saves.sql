-- Fate Forged Heroes: cloud saves
-- Run this once in Supabase → SQL Editor (or with `supabase db push`).

create table if not exists public.saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  version    int not null default 0,
  updated_at timestamptz not null default now(),
  constraint save_size check (pg_column_size(data) < 1000000)
);

alter table public.saves enable row level security;

-- Every player can only read and write their own save.
drop policy if exists "own save: select" on public.saves;
drop policy if exists "own save: insert" on public.saves;
drop policy if exists "own save: update" on public.saves;
drop policy if exists "own save: delete" on public.saves;
create policy "own save: select" on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "own save: insert" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "own save: update" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own save: delete" on public.saves for delete to authenticated using (auth.uid() = user_id);

-- Players can delete their own account (GDPR/AVG). Removes the auth user; the save goes with it (on delete cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
