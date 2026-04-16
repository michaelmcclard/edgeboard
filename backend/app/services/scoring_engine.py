"""EdgeBoard v3.0 Scoring Engine
MLB-focused multi-factor model with balanced weighting.
Pitching is one piece - hitting, bullpen, defense, situational,
market signals, and weather all contribute equally where data supports it.
"""
import logging
import json
from datetime import date, datetime
from typing import Optional

logger = logging.getLogger("scoring_engine")

# --- v3.0 Factor Weights (sum to 1.0) ---
WEIGHTS = {
    "pitching":      0.25,
    "hitting":       0.20,
    "bullpen":       0.15,
    "matchup":       0.15,
    "situational":   0.10,
    "market":        0.10,
    "weather":       0.05,
    "defense":       0.05,
}

# League average baselines for normalization
LEAGUE_AVG = {
    "barrel_rate": 7.5, "hard_hit_rate": 36.0, "chase_rate": 28.0,
    "bb_pct": 8.0, "iso": 0.150, "risp_ops": 0.700, "fly_ball_rate": 34.0,
    "bp_era": 4.20, "sb_success_rate": 72.0, "bsr": 0.0,
    "drs_total": 0, "oaa_total": 0,
}

def sg(d, *keys, default=0):
    """Safe nested get."""
    if not d:
        return default
    v = d
    for k in keys:
        if not isinstance(v, dict):
            return default
        v = v.get(k, default)
    return v if v is not None else default


def clamp(val, lo=0, hi=10):
    return max(lo, min(hi, val))


# ============================================================
#  SCORING FUNCTIONS — one per weight bucket
# ============================================================

def score_pitching(data):
    """25% — Starting pitcher quality: ERA, WHIP, K/9, FIP,
    recent form, third-time-through-order splits."""
    sp = data.get("starter") or {}
    if not sp:
        return 0, {"status": "no_data"}
    era   = sg(sp, "era", default=4.50)
    fip   = sg(sp, "fip", default=4.50)
    whip  = sg(sp, "whip", default=1.30)
    k9    = sg(sp, "k_per_9", default=8.0)
    bb9   = sg(sp, "bb_per_9", default=3.0)
    l3era = sg(sp, "last3_era", default=era)
    tto   = sg(sp, "third_time_ops", default=0.750)
    score = 5.0
    # ERA
    if era < 3.00: score += 2.0
    elif era < 3.50: score += 1.0
    elif era > 5.00: score -= 2.0
    # FIP divergence from ERA
    if fip < era - 0.40: score += 0.5
    elif fip > era + 0.40: score -= 0.5
    # WHIP
    if whip < 1.10: score += 1.0
    elif whip > 1.40: score -= 1.0
    # Strikeouts
    if k9 > 10: score += 0.5
    # Walks
    if bb9 < 2.5: score += 0.5
    elif bb9 > 4.0: score -= 0.5
    # Recent form
    if l3era < era - 0.50: score += 1.0
    elif l3era > era + 1.0: score -= 1.0
    # Third time through order vulnerability
    if tto > 0.850: score -= 1.0
    elif tto < 0.650: score += 0.5
    return clamp(score), {
        "era": era, "fip": fip, "whip": whip, "k9": k9,
        "bb9": bb9, "last3_era": l3era, "tto_ops": tto,
    }

