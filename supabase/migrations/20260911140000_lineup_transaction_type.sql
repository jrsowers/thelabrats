-- Lineup changes become a stored transaction type.
--
-- ESPN logs a start/sit swap as a ROSTER transaction whose items are LINEUP
-- moves between slots. Those were dropped at the parser because a transaction
-- LOG full of "moved a player to the bench" is noise — and they stay out of the
-- log for exactly that reason.
--
-- But they are real roster decisions, and The Galaxy Brain ("made the most
-- roster moves and still lost") is a worse award without them: a manager who
-- shuffled his lineup nine times is the one the joke is about. Stored, counted,
-- and still hidden from the log.
--
-- One transaction per decision, not per item: ESPN records a swap as a single
-- ROSTER row carrying two LINEUP items, which is the right grain already.
alter table public.transactions
  drop constraint if exists transactions_transaction_type_check;

alter table public.transactions
  add constraint transactions_transaction_type_check
  check (transaction_type in
    ('WAIVER','FREE_AGENT','DROP','TRADE','DRAFT','IR_PLACE','IR_ACTIVATE','LINEUP','OTHER'));

comment on constraint transactions_transaction_type_check on public.transactions is
  'LINEUP rows are start/sit swaps: counted by the awards engine, excluded from '
  'the transaction log by getTransactionLog.';
