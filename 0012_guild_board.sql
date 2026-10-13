-- Fate Forged Heroes: the guild leaderboard (Town Hall → Leaderboards → Guilds). Run once after 0011.
-- guild_board(kind) ranks every guild by its guild boss fights (guild_boss_hits, written only by the Edge Function, so
-- unlike the save-based boards these numbers cannot be edited by a player):
--   'week'   points this week (UTC, from Monday), the same points the Guild Chest is paid by
--   'all'    points of every week together
--   'best'   the biggest single hit (damage) a member has done
-- A hit counts for the guild the player was in when they made it. Top 100 plus the caller's own guild (me = true).
create or replace function public.guild_board(kind text)
returns table (rank bigint, id bigint, name text, tag text, members int, score bigint, hits bigint, me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with board as (
    select h.guild_id,
           case when kind = 'best' then max(h.dmg) else sum(h.points) end as score,
           count(*) as hits
      from public.guild_boss_hits h
     where h.guild_id is not null
       and (kind <> 'week' or h.week = date_trunc('week', now() at time zone 'utc')::date)
     group by h.guild_id
  ), ranked as (
    select rank() over (order by b.score desc) as rank, g.id, g.name, g.tag,
           (select count(*)::int from public.guild_members m where m.guild_id = g.id) as members,
           b.score::bigint, b.hits,
           exists (select 1 from public.guild_members m where m.user_id = auth.uid() and m.guild_id = g.id) as me
      from board b join public.guilds g on g.id = b.guild_id
     where b.score > 0
  )
  select * from ranked where rank <= 100 or me order by rank limit 150;
$$;
revoke all on function public.guild_board(text) from public, anon;
grant execute on function public.guild_board(text) to authenticated;
