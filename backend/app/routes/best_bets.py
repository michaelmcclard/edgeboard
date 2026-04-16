from fastapi import APIRouter
from datetime import date
from app.services.rationale_generator import build_rationale

router = APIRouter()

# Mock bets include structured factors so build_rationale can call Anthropic dynamically
MOCK_BETS_RAW = [
    {
        "id": "bb1",
        "sport": "MLB",
        "game_time": "2026-04-16T16:35:00Z",
        "home_team": "Pirates",
        "away_team": "Nationals",
        "bet_type": "spread",
        "pick": "Pirates -1.5 (+145)",
        "confidence": 9.1,
        "edge_pct": 7.2,
        "ev_pct": 5.8,
        "weather_flag": None,
        "injury_flag": None,
        "line_move": "up",
        "best_book": "DraftKings",
        "model_prob": 0.66,
        "implied_prob": 0.58,
        "factors": {
            "hitting": {"score": 8.9, "detail": {"full_ops": 0.782, "barrel": 9.1, "hard_hit": 41.2, "iso": 0.198, "risp_ops": 0.801}},
            "market": {"score": 8.4, "detail": {"rlm": True, "rlm_mag": 2, "sharp": "high", "pub_pct": 38, "money_pct": 62, "steam": False}},
            "bullpen": {"score": 7.6, "detail": {"bp_era": 3.41, "bp_fip": 3.55, "closer_avail": True, "tired_arms": 0, "l7d_era": 3.18}},
        },
    },
    {
        "id": "bb2",
        "sport": "MLB",
        "game_time": "2026-04-16T16:40:00Z",
        "home_team": "Reds",
        "away_team": "Giants",
        "bet_type": "moneyline",
        "pick": "Reds ML (-131)",
        "confidence": 8.4,
        "edge_pct": 5.8,
        "ev_pct": 4.5,
        "weather_flag": None,
        "injury_flag": None,
        "line_move": "up",
        "best_book": "FanDuel",
        "model_prob": 0.61,
        "implied_prob": 0.57,
        "factors": {
            "pitching": {"score": 8.1, "detail": {"era": 2.87, "fip": 3.02, "whip": 1.08, "k9": 10.4, "last3_era": 2.51}},
            "hitting": {"score": 7.5, "detail": {"full_ops": 0.751, "barrel": 8.3, "hard_hit": 41.2, "iso": 0.171, "risp_ops": 0.776}},
            "defense": {"score": 7.1, "detail": {"oaa": 8, "drs": 11, "errors": 0.31}},
        },
    },
    {
        "id": "bb3",
        "sport": "MLB",
        "game_time": "2026-04-16T19:05:00Z",
        "home_team": "Yankees",
        "away_team": "Angels",
        "bet_type": "spread",
        "pick": "Yankees -1.5 (+126)",
        "confidence": 8.8,
        "edge_pct": 6.5,
        "ev_pct": 5.2,
        "weather_flag": None,
        "injury_flag": "Angels rotation depleted",
        "line_move": "up",
        "best_book": "BetMGM",
        "model_prob": 0.64,
        "implied_prob": 0.56,
        "factors": {
            "matchup": {"score": 8.7, "detail": {"lineup_vs_hand": 0.801, "platoon_disadv": 2, "sprint_speed": 27.8, "bsr": 2.1}},
            "pitching": {"score": 8.2, "detail": {"era": 3.11, "fip": 2.98, "whip": 1.04, "k9": 11.2, "last3_era": 2.74}},
            "market": {"score": 7.8, "detail": {"rlm": False, "rlm_mag": 0, "sharp": "high", "pub_pct": 72, "money_pct": 58, "steam": True}},
        },
    },
    {
        "id": "bb4",
        "sport": "MLB",
        "game_time": "2026-04-16T19:10:00Z",
        "home_team": "Guardians",
        "away_team": "Orioles",
        "bet_type": "moneyline",
        "pick": "Guardians ML (-140)",
        "confidence": 7.6,
        "edge_pct": 4.4,
        "ev_pct": 3.5,
        "weather_flag": None,
        "injury_flag": None,
        "line_move": "flat",
        "best_book": "Caesars",
        "model_prob": 0.59,
        "implied_prob": 0.54,
        "factors": {
            "bullpen": {"score": 8.5, "detail": {"bp_era": 3.18, "bp_fip": 3.24, "closer_avail": True, "tired_arms": 1, "l7d_era": 2.95}},
            "matchup": {"score": 7.3, "detail": {"lineup_vs_hand": 0.743, "platoon_disadv": 3, "sprint_speed": 28.2, "bsr": 3.2}},
            "pitching": {"score": 6.9, "detail": {"era": 3.45, "fip": 3.38, "whip": 1.17, "k9": 9.1, "last3_era": 3.21}},
        },
    },
    {
        "id": "bb5",
        "sport": "MLB",
        "game_time": "2026-04-16T19:05:00Z",
        "home_team": "White Sox",
        "away_team": "Rays",
        "bet_type": "total",
        "pick": "Under 8.5 (-115)",
        "confidence": 7.3,
        "edge_pct": 3.9,
        "ev_pct": 3.1,
        "weather_flag": "Wind 18mph crosswind",
        "injury_flag": None,
        "line_move": "down",
        "best_book": "DraftKings",
        "model_prob": 0.57,
        "implied_prob": 0.53,
        "factors": {
            "pitching": {"score": 7.8, "detail": {"era": 3.21, "fip": 3.15, "whip": 1.19, "k9": 8.7, "last3_era": 3.05}},
            "weather": {"score": 7.2, "detail": {"wind": 18, "wind_dir": "crosswind", "temp": 61, "precip": 12}},
            "defense": {"score": 4.1, "detail": {"oaa": -8, "drs": -12, "errors": 0.72}},
        },
    },
]


def _build_mock_bets():
    """Generate mock bets with dynamic Anthropic rationales."""
    result = []
    for bet in MOCK_BETS_RAW:
        b = dict(bet)
        b["rationale"] = build_rationale(b)
        # Remove factors from response payload
        b.pop("factors", None)
        result.append(b)
    return result


@router.get("/today")
def best_bets_today():
    try:
        from app.core.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        today = date.today().isoformat()
        res = supabase.table("best_bets").select("*, games!inner(home_team,away_team,sport,game_time)").eq("date", today).order("confidence", desc=True).execute()
        if res.data:
            return [{"id": r["id"], "sport": r["games"]["sport"], "game_time": r["games"]["game_time"], "home_team": r["games"]["home_team"], "away_team": r["games"]["away_team"], "bet_type": r["bet_type"], "pick": r["pick"], "confidence": r["confidence"], "edge_pct": r["edge_pct"], "ev_pct": r.get("ev_pct", 0), "rationale": r.get("rationale", ""), "weather_flag": r.get("weather_flag"), "injury_flag": r.get("injury_flag"), "line_move": r.get("line_move_direction", "flat"), "best_book": r.get("best_book", "DraftKings"), "model_prob": r.get("model_prob", 0), "implied_prob": r.get("implied_prob", 0)} for r in res.data]
    except Exception:
        pass
    return _build_mock_bets()
