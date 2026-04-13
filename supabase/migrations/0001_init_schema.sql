-- EdgeBoard Database Schema
-- Run this in your Supabase SQL editor

create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  sport text not null,
  home_team text not null,
  away_team text not null,
  game_time timestamptz not null,
  stadium text,
  is_dome boolean default false,
  status text default 'scheduled',
  home_score integer default 0,
  away_score integer default 0,
  clock text,
  period text,
  possession text,
  created_at timestamptz default now(),
  unique(date, sport, home_team, away_team)
);

create index idx_games_date_sport on games (date, sport);

create table if not exists team_stats (
  id serial primary key,
  team_id text not null,
  sport text not null,
  ats_last5 numeric default 0,
  ats_last10 numeric default 0,
  ats_season numeric default 0,
  su_home text default '0-0',
  su_away text default '0-0',
  home_record text default '0-0',
  away_record text default '0-0',
  ppg numeric default 0,
  opp_ppg numeric default 0,
  off_efficiency numeric default 0,
  def_efficiency numeric default 0,
  rest_days integer default 0,
  streak text default '0',
  last_updated timestamptz default now(),
  unique(team_id, sport)
);

create index idx_team_stats_team on team_stats (team_id, sport);

create table if not exists lines (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  book text not null,
  spread numeric,
  spread_juice numeric default -110,
  ml_home integer,
  ml_away integer,
  total numeric,
  total_juice numeric default -110,
  is_opening boolean default false,
  recorded_at timestamptz default now()
);

create index idx_lines_game on lines (game_id, recorded_at);

create table if not exists best_bets (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  game_id uuid references games(id) on delete cascade,
  bet_type text not null,
  pick text not null,
  confidence numeric not null,
  edge_pct numeric not null,
  ev_pct numeric default 0,
  model_prob numeric default 0,
  implied_prob numeric default 0,
  rationale text,
  weather_flag text,
  injury_flag text,
  line_move_direction text default 'flat',
  best_book text,
  result text,
  units numeric default 1,
  created_at timestamptz default now()
);

create index idx_best_bets_date on best_bets (date, confidence desc);

create table if not exists weather (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  temp_f numeric,
  wind_mph numeric,
  wind_dir text,
  precip_pct numeric,
  condition text,
  impact_text text,
  fetched_at timestamptz default now()
);

create index idx_weather_game on weather (game_id);

create table if not exists injuries (
  id serial primary key,
  team text not null,
  player_name text not null,
  position text,
  status text,
  is_key_player boolean default false,
  updated_at timestamptz default now(),
  game_id uuid references games(id) on delete cascade
);

create index idx_injuries_game on injuries (game_id, team);

create table if not exists news_items (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  source text,
  url text,
  tags text[] default '{}',
  fetched_at timestamptz default now(),
  sport text
);

create index idx_news_sport on news_items (sport, fetched_at desc);

create table if not exists parlays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  legs jsonb not null,
  num_legs integer not null,
  combined_odds numeric,
  implied_prob numeric,
  model_prob numeric,
  correlated_risk boolean default false,
  result text,
  created_at timestamptz default now()
);

create index idx_parlays_date on parlays (date);
