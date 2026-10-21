-- Fate Forged Heroes: a Legendary Fate Shard for every account. Run once after 0022.
-- Guests are offered it for creating an account (the popup after Chapter I · Stage 3, the reminders, the sign-in
-- screen); the server decides who gets it, never the game: every account that exists now gets one personal mail with
-- the shard, and so does every account created later (a trigger on auth.users, also when an anonymous account gets an
-- email later). account_gifts remembers who got it, so nobody gets two, also when this file runs twice. The player
-- claims it in Mail (claim_mail, once per mail).

create table if not exists public.account_gifts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mail_id bigint references public.mail (id) on delete set null,
  given_at timestamptz not null default now()
);
alter table public.account_gifts enable row level security; -- no policies: only the functions below write it

-- the mail for one account, unless it got one already; not for an anonymous account or one without an email
create or replace function public.ffh_account_gift(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare mid bigint;
begin
  if uid is null or exists (select 1 from public.account_gifts g where g.user_id = uid) then return; end if;
  if not exists (select 1 from auth.users u where u.id = uid and u.email is not null and u.email <> ''
                   and not coalesce((to_jsonb(u) ->> 'is_anonymous')::boolean, false)) then return; end if;
  insert into public.mail (user_id, title, body, rewards, expires_at)
  values (uid, 'A Legendary gift for your account',
          'Thank you for creating an account! Your heroes are now safe and you can play on any device.

Here is a Legendary Fate Shard. Summon it at the Fate Altar: it always brings an Epic or Legendary hero, most often a Legendary. Good luck!',
          '{"fs": {"legendary": 1}}', now() + interval '60 days')
  returning id into mid;
  insert into public.account_gifts (user_id, mail_id) values (uid, mid) on conflict (user_id) do nothing;
end $$;
revoke all on function public.ffh_account_gift(uuid) from public, anon, authenticated;

-- new accounts (sign-up with email or Google), and an anonymous account that gets an email later
create or replace function public.ffh_account_gift_trg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.ffh_account_gift(new.id);
  exception when others then null; -- a failing gift never blocks a sign-up
  end;
  return new;
end $$;
drop trigger if exists ffh_account_gift on auth.users;
create trigger ffh_account_gift after insert or update of email on auth.users
  for each row execute function public.ffh_account_gift_trg();

-- every account that exists now; the result is how many accounts have the gift
do $$ declare r record; begin for r in select id from auth.users loop perform public.ffh_account_gift(r.id); end loop; end $$;
select count(*) as accounts_with_the_gift from public.account_gifts;
