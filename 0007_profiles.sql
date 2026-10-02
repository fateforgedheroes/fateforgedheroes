-- Fate Forged Heroes: player profiles for friends and guild mates
-- Run this once in Supabase → SQL Editor, after 0001-0006.
--
-- player_profile(other) returns what the game shows on a profile: name, portrait, player level, guild, campaign
-- progress on every difficulty, Boss Hall levels, the roster (to rank the best 5 champions) with only the gear
-- they wear, and the arena rating and rank. Only for yourself, your friends and your guild mates; null otherwise.

create or replace function public.player_profile(other uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when other = auth.uid()
      or exists (select 1 from public.friends f where f.status = 'accepted'
                 and ((f.a = auth.uid() and f.b = other) or (f.b = auth.uid() and f.a = other)))
      or exists (select 1 from public.guild_members a join public.guild_members b on a.guild_id = b.guild_id
                 where a.user_id = auth.uid() and b.user_id = other)
    then (
      select jsonb_build_object(
        'user_id', s.user_id,
        'name', left(coalesce(s.data -> 'p' ->> 'name', 'Adventurer'), 20),
        'avatar', coalesce(s.data -> 'p' ->> 'avatar', s.data ->> 'starter', s.data -> 'team' ->> 0),
        'lvl', public.ffh_int(s.data -> 'p' ->> 'lvl'),
        'cleared', public.ffh_int(s.data ->> 'cleared'),
        'dcl', s.data -> 'dcl',
        'bh', coalesce(s.data -> 'bh', '{}'::jsonb),
        'roster', coalesce(s.data -> 'roster', '{}'::jsonb),
        'gear', coalesce((select jsonb_agg(it) from jsonb_array_elements(s.data -> 'inv') it
                          where coalesce(it ->> 'owner', '') <> ''), '[]'::jsonb),
        'rating', ap.rating,
        'rank', case when ap.user_id is null then null
                     else 1 + (select count(*) from public.arena_players x where x.rating > ap.rating) end,
        'guild', (select g.name || ' [' || g.tag || ']' from public.guild_members m join public.guilds g on g.id = m.guild_id
                  where m.user_id = s.user_id))
      from public.saves s
      left join public.arena_players ap on ap.user_id = s.user_id
      where s.user_id = other)
    else null end;
$$;

revoke all on function public.player_profile(uuid) from public, anon;
grant execute on function public.player_profile(uuid) to authenticated;
