-- IR moves as first-class transactions.
--
-- ESPN files them as type ROSTER alongside ordinary lineup shuffles, and the
-- ingest dropped every ROSTER row. That was right for start/sit decisions — a
-- bench-to-flex move would flood the log weekly — but wrong for IR, which is a
-- genuine roster event people want to see.
--
-- Verified against live data on 2026-09-06: 8 ROSTER transactions, of which 3
-- moved a player from BENCH (slot 20) to IR (slot 21).

alter table public.transactions
  drop constraint if exists transactions_transaction_type_check;

alter table public.transactions
  add constraint transactions_transaction_type_check
  check (transaction_type in
    ('WAIVER','FREE_AGENT','DROP','TRADE','DRAFT','IR_PLACE','IR_ACTIVATE','OTHER'));

comment on constraint transactions_transaction_type_check on public.transactions is
  'IR_PLACE and IR_ACTIVATE are derived from ESPN ROSTER transactions that touch lineup slot 21.';

notify pgrst, 'reload schema';
