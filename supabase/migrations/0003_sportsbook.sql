-- Sportsbook: extend user_bets for full bet slip workflow
alter table user_bets add column if not exists legs jsonb;
alter table user_bets add column if not exists total_odds integer;
alter table user_bets add column if not exists stake numeric default 0;
alter table user_bets add column if not exists potential_payout numeric default 0;
alter table user_bets add column if not exists status text default 'active';
alter table user_bets add column if not exists settled_at timestamptz;

-- Drop the old constraint if it exists so result can include 'active'
alter table user_bets drop constraint if exists user_bets_result_check;
alter table user_bets add constraint user_bets_result_check check (result in ('win', 'loss', 'push', null));

create index if not exists idx_user_bets_status on user_bets (status);
