"""EdgeBoard v2.0 Scoring Engine
Enhanced pick generation with 17 data factors.
Only feeds the pick engine - zero UI changes.
"""
import logging
from datetime import date, datetime
from typing import Optional

logger = logging.getLogger("scoring_engine")

# Model v2.0 factor weights (sum to ~1.0)
WEIGHTS = {
    "line_value": 0.15,
    "team_stats": 0.12,
    "starter_matchup": 0.10,
    "public_betting": 0.08,
    "sharp_action": 0.09,
    "reverse_lm": 0.07,
    "h2h_record": 0.05,
    "situational": 0.06,
    "officials": 0.04,
    "weather": 0.05,
    "venue": 0.04,
    "pace": 0.05,
    "rest": 0.05,
    "injuries": 0.05,
}


def safe_get(data, key, default=0):
    """Safely extract a value from a dict or return default."""
    if not data:
        return default
    return data.get(key, default) if isinstance(data, dict) else default


def score_line_value(game, lines_data):
    """Score based on line edge vs closing/consensus."""
    if not lines_data:
        return 0, {"status": "no_data"}
    opening = None
    current = None
    for l in lines_data:
        if l.get("is_opening"):
            opening = l
        current = l
    if not opening or not current:
        return 0, {"status": "incomplete"}
    move = abs((current.get("spread", 0) or 0) - (opening.get("spread", 0) or 0))
    score = min(move * 2, 10)
    return score, {"open": opening.get("spread"), "current": current.get("spread"), "move": move}


def score_team_stats(team_stats):
    """Score based on ATS record, efficiency, streaks."""
    if not team_stats:
        return 0, {"status": "no_data"}
    ats = safe_get(team_stats, "ats_last5", 0)
    off_eff = safe_get(team_stats, "off_efficiency", 0)
    def_eff = safe_get(team_stats, "def_efficiency", 0)
    score = min((ats * 1.5) + (off_eff - def_eff) * 0.5, 10)
    return max(score, 0), {"ats_l5": ats, "off_eff": off_eff, "def_eff": def_eff}


def score_starter_matchup(starter_data):
    """Score pitcher/QB matchup edge."""
    if not starter_data:
        return 0, {"status": "no_data"}
    era = safe_get(starter_data, "season_era", 4.5)
    last5 = safe_get(starter_data, "last5_avg", 0)
    vs_opp = safe_get(starter_data, "vs_opp_avg", 0)
    rest = safe_get(starter_data, "rest_days", 4)
    score = 5
    if era < 3.0:
        score += 2
    elif era > 5.0:
        score -= 2
    if rest >= 5:
        score += 1
    elif rest <= 2:
        score -= 1.5
    return min(max(score, 0), 10), {"era": era, "last5": last5, "vs_opp": vs_opp, "rest": rest}


def score_public_betting(public_data):
    """Score based on fading the public."""
    if not public_data:
        return 0, {"status": "no_data"}
    pub_pct = safe_get(public_data, "spread_public_pct", 50)
    money_pct = safe_get(public_data, "money_pct_spread", 50)
    score = 0
    if pub_pct > 70:
        score = (pub_pct - 50) * 0.2
    if money_pct and pub_pct and abs(pub_pct - money_pct) > 15:
        score += 2
    return min(max(score, 0), 10), {"pub_pct": pub_pct, "money_pct": money_pct}


def score_sharp_action(sharp_data):
    """Score based on sharp money signals."""
    if not sharp_data:
        return 0, {"status": "no_data"}
    conf = safe_get(sharp_data, "confidence", "medium")
    split = safe_get(sharp_data, "ticket_vs_money_split", False)
    score = {"high": 8, "medium": 5, "low": 2}.get(conf, 3)
    if split:
        score += 2
    return min(score, 10), {"confidence": conf, "split": split}


def score_reverse_lm(lm_data):
    """Score reverse line movement."""
    if not lm_data:
        return 0, {"status": "no_data"}
    is_rev = safe_get(lm_data, "is_reverse", False)
    mag = safe_get(lm_data, "magnitude", 0)
    steam = safe_get(lm_data, "steam_move", False)
    score = 0
    if is_rev:
        score = 5 + min(mag * 2, 5)
    if steam:
        score += 2
    return min(score, 10), {"reverse": is_rev, "magnitude": mag, "steam": steam}