def score_hitting(data):
    """20% — Lineup quality: plate discipline, power metrics,
    situational hitting, lineup construction."""
    lineup = data.get("lineup") or {}
    if not lineup:
        return 0, {"status": "no_data"}
    # Plate discipline
    bb_pct  = sg(lineup, "bb_pct", default=8.0)
    chase   = sg(lineup, "chase_rate", default=28.0)
    contact = sg(lineup, "contact_rate", default=78.0)
    k_2s    = sg(lineup, "k_rate_2strikes", default=30.0)
    # Power
    iso     = sg(lineup, "iso", default=0.150)
    barrel  = sg(lineup, "barrel_rate", default=7.5)
    hard_hit = sg(lineup, "hard_hit_rate", default=36.0)
    fb_rate = sg(lineup, "fly_ball_rate", default=34.0)
    # Situational
    risp_ops = sg(lineup, "risp_ops", default=0.700)
    two_out_avg = sg(lineup, "two_out_avg", default=0.240)
    late_ops = sg(lineup, "late_inning_ops", default=0.700)
    # Construction
    full_ops = sg(lineup, "lineup_ops_1_thru_9", default=0.700)
    lo_obp   = sg(lineup, "leadoff_obp", default=0.320)
    score = 5.0
    # Discipline sub-score
    if bb_pct > 9.5: score += 0.5
    elif bb_pct < 6.5: score -= 0.5
    if chase < 25.0: score += 0.5
    elif chase > 32.0: score -= 0.5
    if contact > 80.0: score += 0.3
    # Power sub-score
    if barrel > 9.0: score += 0.7
    elif barrel < 6.0: score -= 0.5
    if hard_hit > 40.0: score += 0.5
    elif hard_hit < 32.0: score -= 0.5
    if iso > 0.180: score += 0.5
    elif iso < 0.120: score -= 0.5
    # Situational sub-score
    if risp_ops > 0.780: score += 0.5
    elif risp_ops < 0.620: score -= 0.5
    if late_ops > 0.780: score += 0.3
    # Construction sub-score
    if full_ops > 0.760: score += 0.5
    elif full_ops < 0.650: score -= 0.5
    if lo_obp > 0.370: score += 0.3
    return clamp(score), {
        "bb_pct": bb_pct, "chase": chase, "barrel": barrel,
        "hard_hit": hard_hit, "iso": iso, "risp_ops": risp_ops,
        "full_ops": full_ops, "leadoff_obp": lo_obp,
    }

def score_bullpen(data):
    """15% — Bullpen depth, reliever workload, closer availability,
    high-leverage arms, LHP/RHP matchup depth."""
    bp = data.get("bullpen") or {}
    if not bp:
        return 0, {"status": "no_data"}
    bp_era  = sg(bp, "era", default=4.20)
    bp_fip  = sg(bp, "fip", default=4.20)
    bp_whip = sg(bp, "whip", default=1.30)
    bp_k9   = sg(bp, "k_per_9", default=9.0)
    # Workload
    tired   = sg(bp, "relievers_back_to_back", default=0)
    hlev_avail = sg(bp, "high_leverage_available", default=True)
    closer_avail = sg(bp, "closer_available", default=True)
    blown_sv = sg(bp, "blown_save_rate", default=15.0)
    # Depth
    lhp_avail = sg(bp, "lhp_reliever_available", default=True)
    l7d_era   = sg(bp, "last_7d_era", default=bp_era)
    score = 5.0
    if bp_era < 3.50: score += 1.5
    elif bp_era > 5.00: score -= 1.5
    if bp_fip < bp_era - 0.30: score += 0.5
    if bp_whip < 1.15: score += 0.5
    elif bp_whip > 1.45: score -= 0.5
    if bp_k9 > 10: score += 0.5
    if tired >= 3: score -= 1.0
    elif tired >= 2: score -= 0.5
    if not hlev_avail: score -= 1.0
    if not closer_avail: score -= 0.5
    if blown_sv > 25: score -= 0.5
    if not lhp_avail: score -= 0.3
    if l7d_era > bp_era + 1.5: score -= 0.5
    elif l7d_era < bp_era - 1.0: score += 0.5
    return clamp(score), {
        "bp_era": bp_era, "bp_fip": bp_fip, "bp_whip": bp_whip,
        "tired_arms": tired, "closer_avail": closer_avail,
        "hlev_avail": hlev_avail, "l7d_era": l7d_era,
    }

def score_matchup(data):
    """15% — Platoon splits, lineup vs pitcher handedness,
    baserunning, catcher pop time, speed factors."""
    mu = data.get("matchup") or {}
    lineup = data.get("lineup") or {}
    sp = data.get("starter") or {}
    if not mu and not lineup:
        return 0, {"status": "no_data"}
    # Platoon
    platoon_disadv = sg(mu, "platoon_disadvantage_count", default=0)
    lineup_vs_hand = sg(mu, "lineup_ops_vs_hand", default=0.720)
    # Baserunning / speed
    sb_rate  = sg(mu, "sb_success_rate", default=72.0)
    sprint   = sg(mu, "avg_sprint_speed", default=27.0)
    bsr      = sg(mu, "baserunning_runs", default=0.0)
    gidp_rate = sg(mu, "gidp_rate", default=10.0)
    # Catcher
    catcher_pop = sg(mu, "catcher_pop_time", default=2.00)
    catcher_sb_pct = sg(mu, "catcher_cs_pct", default=27.0)
    # Third time through
    tto_lineup = sg(lineup, "third_time_ops_vs_starter", default=0.750)
    score = 5.0
    # Platoon
    if platoon_disadv >= 6: score -= 1.5
    elif platoon_disadv >= 4: score -= 0.5
    if lineup_vs_hand > 0.790: score += 1.0
    elif lineup_vs_hand < 0.660: score -= 1.0
    # Speed
    if sprint > 28.0: score += 0.5
    if sb_rate > 80.0: score += 0.5
    elif sb_rate < 65.0: score -= 0.3
    if bsr > 2.0: score += 0.5
    elif bsr < -2.0: score -= 0.5
    if gidp_rate > 14.0: score -= 0.3
    # Catcher defense vs running game
    if catcher_pop < 1.90: score -= 0.3
    elif catcher_pop > 2.10: score += 0.3
    # Third time through
    if tto_lineup > 0.830: score += 0.5
    return clamp(score), {
        "platoon_disadv": platoon_disadv,
        "lineup_vs_hand": lineup_vs_hand,
        "sprint_speed": sprint, "sb_rate": sb_rate, "bsr": bsr,
        "catcher_pop": catcher_pop,
    }

