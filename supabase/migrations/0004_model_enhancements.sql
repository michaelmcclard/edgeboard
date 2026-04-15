-- 0004: Model & Data Enhancement Tables
-- Adds new data sources for the pick generation engine
-- Does NOT change any UI, only feeds the scoring model

-- 1. Pitcher / QB Starter matchup data
create table if not exists starter_matchups (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  sport text not null,
  team text not null,
  player_name text not null,
  position text, -- SP, QB, etc.
  season_era numeric,        -- pitcher ERA
  season_whip numeric,       -- pitcher WHIP
  season_k_per_9 numeric,
  season_qbr numeric,        -- QB rating
  season_pass_yds_pg numeric,
  season_td_int_ratio numeric,
  vs_opp_avg numeric,        -- career avg vs this opponent
  home_away_split numeric,   -- home/away performance split
  last5_avg numeric,         -- recent form (last 5 starts)
  rest_days integer default 0,
  is_confirmed boolean default false,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_starter_matchups_game on starter_matchups (game_id);

-- 2. Public betting percentages
create table if not exists public_betting (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  spread_public_pct numeric default 50,     -- % on favorite side
  ml_public_pct numeric default 50,
  total_public_pct numeric default 50,      -- % on over
  ticket_count integer,
  money_pct_spread numeric,                 -- actual money %
  money_pct_ml numeric,
  money_pct_total numeric,
  source text default 'action_network',
  fetched_at timestamptz default now(),
  unique(game_id, source)
);
create index idx_public_betting_game on public_betting (game_id);

-- 3. Reverse line movement tracking
create table if not exists line_movements (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  market text not null,           -- spread, total, ml
  open_value numeric,
  current_value numeric,
  direction text,                 -- up, down, flat
  public_side text,               -- side public is on
  is_reverse boolean default false, -- line moved AGAINST public
  magnitude numeric default 0,    -- points moved
  steam_move boolean default false,
  book text,
  recorded_at timestamptz default now()
);
create index idx_line_movements_game on line_movements (game_id, market);

-- 4. Historical head-to-head records
create table if not exists h2h_records (
  id serial primary key,
  team_a text not null,
  team_b text not null,
  sport text not null,
  total_games integer default 0,
  team_a_wins integer default 0,
  team_b_wins integer default 0,
  team_a_ats integer default 0,     -- ATS wins for team_a
  avg_total_score numeric default 0,
  over_pct numeric default 50,
  home_team_win_pct numeric default 50,
  last_meeting_date date,
  last_meeting_result text,
  last_updated timestamptz default now(),
  unique(team_a, team_b, sport)
);
create index idx_h2h_teams on h2h_records (team_a, team_b, sport);

-- 5. Situational angles / spot bets
create table if not exists situational_angles (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  angle_type text not null,        -- letdown, revenge, sandwich, travel, rest_advantage, division_rivalry
  angle_description text,
  historical_ats numeric,          -- ATS record in this situation
  sample_size integer default 0,
  weight numeric default 1.0,      -- how much this angle matters
  fetched_at timestamptz default now()
);
create index idx_sit_angles_game on situational_angles (game_id);

-- 6. Umpire / referee tendencies
create table if not exists officials (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  official_name text not null,
  role text,                       -- HP umpire, referee, etc.
  sport text not null,
  avg_total numeric,               -- avg game total in their games
  over_pct numeric default 50,
  home_win_pct numeric default 50,
  foul_rate numeric,               -- fouls/penalties per game
  k_rate numeric,                  -- strikeout rate (MLB)
  sample_games integer default 0,
  season text,
  fetched_at timestamptz default now(),
  unique(game_id, official_name)
);
create index idx_officials_game on officials (game_id);

-- 7. Sharp money / steam moves
create table if not exists sharp_action (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  market text not null,
  sharp_side text,                 -- the side sharps are on
  confidence text default 'medium', -- low, medium, high
  ticket_vs_money_split boolean default false, -- true if ticket/money diverge
  source text,
  detected_at timestamptz default now()
);
create index idx_sharp_action_game on sharp_action (game_id);

-- 8. Team pace / tempo metrics
alter table team_stats add column if not exists pace numeric default 0;
alter table team_stats add column if not exists possessions_pg numeric default 0;
alter table team_stats add column if not exists time_of_possession numeric default 0;
alter table team_stats add column if not exists plays_per_game numeric default 0;
alter table team_stats add column if not exists avg_game_total numeric default 0;
alter table team_stats add column if not exists over_pct numeric default 50;

-- 9. Divisional / conference records
alter table team_stats add column if not exists division_record text default '0-0';
alter table team_stats add column if not exists conference_record text default '0-0';
alter table team_stats add column if not exists vs_winning_record text default '0-0';
alter table team_stats add column if not exists vs_losing_record text default '0-0';

-- 10. Back-to-back / rest analysis columns
alter table team_stats add column if not exists b2b_record text default '0-0';
alter table team_stats add column if not exists b2b_ats numeric default 0;
alter table team_stats add column if not exists rest_advantage_ats numeric default 0;
alter table team_stats add column if not exists avg_rest_days numeric default 0;

-- 11. Venue-specific stats
create table if not exists venue_stats (
  id serial primary key,
  stadium text not null,
  sport text not null,
  surface text,                    -- grass, turf, dome
  altitude_ft integer default 0,
  avg_total numeric,
  over_pct numeric default 50,
  home_win_pct numeric default 50,
  avg_wind_mph numeric default 0,
  dome boolean default false,
  sample_games integer default 0,
  last_updated timestamptz default now(),
  unique(stadium, sport)
);
create index idx_venue_stats_stadium on venue_stats (stadium);

-- 12. Model confidence audit trail
create table if not exists model_audit (
  id serial primary key,
  bet_id uuid references best_bets(id) on delete cascade,
  model_version text default '2.0',
  factors jsonb not null,          -- all factor scores that produced this pick
  raw_score numeric,
  adjusted_score numeric,
  data_completeness numeric default 0, -- 0-1 how much data was available
  missing_factors text[],
  created_at timestamptz default now()
);
create index idx_model_audit_bet on model_audit (bet_id);

-- 13. Expanded best_bets columns for new model inputs
alter table best_bets add column if not exists public_pct numeric;
alter table best_bets add column if not exists sharp_side text;
alter table best_bets add column if not exists reverse_lm boolean default false;
alter table best_bets add column if not exists h2h_edge numeric;
alter table best_bets add column if not exists situational_angles jsonb;
alter table best_bets add column if not exists official_impact numeric;
alter table best_bets add column if not exists starter_edge numeric;
alter table best_bets add column if not exists venue_impact numeric;
alter table best_bets add column if not exists pace_factor numeric;
alter table best_bets add column if not exists model_version text default '2.0';
alter table best_bets add column if not exists data_quality numeric default 0;

-- 14. Model performance tracking
create table if not exists model_performance (
  id serial primary key,
  date date not null,
  sport text,
  total_picks integer default 0,
  wins integer default 0,
  losses integer default 0,
  pushes integer default 0,
  units_won numeric default 0,
  avg_confidence numeric default 0,
  avg_edge numeric default 0,
  model_version text default '2.0',
  created_at timestamptz default now(),
  unique(date, sport, model_version)
);
create index idx_model_perf_date on model_performance (date, sport);

-- 15. Consensus lines (multi-book average)
create table if not exists consensus_lines (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  market text not null,
  consensus_value numeric,
  num_books integer default 0,
  best_value numeric,
  best_book text,
  worst_value numeric,
  worst_book text,
  recorded_at timestamptz default now(),
  unique(game_id, market, recorded_at)
);
create index idx_consensus_game on consensus_lines (game_id, market);

-- 16. Team schedule context
create table if not exists schedule_context (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  prev_game_date date,
  next_game_date date,
  prev_opponent text,
  next_opponent text,
  is_sandwich boolean default false,  -- between two tough games
  is_letdown boolean default false,   -- after big win
  is_revenge boolean default false,   -- lost to this team recently
  travel_miles integer default 0,
  timezone_change integer default 0,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_schedule_ctx_game on schedule_context (game_id);

-- 17. Data source health tracking
create table if not exists data_source_status (
  id serial primary key,
  source_name text not null,
  last_success timestamptz,
  last_failure timestamptz,
  failure_count integer default 0,
  is_active boolean default true,
  is_stubbed boolean default false,   -- using placeholder data
  notes text,
  updated_at timestamptz default now(),
  unique(source_name)
);
create index idx_data_source_name on data_source_status (source_name);