def score_h2h(h2h_data):
    """Score head-to-head history."""
    if not h2h_data:
        return 0, {"status": "no_data"}
    games = safe_get(h2h_data, "total_games", 0)
    if games < 3:
        return 0, {"status": "insufficient_sample"}
    win_pct = safe_get(h2h_data, "home_team_win_pct", 50)
    ats = safe_get(h2h_data, "team_a_ats", 0)
    score = abs(win_pct - 50) * 0.15 + min(ats * 0.5, 3)
    return min(score, 10), {"games": games, "win_pct": win_pct, "ats": ats}


def score_situational(angles_data):
    """Score situational angles."""
    if not angles_data:
        return 0, {"status": "no_data"}
    total = 0
    details = []
    for angle in angles_data:
        w = safe_get(angle, "weight", 1.0)
        ats = safe_get(angle, "historical_ats", 50)
        contrib = (ats - 50) * 0.1 * w
        total += contrib
        details.append({"type": angle.get("angle_type"), "ats": ats})
    return min(max(total, 0), 10), {"angles": details}


def score_officials(officials_data):
    """Score umpire/referee tendency."""
    if not officials_data:
        return 0, {"status": "no_data"}
    over_pct = safe_get(officials_data, "over_pct", 50)
    sample = safe_get(officials_data, "sample_games", 0)
    if sample < 10:
        return 0, {"status": "insufficient_sample"}
    score = abs(over_pct - 50) * 0.15
    return min(score, 10), {"over_pct": over_pct, "sample": sample}


def score_weather(weather_data, sport):
    """Score weather impact (outdoor sports only)."""
    if not weather_data or sport in ["NBA", "NHL"]:
        return 0, {"status": "indoor_sport" if sport in ["NBA", "NHL"] else "no_data"}
    wind = safe_get(weather_data, "wind_mph", 0)
    precip = safe_get(weather_data, "precip_pct", 0)
    temp = safe_get(weather_data, "temp_f", 72)
    score = 0
    if wind > 15:
        score += min((wind - 10) * 0.3, 4)
    if precip > 40:
        score += min(precip * 0.05, 3)
    if temp < 30 or temp > 95:
        score += 2
    return min(score, 10), {"wind": wind, "precip": precip, "temp": temp}


def score_venue(venue_data):
    """Score venue-specific factors."""
    if not venue_data:
        return 0, {"status": "no_data"}
    home_pct = safe_get(venue_data, "home_win_pct", 50)
    over_pct = safe_get(venue_data, "over_pct", 50)
    score = abs(home_pct - 50) * 0.12 + abs(over_pct - 50) * 0.08
    return min(score, 10), {"home_pct": home_pct, "over_pct": over_pct}


def score_pace(home_stats, away_stats):
    """Score pace/tempo matchup."""
    if not home_stats or not away_stats:
        return 0, {"status": "no_data"}
    h_pace = safe_get(home_stats, "pace", 0)
    a_pace = safe_get(away_stats, "pace", 0)
    h_total = safe_get(home_stats, "avg_game_total", 0)
    a_total = safe_get(away_stats, "avg_game_total", 0)
    if h_pace == 0 or a_pace == 0:
        return 0, {"status": "no_pace_data"}
    pace_diff = abs(h_pace - a_pace)
    avg_total = (h_total + a_total) / 2
    score = min(pace_diff * 0.5, 5) + min(abs(avg_total - 200) * 0.02, 5)
    return min(score, 10), {"h_pace": h_pace, "a_pace": a_pace, "avg_total": avg_total}


def score_rest(team_stats):
    """Score rest/B2B advantage."""
    if not team_stats:
        return 0, {"status": "no_data"}
    rest = safe_get(team_stats, "rest_days", 2)
    b2b_ats = safe_get(team_stats, "b2b_ats", 0)
    score = 0
    if rest == 0:
        score = -3
    elif rest >= 3:
        score = min(rest * 0.8, 5)
    score += b2b_ats * 0.5
    return min(max(score, 0), 10), {"rest": rest, "b2b_ats": b2b_ats}


