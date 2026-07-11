begin;

alter table public.transactions
  add column if not exists receipt_ocr_confidence numeric,
  add column if not exists receipt_ocr_processed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_ocr_confidence_range'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_ocr_confidence_range
      check (
        receipt_ocr_confidence is null
        or receipt_ocr_confidence between 0 and 1
      );
  end if;
end $$;

commit;
