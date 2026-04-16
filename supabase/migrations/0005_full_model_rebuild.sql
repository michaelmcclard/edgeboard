-- 0005: Full Model Rebuild - v3.0
-- Adds hitting, baserunning, defense, bullpen depth, managerial, game context tables
-- Expands best_bets with factor-driven rationale fields

-- 1. Lineup / Hitting Analytics (per game, per team)
create table if not exists lineup_stats (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  sport text not null,
  -- Plate Discipline
  bb_pct numeric default 0,
  chase_rate numeric default 0,
  contact_rate numeric default 0,
  first_pitch_strike_rate numeric default 0,
  k_rate_two_strikes numeric default 0,
  -- Power Metrics
  iso numeric default 0,
  barrel_rate numeric default 0,
  hard_hit_rate numeric default 0,
  fly_ball_rate numeric default 0,
  pull_rate numeric default 0,
  -- Situational Hitting
  risp_avg numeric default 0,
  risp_ops numeric default 0,
  two_out_avg numeric default 0,
  late_inning_ops numeric default 0,
  third_time_thru_ops numeric default 0,
  -- Lineup Construction
  lhb_count integer default 0,
  rhb_count integer default 0,
  lineup_ops_1_thru_9 numeric default 0,
  leadoff_obp numeric default 0,
  cleanup_ops numeric default 0,
  vs_starter_hand_ops numeric default 0,
  platoon_disadvantage_count integer default 0,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_lineup_stats_game on lineup_stats (game_id);

-- 2. Baserunning & Speed
create table if not exists baserunning_stats (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  sb_attempts integer default 0,
  sb_success_rate numeric default 0,
  sprint_speed_avg numeric default 0,
  extra_bases_taken_pct numeric default 0,
  bsr numeric default 0,
  gidp_rate numeric default 0,
  wp_pb_sb integer default 0,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_baserunning_game on baserunning_stats (game_id);

-- 3. Defensive Analytics
create table if not exists defensive_stats (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  drs_total integer default 0,
  oaa_total integer default 0,
  errors_per_game numeric default 0,
  of_arm_strength numeric default 0,
  of_assists integer default 0,
  ss_oaa integer default 0,
  cf_oaa integer default 0,
  corner_of_oaa integer default 0,
  catcher_pop_time numeric default 0,
  catcher_cs_pct numeric default 0,
  shift_pct numeric default 0,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_defensive_game on defensive_stats (game_id);

-- 4. Bullpen Depth Detail
create table if not exists bullpen_detail (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  -- Aggregate bullpen
  bp_era numeric default 0,
  bp_fip numeric default 0,
  bp_whip numeric default 0,
  bp_k_per_9 numeric default 0,
  -- Availability
  closer_available boolean default true,
  closer_blown_save_rate numeric default 0,
  setup_available boolean default true,
  lhp_available boolean default true,
  -- Workload
  relievers_2plus_days integer default 0,
  bp_innings_last_3_days numeric default 0,
  high_leverage_available boolean default true,
  -- Last 7 days
  bp_era_last_7d numeric default 0,
  bp_appearances_last_7d integer default 0,
  -- Opener tendency
  uses_opener boolean default false,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_bullpen_detail_game on bullpen_detail (game_id);

-- 5. Managerial Tendencies
create table if not exists managerial_tendencies (
  id serial primary key,
  team text not null,
  sport text not null,
  manager_name text,
  sac_bunt_rate numeric default 0,
  hit_and_run_freq numeric default 0,
  pinch_hit_aggressiveness numeric default 0,
  intentional_walk_rate numeric default 0,
  quick_hook_pct numeric default 0,
  one_run_game_record text default '0-0',
  one_run_game_win_pct numeric default 0.5,
  post_loss_record text default '0-0',
  post_loss_win_pct numeric default 0.5,
  season text,
  fetched_at timestamptz default now(),
  unique(team, sport, season)
);
create index idx_managerial_team on managerial_tendencies (team, sport);

-- 6. Game Context / Motivation
create table if not exists game_context (
  id serial primary key,
  game_id uuid references games(id) on delete cascade,
  team text not null,
  -- Standings
  games_back numeric default 0,
  playoff_position text,
  elimination_scenario boolean default false,
  magic_number integer,
  tank_flag boolean default false,
  -- Schedule
  off_day_tomorrow boolean default false,
  road_trip_game_number integer default 0,
  end_of_road_trip boolean default false,
  crucial_series_tomorrow boolean default false,
  -- Historical
  day_game_record text,
  night_game_record text,
  turf_record text,
  grass_record text,
  vs_venue_record text,
  fetched_at timestamptz default now(),
  unique(game_id, team)
);
create index idx_game_context_game on game_context (game_id);

-- 7. Enhanced Weather
alter table weather add column if not exists dew_point numeric;
alter table weather add column if not exists barometric_pressure numeric;
alter table weather add column if not exists wind_direction_relative text;
alter table weather add column if not exists late_game_temp numeric;
alter table weather add column if not exists late_game_wind_mph numeric;
alter table weather add column if not exists late_game_wind_dir text;
alter table weather add column if not exists stadium_orientation text;

-- 8. Expand best_bets for factor-driven rationale
alter table best_bets add column if not exists top_factors jsonb;
alter table best_bets add column if not exists factor_scores jsonb;
alter table best_bets add column if not exists hitting_score numeric;
alter table best_bets add column if not exists bullpen_score numeric;
alter table best_bets add column if not exists defense_score numeric;
alter table best_bets add column if not exists matchup_score numeric;
alter table best_bets add column if not exists situational_score numeric;
alter table best_bets add column if not exists market_score numeric;
alter table best_bets add column if not exists weather_score numeric;
alter table best_bets add column if not exists pitching_score numeric;

-- 9. Expand starter_matchups with opposing lineup context
alter table starter_matchups add column if not exists bb_per_9 numeric;
alter table starter_matchups add column if not exists hr_per_9 numeric;
alter table starter_matchups add column if not exists gb_rate numeric;
alter table starter_matchups add column if not exists fip numeric;
alter table starter_matchups add column if not exists third_time_thru_ops_allowed numeric;
alter table starter_matchups add column if not exists pitch_count_avg numeric;