def score_situational(data):
    """10% — Travel, rest, schedule context, motivation,
    manager tendencies, day/night, turf, standings."""
    sit = data.get("situational") or {}
    if not sit:
        return 0, {"status": "no_data"}
    rest_days = sg(sit, "rest_days", default=1)
    road_games = sg(sit, "consecutive_road_games", default=0)
    is_day = sg(sit, "is_day_game", default=False)
    day_record = sg(sit, "day_game_win_pct", default=0.500)
    night_record = sg(sit, "night_game_win_pct", default=0.500)
    off_day_tmrw = sg(sit, "off_day_tomorrow", default=False)
    playoff_race = sg(sit, "playoff_contention", default=True)
    elim_flag = sg(sit, "elimination_scenario", default=False)
    tank_flag = sg(sit, "tank_flag", default=False)
    mgr_1run = sg(sit, "manager_one_run_record", default=0.500)
    venue_hist = sg(sit, "venue_historical_pct", default=0.500)
    score = 5.0
    # Rest
    if rest_days == 0: score -= 1.0
    elif rest_days >= 3: score += 0.5
    # Road fatigue
    if road_games >= 7: score -= 1.0
    elif road_games >= 5: score -= 0.5
    # Day/night splits
    rec = day_record if is_day else night_record
    if rec > 0.580: score += 0.5
    elif rec < 0.420: score -= 0.5
    # Off day tomorrow -> team may use more pen
    if off_day_tmrw: score += 0.3
    # Motivation
    if not playoff_race or tank_flag: score -= 1.5
    if elim_flag: score += 0.5
    # Manager tendencies in 1-run games
    if mgr_1run > 0.560: score += 0.3
    elif mgr_1run < 0.440: score -= 0.3
    # Venue historical
    if venue_hist > 0.580: score += 0.5
    elif venue_hist < 0.420: score -= 0.5
    return clamp(score), {
        "rest_days": rest_days, "road_games": road_games,
        "playoff_race": playoff_race, "tank_flag": tank_flag,
        "venue_hist": venue_hist, "mgr_1run": mgr_1run,
    }

def score_market(data):
    """10% — Reverse line movement, sharp money, public betting,
    Pinnacle discrepancy, steam moves."""
    mkt = data.get("market") or {}
    if not mkt:
        return 0, {"status": "no_data"}
    rlm = sg(mkt, "reverse_line_movement", default=False)
    rlm_mag = sg(mkt, "rlm_magnitude", default=0)
    sharp = sg(mkt, "sharp_confidence", default="medium")
    pub_pct = sg(mkt, "public_spread_pct", default=50)
    money_pct = sg(mkt, "money_pct", default=50)
    steam = sg(mkt, "steam_move", default=False)
    pin_disc = sg(mkt, "pinnacle_discrepancy", default=0)
    score = 5.0
    # Reverse line movement
    if rlm:
        score += 1.0 + min(rlm_mag * 0.5, 1.5)
    # Sharp money
    sharp_map = {"high": 1.5, "medium": 0, "low": -0.5}
    score += sharp_map.get(sharp, 0)
    # Fade heavy public
    if pub_pct > 75: score += 1.0
    elif pub_pct > 65: score += 0.5
    # Money vs ticket split
    split = abs(pub_pct - money_pct) if pub_pct and money_pct else 0
    if split > 20: score += 0.5
    # Steam
    if steam: score += 0.5
    # Pinnacle edge
    if pin_disc > 3: score += 0.5
    elif pin_disc < -3: score -= 0.5
    return clamp(score), {
        "rlm": rlm, "rlm_mag": rlm_mag, "sharp": sharp,
        "pub_pct": pub_pct, "money_pct": money_pct,
        "steam": steam, "pin_disc": pin_disc,
    }