def score_injuries(injuries_data):
    """Score injury impact."""
    if not injuries_data:
        return 0, {"status": "no_data"}
    key_out = sum(1 for i in injuries_data if i.get("is_key_player") and i.get("status") == "OUT")
    key_quest = sum(1 for i in injuries_data if i.get("is_key_player") and i.get("status") == "QUESTIONABLE")
    score = key_out * 3 + key_quest * 1
    return min(score, 10), {"key_out": key_out, "key_questionable": key_quest}


def generate_picks(supabase, target_date=None):
    """Main entry point: generate best bets for a date.
    Pulls all enhanced data, scores each game, returns top picks.
    """
    if target_date is None:
        target_date = date.today().isoformat()
    logger.info("Generating picks for %s", target_date)

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


def fetch_game_data(supabase, game_id, home, away, sport):
    """Fetch all enhanced data for a single game."""
    data = {}
    tables = {
        "lines": ("lines", "game_id", game_id),
        "starter_home": ("starter_matchups", "game_id,team", (game_id, home)),
        "starter_away": ("starter_matchups", "game_id,team", (game_id, away)),
        "public": ("public_betting", "game_id", game_id),
        "sharp": ("sharp_action", "game_id", game_id),
        "lm": ("line_movements", "game_id", game_id),
        "officials": ("officials", "game_id", game_id),
        "weather": ("weather", "game_id", game_id),
        "venue": ("venue_stats", None, None),
        "angles": ("situational_angles", "game_id", game_id),
        "injuries": ("injuries", "game_id", game_id),
    }
    for key, (table, fk, val) in tables.items():
        try:
            if fk is None:
                continue
            if "," in fk:
                fields = fk.split(",")
                q = supabase.table(table).select("*")
                for i, f in enumerate(fields):
                    q = q.eq(f, val[i])
                res = q.execute()
            else:
                res = supabase.table(table).select("*").eq(fk, val).execute()
            data[key] = res.data if res.data else None
        except Exception as e:
            logger.warning("fetch %s failed: %s", key, e)
            data[key] = None

    # Fetch team stats
    for label, team in [("home_stats", home), ("away_stats", away)]:
        try:
            res = supabase.table("team_stats").select("*").eq("team_id", team).eq("sport", sport).execute()
            data[label] = res.data[0] if res.data else None
        except Exception:
            data[label] = None

    # Fetch H2H
    try:
        res = supabase.table("h2h_records").select("*").eq("team_a", home).eq("team_b", away).eq("sport", sport).execute()
        data["h2h"] = res.data[0] if res.data else None
    except Exception:
        data["h2h"] = None

    return data


