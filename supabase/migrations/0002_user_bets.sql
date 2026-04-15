-- User Bets table for streak tracking
create table if not exists user_bets (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  pick text not null,
  sport text not null,
  bet_type text not null,
  result text check (result in ('win', 'loss', 'push')),
  units numeric default 1,
  odds integer default -110,
  profit numeric default 0,
  game_id text,
  created_at timestamptz default now()
);

create index idx_user_bets_date on user_bets (date desc);
create index idx_user_bets_result on user_bets (result, date);