def score_weather(data):
    """5% — Wind, dew point, barometric pressure, temp,
    rain probability, stadium-specific wind direction."""
    wx = data.get("weather") or {}
    sport = data.get("sport", "MLB")
    if not wx or sport in ["NBA", "NHL"]:
        return 0, {"status": "indoor_or_no_data"}
    wind = sg(wx, "wind_mph", default=5)
    wind_dir = sg(wx, "wind_direction_relative", default="cross")
    temp = sg(wx, "temp_f", default=72)
    precip = sg(wx, "precip_pct", default=0)
    dewpoint = sg(wx, "dew_point", default=55)
    pressure = sg(wx, "barometric_pressure", default=29.92)
    score = 5.0
    # Wind
    if wind > 15:
        score += 1.0 if wind_dir == "out" else -0.5
    # Temperature extremes
    if temp > 95 or temp < 40: score += 0.5
    # Rain risk
    if precip > 50: score += 0.5
    # Dew point (high humidity affects grip)
    if dewpoint > 70: score += 0.3
    # Low pressure = ball carries
    if pressure < 29.80: score += 0.3
    elif pressure > 30.10: score -= 0.2
    return clamp(score), {
        "wind": wind, "wind_dir": wind_dir, "temp": temp,
        "precip": precip, "dewpoint": dewpoint, "pressure": pressure,
    }


def score_defense(data):
    """5% — DRS, OAA, positional defense, errors, OF arms."""
    dfn = data.get("defense") or {}
    if not dfn:
        return 0, {"status": "no_data"}
    drs  = sg(dfn, "drs_total", default=0)
    oaa  = sg(dfn, "oaa_total", default=0)
    errors = sg(dfn, "errors_per_game", default=0.50)
    of_arm = sg(dfn, "of_arm_strength", default=50)
    ss_oaa = sg(dfn, "ss_oaa", default=0)
    cf_oaa = sg(dfn, "cf_oaa", default=0)
    score = 5.0
    # DRS
    if drs > 15: score += 1.0
    elif drs < -15: score -= 1.0
    # OAA
    if oaa > 10: score += 1.0
    elif oaa < -10: score -= 1.0
    # Errors
    if errors > 0.80: score -= 0.5
    elif errors < 0.35: score += 0.3
    # Key positions
    if ss_oaa < -5: score -= 0.5
    if cf_oaa < -5: score -= 0.5
    # OF arm strength
    if of_arm > 70: score += 0.3
    return clamp(score), {
        "drs": drs, "oaa": oaa, "errors": errors,
        "ss_oaa": ss_oaa, "cf_oaa": cf_oaa,
    }


# ============================================================
#  COMPOSITE SCORING
# ============================================================

SCORE_FNS = {
    "pitching":    score_pitching,
    "hitting":     score_hitting,
    "bullpen":     score_bullpen,
    "matchup":     score_matchup,
    "situational": score_situational,
    "market":      score_market,
    "weather":     score_weather,
    "defense":     score_defense,
}


def score_game(game, data, sport):
    """Score a single game across all 8 factor buckets.
    No single factor can carry a pick alone — confidence
    reflects agreement or disagreement across dimensions."""
    factors = {}
    missing = []
    data["sport"] = sport
    for key, fn in SCORE_FNS.items():
        try:
            s, d = fn(data)
        except Exception as e:
            logger.warning("score_%s failed: %s", key, e)
            s, d = 0, {"status": "error", "msg": str(e)}
        factors[key] = {"score": s, "detail": d}
        if s == 0:
            missing.append(key)
    # Weighted composite
    raw = sum(factors[k]["score"] * WEIGHTS[k] for k in WEIGHTS)
    available = len(WEIGHTS) - len(missing)
    data_quality = available / len(WEIGHTS) if WEIGHTS else 0
    # Scale up if lots of data, but cap at 10
    adjusted = raw / max(data_quality, 0.3)
    # Agreement penalty: if top and bottom factor differ by >6,
    # factors disagree and confidence should drop
    scores_list = [factors[k]["score"] for k in WEIGHTS if k not in missing]
    if len(scores_list) >= 3:
        spread = max(scores_list) - min(scores_list)
        if spread > 6:
            adjusted *= 0.85
    confidence = min(adjusted, 10)
    # Determine pick details from lines data
    lines = data.get("lines")
    if lines:
        latest = lines[-1] if isinstance(lines, list) else lines
        spread = latest.get("spread", 0) if isinstance(latest, dict) else 0
        bet_type = "spread"
        pick = f"{game['home_team']} {spread}"
    else:
        bet_type = "moneyline"
        pick = f"{game['home_team']} ML"
        spread = 0
    edge = confidence - 5
    implied = 1 / (1 + 10 ** (-edge / 4)) if edge else 0.5
    return {
        "game_id": game["id"],
        "bet_type": bet_type,
        "pick": pick,
        "confidence": round(confidence, 1),
        "edge_pct": round(edge, 1),
        "ev_pct": round(edge * 0.8, 1),
        "model_prob": round(implied, 2),
        "implied_prob": round(implied - 0.05, 2),
        "factors": factors,
        "missing_factors": missing,
        "data_quality": round(data_quality, 2),
        "model_version": "3.0",
        "sport": sport,
        "home_team": game["home_team"],
        "away_team": game["away_team"],
    }