def score_game(game, data, sport):
    """Score a single game across all factors and produce a pick."""
    factors = {}
    missing = []

    # Score each factor
    s, d = score_line_value(game, data.get("lines"))
    factors["line_value"] = {"score": s, "detail": d}
    if s == 0: missing.append("line_value")

    s, d = score_team_stats(data.get("home_stats"))
    factors["team_stats"] = {"score": s, "detail": d}
    if s == 0: missing.append("team_stats")

    s, d = score_starter_matchup(data.get("starter_home"))
    factors["starter_matchup"] = {"score": s, "detail": d}
    if s == 0: missing.append("starter_matchup")

    s, d = score_public_betting(data.get("public")[0] if data.get("public") else None)
    factors["public_betting"] = {"score": s, "detail": d}
    if s == 0: missing.append("public_betting")

    s, d = score_sharp_action(data.get("sharp")[0] if data.get("sharp") else None)
    factors["sharp_action"] = {"score": s, "detail": d}
    if s == 0: missing.append("sharp_action")

    s, d = score_reverse_lm(data.get("lm")[0] if data.get("lm") else None)
    factors["reverse_lm"] = {"score": s, "detail": d}
    if s == 0: missing.append("reverse_lm")

    s, d = score_h2h(data.get("h2h"))
    factors["h2h_record"] = {"score": s, "detail": d}
    if s == 0: missing.append("h2h_record")

    s, d = score_situational(data.get("angles"))
    factors["situational"] = {"score": s, "detail": d}
    if s == 0: missing.append("situational")

    s, d = score_officials(data.get("officials")[0] if data.get("officials") else None)
    factors["officials"] = {"score": s, "detail": d}
    if s == 0: missing.append("officials")

    s, d = score_weather(data.get("weather")[0] if data.get("weather") else None, sport)
    factors["weather"] = {"score": s, "detail": d}
    if s == 0: missing.append("weather")

    s, d = score_venue(data.get("venue"))
    factors["venue"] = {"score": s, "detail": d}
    if s == 0: missing.append("venue")

    s, d = score_pace(data.get("home_stats"), data.get("away_stats"))
    factors["pace"] = {"score": s, "detail": d}
    if s == 0: missing.append("pace")

    s, d = score_rest(data.get("home_stats"))
    factors["rest"] = {"score": s, "detail": d}
    if s == 0: missing.append("rest")

    s, d = score_injuries(data.get("injuries"))
    factors["injuries"] = {"score": s, "detail": d}
    if s == 0: missing.append("injuries")

    # Weighted composite
    raw = sum(factors[k]["score"] * WEIGHTS[k] for k in WEIGHTS)
    available = len(WEIGHTS) - len(missing)
    data_quality = available / len(WEIGHTS) if WEIGHTS else 0
    adjusted = raw / max(data_quality, 0.3)  # boost if lots of data
    confidence = min(adjusted, 10)

    # Determine best bet type and pick
    lines = data.get("lines")
    if lines:
        latest = lines[-1] if isinstance(lines, list) else lines
        spread = latest.get("spread", 0)
        total = latest.get("total", 0)
        ml_home = latest.get("ml_home", -110)
        bet_type = "spread"
        pick = f"{game['home_team']} {spread}"
    else:
        bet_type = "moneyline"
        pick = f"{game['home_team']} ML"
        spread = 0
        ml_home = -110

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
        "model_version": "2.0",
        "sport": sport,
        "home_team": game["home_team"],
        "away_team": game["away_team"],
    }


def upsert_pick(supabase, pick, target_date):
    """Save a pick to best_bets and model_audit tables."""
    import json
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
        "model_version": "2.0",
        "data_quality": pick["data_quality"],
        "sharp_side": pick["factors"].get("sharp_action", {}).get("detail", {}).get("confidence"),
        "reverse_lm": pick["factors"].get("reverse_lm", {}).get("detail", {}).get("reverse", False),
        "public_pct": pick["factors"].get("public_betting", {}).get("detail", {}).get("pub_pct"),
    }
    res = supabase.table("best_bets").insert(bet_data).execute()
    bet_id = res.data[0]["id"] if res.data else None

    if bet_id:
        audit = {
            "bet_id": bet_id,
            "model_version": "2.0",
            "factors": json.dumps({k: v["score"] for k, v in pick["factors"].items()}),
            "raw_score": pick["confidence"],
            "adjusted_score": pick["confidence"],
            "data_completeness": pick["data_quality"],
            "missing_factors": pick["missing_factors"],
        }
        supabase.table("model_audit").insert(audit).execute()


def build_rationale(pick):
    """Auto-generate rationale text from factors."""
    parts = []
    f = pick["factors"]
    if f.get("sharp_action", {}).get("score", 0) > 5:
        parts.append("Sharp money aligned")
    if f.get("reverse_lm", {}).get("detail", {}).get("reverse"):
        parts.append("Reverse line movement detected")
    if f.get("public_betting", {}).get("score", 0) > 5:
        parts.append("Fading heavy public action")
    if f.get("starter_matchup", {}).get("score", 0) > 6:
        parts.append("Strong starter matchup edge")
    if f.get("weather", {}).get("score", 0) > 4:
        parts.append("Weather factor in play")
    if f.get("rest", {}).get("score", 0) > 5:
        parts.append("Rest advantage")
    if f.get("h2h_record", {}).get("score", 0) > 4:
        parts.append("H2H trend supports")
    if not parts:
        parts.append("Model edge based on composite scoring")
    return ". ".join(parts) + "."
