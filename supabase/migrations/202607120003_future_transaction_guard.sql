begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_date_not_in_future'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_date_not_in_future
      check (transaction_date <= current_date) not valid;
  end if;
end $$;

commit;