# ============================================================
#  DATA FETCHING
# ============================================================

def fetch_game_data(supabase, game_id, home, away, sport):
    """Fetch all v3.0 data buckets for a single game."""
    data = {}
    queries = {
        "lines": ("lines", "game_id", game_id),
        "starter": ("starter_matchups", "game_id", game_id),
        "lineup": ("lineup_stats", "game_id", game_id),
        "bullpen": ("bullpen_stats", "game_id", game_id),
        "matchup": ("matchup_factors", "game_id", game_id),
        "situational": ("situational_factors", "game_id", game_id),
        "market": ("market_signals", "game_id", game_id),
        "weather": ("weather", "game_id", game_id),
        "defense": ("defense_stats", "game_id", game_id),
    }
    for key, (table, fk, val) in queries.items():
        try:
            res = supabase.table(table).select("*").eq(fk, val).execute()
            rows = res.data if res.data else None
            if rows:
                data[key] = rows[0] if len(rows) == 1 else rows
            else:
                data[key] = None
        except Exception as e:
            logger.warning("fetch %s failed: %s", key, e)
            data[key] = None
    return data


def generate_picks(supabase, target_date=None):
    """Main entry point: generate best bets for a date."""
    if target_date is None:
        target_date = date.today().isoformat()
    logger.info("Generating v3.0 picks for %s", target_date)
    try:
        games_res = supabase.table("games").select("*").eq("date", target_date).execute()
        games = games_res.data if games_res.data else []
    except Exception as e:
        logger.error("Failed to fetch games: %s", e)
        return []
    if not games:
        logger.info("No games found for %s", target_date)
        return []
    all_picks = []
    for game in games:
        gid = game["id"]
        sport = game["sport"]
        home = game["home_team"]
        away = game["away_team"]
        try:
            data = fetch_game_data(supabase, gid, home, away, sport)
            pick = score_game(game, data, sport)
            if pick and pick["confidence"] >= 5.0:
                all_picks.append(pick)
        except Exception as e:
            logger.error("Error scoring game %s: %s", gid, e)
            continue
    all_picks.sort(key=lambda x: x["confidence"], reverse=True)
    top_picks = all_picks[:10]
    for pick in top_picks:
        try:
            upsert_pick(supabase, pick, target_date)
        except Exception as e:
            logger.error("Failed to upsert pick: %s", e)
    logger.info("Generated %d picks, saved top %d", len(all_picks), len(top_picks))
    return top_picks


def upsert_pick(supabase, pick, target_date):
    """Save a pick to best_bets and model_audit tables."""
    bet_data = {
        "date": target_date,
        "game_id": pick["game_id"],
        "bet_type": pick["bet_type"],
        "pick": pick["pick"],
        "confidence": pick["confidence"],
        "edge_pct": pick["edge_pct"],
        "ev_pct": pick["ev_pct"],
        "model_prob": pick["model_prob"],
        "implied_prob": pick["implied_prob"],
        "rationale": build_rationale(pick),
        "model_version": "3.0",
        "data_quality": pick["data_quality"],
        "sharp_side": sg(pick, "factors", "market", "detail", "sharp"),
        "reverse_lm": sg(pick, "factors", "market", "detail", "rlm"),
        "public_pct": sg(pick, "factors", "market", "detail", "pub_pct"),
    }
    res = supabase.table("best_bets").insert(bet_data).execute()
    bet_id = res.data[0]["id"] if res.data else None
    if bet_id:
        audit = {
            "bet_id": bet_id,
            "model_version": "3.0",
            "factors": json.dumps({k: v["score"] for k, v in pick["factors"].items()}),
            "raw_score": pick["confidence"],
            "adjusted_score": pick["confidence"],
            "data_completeness": pick["data_quality"],
            "missing_factors": pick["missing_factors"],
        }
        supabase.table("model_audit").insert(audit).execute()


