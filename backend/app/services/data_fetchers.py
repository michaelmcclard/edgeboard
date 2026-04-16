"""EdgeBoard v3.0 Data Fetchers
Pulls hitting, baserunning, defense, bullpen, managerial, and game context data.
All fetchers fall back gracefully — never crash the scoring engine.
"""
import logging
from datetime import date
from typing import Optional

logger = logging.getLogger("data_fetchers")

MLB_STATS_BASE = "https://statsapi.mlb.com/api/v1"


def safe_fetch(supabase, table, filters: dict):
    """Generic safe Supabase fetch."""
    try:
        q = supabase.table(table).select("*")
        for k, v in filters.items():
            q = q.eq(k, v)
        res = q.execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.warning("safe_fetch %s failed: %s", table, e)
        return None


def safe_fetch_all(supabase, table, filters: dict):
    try:
        q = supabase.table(table).select("*")
        for k, v in filters.items():
            q = q.eq(k, v)
        res = q.execute()
        return res.data or []
    except Exception as e:
        logger.warning("safe_fetch_all %s failed: %s", table, e)
        return []


def fetch_lineup_stats(supabase, game_id: str, team: str, sport: str) -> dict:
    """Fetch hitting/plate discipline/power analytics for a team lineup.
    Pulls from lineup_stats table (pre-populated by scheduler from MLB Stats API).
    Falls back to team_stats averages if granular data unavailable.
    """
    data = safe_fetch(supabase, "lineup_stats", {"game_id": game_id, "team": team})
    if data:
        return data
    # fallback: pull season team stats
    ts = safe_fetch(supabase, "team_stats", {"team_id": team, "sport": sport})
    if ts:
        return {
            "bb_pct": ts.get("bb_pct", 8.0),
            "chase_rate": ts.get("chase_rate", 28.0),
            "contact_rate": ts.get("contact_rate", 76.0),
            "iso": ts.get("iso", 0.150),
            "barrel_rate": ts.get("barrel_rate", 7.5),
            "hard_hit_rate": ts.get("hard_hit_rate", 36.0),
            "fly_ball_rate": ts.get("fly_ball_rate", 34.0),
            "risp_avg": ts.get("risp_avg", 0.240),
            "risp_ops": ts.get("risp_ops", 0.700),
            "late_inning_ops": ts.get("late_inning_ops", 0.700),
            "leadoff_obp": ts.get("leadoff_obp", 0.330),
            "lineup_ops_1_thru_9": ts.get("off_efficiency", 0.720),
            "platoon_disadvantage_count": 0,
            "lhb_count": 4,
            "rhb_count": 5,
        }
    return {}


def fetch_baserunning_stats(supabase, game_id: str, team: str) -> dict:
    """Speed and baserunning metrics for a team."""
    data = safe_fetch(supabase, "baserunning_stats", {"game_id": game_id, "team": team})
    if data:
        return data
    ts = safe_fetch(supabase, "team_stats", {"team_id": team})
    return {
        "sb_success_rate": ts.get("sb_success_rate", 72.0) if ts else 72.0,
        "sprint_speed_avg": ts.get("sprint_speed_avg", 27.0) if ts else 27.0,
        "extra_bases_taken_pct": ts.get("xbt_pct", 42.0) if ts else 42.0,
        "bsr": ts.get("bsr", 0.0) if ts else 0.0,
        "gidp_rate": ts.get("gidp_rate", 10.0) if ts else 10.0,
    }


def fetch_defensive_stats(supabase, game_id: str, team: str) -> dict:
    """DRS, OAA, positional defense for a team."""
    data = safe_fetch(supabase, "defensive_stats", {"game_id": game_id, "team": team})
    if data:
        return data
    return {"drs_total": 0, "oaa_total": 0, "errors_per_game": 0.7,
            "ss_oaa": 0, "cf_oaa": 0, "corner_of_oaa": 0,
            "catcher_pop_time": 2.0, "catcher_cs_pct": 28.0}


def fetch_bullpen_detail(supabase, game_id: str, team: str) -> dict:
    """Detailed bullpen availability, workload, and splits."""
    data = safe_fetch(supabase, "bullpen_detail", {"game_id": game_id, "team": team})
    if data:
        return data
    # fallback to team_stats bullpen ERA columns
    ts = safe_fetch(supabase, "team_stats", {"team_id": team})
    return {
        "bp_era": ts.get("bullpen_era", 4.20) if ts else 4.20,
        "bp_fip": ts.get("bullpen_fip", 4.30) if ts else 4.30,
        "bp_whip": ts.get("bullpen_whip", 1.30) if ts else 1.30,
        "bp_k_per_9": ts.get("bullpen_k9", 8.5) if ts else 8.5,
        "closer_available": True,
        "closer_blown_save_rate": 0.12,
        "setup_available": True,
        "lhp_available": True,
        "relievers_2plus_days": 0,
        "high_leverage_available": True,
        "bp_era_last_7d": ts.get("bullpen_era", 4.20) if ts else 4.20,
        "uses_opener": False,
    }


