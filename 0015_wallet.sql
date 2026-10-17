-- Fate Forged Heroes: the server wallet for bought Crystals. Run once after 0014.
-- Crystals a player earns in the game stay in the save (S.gems). Crystals bought with real money live only here: the
-- client can read its balance and spend it, never add to it. Only the server (the service role, e.g. the payment
-- webhook in a later step) credits a wallet, through wallet_credit, at most once per payment reference.
-- Every change is a row in wallet_ledger, so a balance can always be explained and a refund reversed.

create table if not exists public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gems int not null default 0 check (gems >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta int not null check (delta <> 0),
  balance int not null check (balance >= 0),
  reason text not null,   -- 'purchase', 'spend', 'refund', 'grant'
  item text,              -- what was bought in the game (spend) or the product (purchase)
  ref text,               -- the payment provider's id for a purchase or refund
  created_at timestamptz not null default now()
);
create index if not exists wallet_ledger_user on public.wallet_ledger (user_id, created_at desc);
-- one credit per payment: a webhook delivered twice changes nothing the second time
create unique index if not exists wallet_ledger_ref on public.wallet_ledger (reason, ref) where ref is not null;

alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
drop policy if exists "own wallet" on public.wallets;
create policy "own wallet" on public.wallets for select to authenticated using (user_id = auth.uid());
drop policy if exists "own ledger" on public.wallet_ledger;
create policy "own ledger" on public.wallet_ledger for select to authenticated using (user_id = auth.uid());
-- no insert, update or delete policies: clients never write these tables directly
revoke insert, update, delete on public.wallets, public.wallet_ledger from anon, authenticated;

-- the caller's bought Crystals (0 without a wallet yet)
create or replace function public.wallet_mine()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select w.gems from public.wallets w where w.user_id = auth.uid()), 0);
$$;

-- spend bought Crystals on something in the game; returns the new balance, or raises 'not enough' and changes nothing
create or replace function public.wallet_spend(amount int, item text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); bal int;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if amount is null or amount <= 0 or amount > 100000 then raise exception 'bad amount'; end if;
  update public.wallets set gems = gems - amount, updated_at = now()
   where user_id = uid and gems >= amount
   returning gems into bal;
  if bal is null then raise exception 'not enough'; end if;
  insert into public.wallet_ledger (user_id, delta, balance, reason, item)
  values (uid, -amount, bal, 'spend', left(coalesce(item, ''), 40));
  return bal;
end;
$$;

-- the server credits (or, with a negative amount, takes back) bought Crystals; ref makes it happen once per payment.
-- Not callable by players: only the service role (Edge Functions) and the SQL Editor.
create or replace function public.wallet_credit(uid uuid, amount int, reason text, ref text, item text default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare bal int;
begin
  if amount is null or amount = 0 then raise exception 'bad amount'; end if;
  if reason not in ('purchase', 'refund', 'grant') then raise exception 'bad reason'; end if;
  if ref is not null and exists (select 1 from public.wallet_ledger l where l.reason = wallet_credit.reason and l.ref = wallet_credit.ref) then
    return (select w.gems from public.wallets w where w.user_id = uid);
  end if;
  insert into public.wallets (user_id, gems) values (uid, greatest(0, amount))
  on conflict (user_id) do update set gems = greatest(0, public.wallets.gems + amount), updated_at = now()
  returning gems into bal;
  insert into public.wallet_ledger (user_id, delta, balance, reason, item, ref) values (uid, amount, bal, reason, item, ref);
  return bal;
end;
$$;

revoke all on function public.wallet_mine() from public, anon;
revoke all on function public.wallet_spend(int, text) from public, anon;
revoke all on function public.wallet_credit(uuid, int, text, text, text) from public, anon, authenticated;
grant execute on function public.wallet_mine() to authenticated;
grant execute on function public.wallet_spend(int, text) to authenticated;
grant execute on function public.wallet_credit(uuid, int, text, text, text) to service_role;

-- To test before payments exist (SQL Editor), give yourself 500 bought Crystals:
--   select public.wallet_credit((select id from auth.users where email = 'you@example.com'), 500, 'grant', 'test-1');
-- A player's history:
--   select * from public.wallet_ledger where user_id = (select id from auth.users where email = 'you@example.com') order by id desc;