def build_rationale(pick):
    """Auto-generate rationale referencing the actual top 3 factors
    that drove this pick's confidence score."""
    f = pick["factors"]
    # Build list of (factor_name, score, detail_dict)
    scored = []
    for name, info in f.items():
        s = info.get("score", 0)
        if s > 0:
            scored.append((name, s, info.get("detail", {})))
    # Sort by score descending, take top 3
    scored.sort(key=lambda x: x[1], reverse=True)
    top3 = scored[:3]
    parts = []
    label_map = {
        "pitching": _pitching_blurb,
        "hitting": _hitting_blurb,
        "bullpen": _bullpen_blurb,
        "matchup": _matchup_blurb,
        "situational": _situational_blurb,
        "market": _market_blurb,
        "weather": _weather_blurb,
        "defense": _defense_blurb,
    }
    for name, s, detail in top3:
        fn = label_map.get(name)
        if fn:
            parts.append(fn(s, detail))
    if not parts:
        parts.append("Model edge based on composite scoring across all factors.")
    return " ".join(parts)


# --- Rationale blurb helpers ---

def _pitching_blurb(s, d):
    era = d.get("era", "?")
    if s >= 7:
        return f"Dominant starter ({era} ERA) anchors this pick."
    return f"Starter quality ({era} ERA) is a contributing factor."

def _hitting_blurb(s, d):
    barrel = d.get("barrel", d.get("barrel_rate", "?"))
    ops = d.get("full_ops", "?")
    if s >= 7:
        return f"Elite lineup ({ops} OPS, {barrel}% barrel rate) drives confidence."
    return f"Offensive profile ({ops} OPS) supports the edge."

def _bullpen_blurb(s, d):
    era = d.get("bp_era", "?")
    if s >= 7:
        return f"Shutdown bullpen ({era} ERA) provides late-game insurance."
    return f"Bullpen depth ({era} ERA) adds value."

def _matchup_blurb(s, d):
    plat = d.get("platoon_disadv", 0)
    ops_h = d.get("lineup_vs_hand", "?")
    if plat >= 5:
        return f"Significant platoon advantage ({ops_h} OPS vs hand)."
    bsr = d.get("bsr", 0)
    if bsr > 1:
        return f"Baserunning edge (BSR {bsr}) creates extra value."
    return f"Matchup specifics ({ops_h} OPS vs hand) lean favorable."

def _situational_blurb(s, d):
    rest = d.get("rest_days", "?")
    road = d.get("road_games", 0)
    if road >= 7:
        return f"Opponent fatigued (game {road} of road trip)."
    if d.get("tank_flag"):
        return "Opponent out of contention with no motivation."
    return f"Schedule spot ({rest}d rest) favors this side."

def _market_blurb(s, d):
    parts = []
    if d.get("rlm"):
        parts.append("reverse line movement")
    if d.get("sharp") == "high":
        parts.append("sharp money aligned")
    if d.get("pub_pct", 50) > 70:
        parts.append(f"fading {d['pub_pct']}% public")
    if d.get("steam"):
        parts.append("steam move detected")
    if parts:
        return "Market signals: " + ", ".join(parts) + "."
    return "Market indicators lean favorable."

def _weather_blurb(s, d):
    wind = d.get("wind", 0)
    wind_dir = d.get("wind_dir", "")
    if wind > 15 and wind_dir == "out":
        return f"Wind blowing out at {wind} mph favors the over."
    if d.get("pressure", 30) < 29.80:
        return "Low barometric pressure means the ball carries."
    return "Weather conditions are a minor factor."

def _defense_blurb(s, d):
    oaa = d.get("oaa", 0)
    drs = d.get("drs", 0)
    if oaa > 10 or drs > 15:
        return f"Elite defense (OAA {oaa}, DRS {drs}) limits damage."
    if oaa < -10 or drs < -15:
        return f"Poor defense (OAA {oaa}, DRS {drs}) creates vulnerability."
    return f"Defensive metrics (OAA {oaa}) are a contributing factor."
