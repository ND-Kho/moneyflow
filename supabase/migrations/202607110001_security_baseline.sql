begin;

-- Reject incomplete or malformed financial data at the database boundary.
alter table public.transactions
  alter column user_id set not null,
  alter column title set not null,
  alter column amount set not null,
  alter column type set not null,
  alter column category set not null,
  alter column transaction_date set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_title_not_blank'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_title_not_blank
      check (char_length(btrim(title)) between 1 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_note_length'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_note_length
      check (note is null or char_length(note) <= 500);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_amount_positive'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_amount_positive check (amount > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_type_valid'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_type_valid
      check (type in ('income', 'expense'));
  end if;
end $$;

alter table public.monthly_budgets
  alter column user_id set not null,
  alter column month_key set not null,
  alter column amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'monthly_budgets_amount_positive'
      and conrelid = 'public.monthly_budgets'::regclass
  ) then
    alter table public.monthly_budgets
      add constraint monthly_budgets_amount_positive check (amount > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'monthly_budgets_month_key_valid'
      and conrelid = 'public.monthly_budgets'::regclass
  ) then
    alter table public.monthly_budgets
      add constraint monthly_budgets_month_key_valid
      check (month_key ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'monthly_budgets_user_month_unique'
      and conrelid = 'public.monthly_budgets'::regclass
  ) then
    alter table public.monthly_budgets
      add constraint monthly_budgets_user_month_unique
      unique (user_id, month_key);
  end if;
end $$;

-- RLS is the actual authorization boundary. Client-side user filters are not enough.
alter table public.transactions enable row level security;
alter table public.monthly_budgets enable row level security;

-- Policies are permissive by default, so an old broad policy could bypass the
-- new owner-only policies. Replace the existing policy set deterministically.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('transactions', 'monthly_budgets')
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end $$;

create policy "transactions_select_own"
on public.transactions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "transactions_insert_own"
on public.transactions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "transactions_update_own"
on public.transactions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "transactions_delete_own"
on public.transactions for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "monthly_budgets_select_own"
on public.monthly_budgets for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "monthly_budgets_insert_own"
on public.monthly_budgets for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "monthly_budgets_update_own"
on public.monthly_budgets for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "monthly_budgets_delete_own"
on public.monthly_budgets for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
