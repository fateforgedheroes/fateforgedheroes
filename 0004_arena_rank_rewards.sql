-- Fate Forged Heroes: arena top-5 rewards
-- Run this once in Supabase → SQL Editor, after 0003_arena.sql.
--
-- The weekly reward row now also stores the player's place among everyone who fought that week (rank 1 = highest
-- rating; ties go to more wins, then to whoever got there first). The game pays the top 5 an extra reward on top of
-- the tier reward (see K.ARENA_RANK_REWARDS).

alter table public.arena_rewards add column if not exists rank int;

create or replace function public.arena_week_end()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.arena_rewards (user_id, week, rating, rank)
    select user_id, current_date, rating,
           row_number() over (order by rating desc, wins desc, updated_at asc)
      from public.arena_players where week_fights > 0
    on conflict (user_id, week) do nothing;
  update public.arena_players set week_fights = 0 where week_fights > 0;
  delete from public.arena_log where at < now() - interval '30 days';
end;
$$;
revoke all on function public.arena_week_end() from public, anon, authenticated;

-- the return type changes (rank added), so the old function has to go first
drop function if exists public.claim_arena_rewards();
create function public.claim_arena_rewards()
returns table (week date, rating int, rank int)
language sql
security definer
set search_path = ''
as $$
  update public.arena_rewards set claimed = true
   where user_id = auth.uid() and not claimed
  returning week, rating, rank;
$$;
revoke all on function public.claim_arena_rewards() from public, anon;
grant execute on function public.claim_arena_rewards() to authenticated;