def fetch_managerial_tendencies(supabase, team: str, sport: str) -> dict:
    """Manager strategy tendencies."""
    season = str(date.today().year)
    data = safe_fetch(supabase, "managerial_tendencies",
                      {"team": team, "sport": sport, "season": season})
    if data:
        return data
    return {
        "sac_bunt_rate": 3.0,
        "quick_hook_pct": 35.0,
        "one_run_game_win_pct": 0.50,
        "post_loss_win_pct": 0.48,
        "closer_available": True,
    }


def fetch_game_context(supabase, game_id: str, team: str) -> dict:
    """Motivation, schedule, standings context for a team in a game."""
    data = safe_fetch(supabase, "game_context", {"game_id": game_id, "team": team})
    if data:
        return data
    sc = safe_fetch(supabase, "schedule_context", {"game_id": game_id, "team": team})
    return {
        "games_back": 5.0,
        "elimination_scenario": False,
        "tank_flag": False,
        "off_day_tomorrow": False,
        "road_trip_game_number": sc.get("travel_miles", 0) // 500 if sc else 0,
        "end_of_road_trip": sc.get("is_sandwich", False) if sc else False,
        "is_letdown": sc.get("is_letdown", False) if sc else False,
        "is_revenge": sc.get("is_revenge", False) if sc else False,
    }


def fetch_enhanced_weather(supabase, game_id: str) -> dict:
    """Enhanced weather with dew point, pressure, stadium wind direction."""
    data = safe_fetch(supabase, "weather", {"game_id": game_id})
    if data:
        return data
    return {}


def fetch_all_v3(supabase, game_id: str, home: str, away: str,
                 sport: str) -> dict:
    """Master fetcher: pulls all v3.0 data for a single game.
    Returns a dict keyed for direct consumption by scoring_engine v3.0.
    """
    d = {}
    try:
        # --- existing v2 tables ---
        d["lines"] = safe_fetch_all(supabase, "lines", {"game_id": game_id})
        d["starter_home"] = safe_fetch(supabase, "starter_matchups",
                                        {"game_id": game_id, "team": home})
        d["starter_away"] = safe_fetch(supabase, "starter_matchups",
                                        {"game_id": game_id, "team": away})
        d["public"] = safe_fetch(supabase, "public_betting", {"game_id": game_id})
        d["sharp"] = safe_fetch(supabase, "sharp_action", {"game_id": game_id})
        d["lm"] = safe_fetch(supabase, "line_movements", {"game_id": game_id})
        d["officials"] = safe_fetch(supabase, "officials", {"game_id": game_id})
        d["h2h"] = safe_fetch(supabase, "h2h_records",
                              {"team_a": home, "team_b": away, "sport": sport})
        d["angles"] = safe_fetch_all(supabase, "situational_angles", {"game_id": game_id})
        d["injuries"] = safe_fetch_all(supabase, "injuries", {"game_id": game_id})
        d["venue"] = safe_fetch(supabase, "venue_stats", {})
        d["home_stats"] = safe_fetch(supabase, "team_stats",
                                      {"team_id": home, "sport": sport})
        d["away_stats"] = safe_fetch(supabase, "team_stats",
                                      {"team_id": away, "sport": sport})
        # --- new v3 data ---
        d["home_lineup"] = fetch_lineup_stats(supabase, game_id, home, sport)
        d["away_lineup"] = fetch_lineup_stats(supabase, game_id, away, sport)
        d["home_baserunning"] = fetch_baserunning_stats(supabase, game_id, home)
        d["away_baserunning"] = fetch_baserunning_stats(supabase, game_id, away)
        d["home_defense"] = fetch_defensive_stats(supabase, game_id, home)
        d["away_defense"] = fetch_defensive_stats(supabase, game_id, away)
        d["home_bullpen"] = fetch_bullpen_detail(supabase, game_id, home)
        d["away_bullpen"] = fetch_bullpen_detail(supabase, game_id, away)
        d["home_mgr"] = fetch_managerial_tendencies(supabase, home, sport)
        d["away_mgr"] = fetch_managerial_tendencies(supabase, away, sport)
        d["home_context"] = fetch_game_context(supabase, game_id, home)
        d["away_context"] = fetch_game_context(supabase, game_id, away)
        d["weather"] = fetch_enhanced_weather(supabase, game_id)
    except Exception as e:
        logger.error("fetch_all_v3 error for game %s: %s", game_id, e)
    return d
