-- Fate Forged Heroes: manual arena fights. Run once after 0008 (Supabase → SQL Editor).
-- The Edge Function keeps the fight a player is playing by hand in arena_players.pending (seed and both teams);
-- when the player finishes, it replays the fight with their moves and applies the result, then clears it.
-- Browsers still cannot read or write this table (no policies).
alter table public.arena_players add column if not exists pending jsonb;
alter table public.arena_players drop constraint if exists arena_pending_size;
alter table public.arena_players add constraint arena_pending_size check (pending is null or pg_column_size(pending) < 60000);
