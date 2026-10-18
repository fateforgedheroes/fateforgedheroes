-- Fate Forged Heroes: wider margins for the save guard's jump check. Run once after 0019.
-- A new player who played a while before an upload (as a guest, offline, or picking this device's save in "Two
-- different saves") reached 16 stages and 32 wins in one upload and was flagged. Every upload may now add up to 40
-- stages, Boss Hall levels and Tower floors (was 10) and 60 battles won (was 10) on top of the allowance per hour.
-- Progress without the wins behind it is still caught by ffh_lb_flag, and Crystals, shards, stones and heroes keep
-- their own limits. Only ffh_save_delta changes; the rest of 0018 and 0019 stays as it is.

create or replace function public.ffh_save_delta(o jsonb, n jsonb, secs numeric)
returns text[]
language plpgsql
stable
set search_path = ''
as $$
declare
  r text[] := '{}'; h numeric := greatest(secs, 0) / 3600; g numeric;
  span text := case when secs < 3600 then round(greatest(secs, 0) / 60) || ' min' else round(secs / 3600, 1) || ' h' end;
begin
  -- how much a field grew (a field that shrank or is missing grows 0)
  g := coalesce(public.ffh_num(n ->> 'gems'), 0) - coalesce(public.ffh_num(o ->> 'gems'), 0);
  if g > 1500 + 1000 * h then r := r || format('Crystals +%s in %s', to_char(g, 'FM999,999,999,999'), span); end if;
  g := coalesce(public.ffh_num(n ->> 'silver'), 0) - coalesce(public.ffh_num(o ->> 'silver'), 0);
  if g > 2000000 + 5000000 * h then r := r || format('Sigils +%s in %s', to_char(g, 'FM999,999,999,999'), span); end if;
  g := coalesce(public.ffh_num(n -> 'fs' ->> 'mythic'), 0) + coalesce(public.ffh_num(n -> 'fs' ->> 'legendary'), 0)
     - coalesce(public.ffh_num(o -> 'fs' ->> 'mythic'), 0) - coalesce(public.ffh_num(o -> 'fs' ->> 'legendary'), 0);
  if g > 3 + 2 * h then r := r || format('Mythic/Legendary Fate Shards +%s in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'fs' ->> 'ancient'), 0) - coalesce(public.ffh_num(o -> 'fs' ->> 'ancient'), 0);
  if g > 15 + 15 * h then r := r || format('Ancient Fate Shards +%s in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'stx' ->> 'greater'), 0) - coalesce(public.ffh_num(o -> 'stx' ->> 'greater'), 0);
  if g > 30 + 100 * h then r := r || format('Greater Ascension Stones +%s in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'stx' ->> 'ancient'), 0) - coalesce(public.ffh_num(o -> 'stx' ->> 'ancient'), 0);
  if g > 10 + 50 * h then r := r || format('Ancient Ascension Stones +%s in %s', g, span); end if;
  g := public.ffh_progress(n) - public.ffh_progress(o);
  if g > 40 + 300 * h then r := r || format('%s stages, Boss Hall levels and Tower floors in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'p' -> 'st' ->> 'won'), 0) - coalesce(public.ffh_num(o -> 'p' -> 'st' ->> 'won'), 0);
  if g > 60 + 500 * h then r := r || format('%s battles won in %s', g, span); end if;
  g := coalesce(public.ffh_num(n -> 'p' ->> 'lvl'), 1) - coalesce(public.ffh_num(o -> 'p' ->> 'lvl'), 1);
  if g > 10 + 40 * h then r := r || format('player level +%s in %s', g, span); end if;
  g := (select count(*) from jsonb_object_keys(case when jsonb_typeof(n -> 'roster') = 'object' then n -> 'roster' else '{}'::jsonb end))
     - (select count(*) from jsonb_object_keys(case when jsonb_typeof(o -> 'roster') = 'object' then o -> 'roster' else '{}'::jsonb end));
  if g > 20 + 200 * h then r := r || format('%s new heroes in %s', g, span); end if;
  return r;
end;
$$;
