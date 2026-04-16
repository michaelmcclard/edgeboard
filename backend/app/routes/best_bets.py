from fastapi import APIRouter
from datetime import date

router = APIRouter()

MOCK_BETS = [
    {"id": "bb1", "sport": "MLB", "game_time": "2026-04-16T16:35:00Z", "home_team": "Pirates", "away_team": "Nationals", "bet_type": "spread", "pick": "Pirates -1.5 (+145)", "confidence": 9.1, "edge_pct": 7.2, "ev_pct": 5.8, "rationale": "Elite lineup (0.782 OPS, 9.1% barrel rate) drives confidence against a struggling Nationals staff. Market signals: reverse line movement plus sharp money aligned on Pittsburgh. Bullpen depth (3.41 ERA) provides late-game insurance with closer available on full rest.", "weather_flag": None, "injury_flag": None, "line_move": "up", "best_book": "DraftKings", "model_prob": 0.66, "implied_prob": 0.58},
    {"id": "bb2", "sport": "MLB", "game_time": "2026-04-16T16:40:00Z", "home_team": "Reds", "away_team": "Giants", "bet_type": "moneyline", "pick": "Reds ML (-131)", "confidence": 8.4, "edge_pct": 5.8, "ev_pct": 4.5, "rationale": "Offensive profile (0.751 OPS) supports the edge with 41.2% hard hit rate against a flyball-heavy Giants staff. Schedule spot (3d rest) favors Cincinnati at home. Defensive metrics (OAA 8) are a contributing factor with strong up-the-middle defense.", "weather_flag": None, "injury_flag": None, "line_move": "up", "best_book": "FanDuel", "model_prob": 0.61, "implied_prob": 0.57},
    {"id": "bb3", "sport": "MLB", "game_time": "2026-04-16T19:05:00Z", "home_team": "Yankees", "away_team": "Angels", "bet_type": "spread", "pick": "Yankees -1.5 (+126)", "confidence": 8.8, "edge_pct": 6.5, "ev_pct": 5.2, "rationale": "Dominant starter anchors this pick with elite K/9. Significant platoon advantage (0.801 OPS vs hand) with 6 hitters favoring the matchup. Market signals: fading 72% public on Angels, sharp money aligned on NYY run line.", "weather_flag": None, "injury_flag": "Angels rotation depleted", "line_move": "up", "best_book": "BetMGM", "model_prob": 0.64, "implied_prob": 0.56},
    {"id": "bb4", "sport": "MLB", "game_time": "2026-04-16T19:10:00Z", "home_team": "Guardians", "away_team": "Orioles", "bet_type": "moneyline", "pick": "Guardians ML (-140)", "confidence": 7.6, "edge_pct": 4.4, "ev_pct": 3.5, "rationale": "Shutdown bullpen (3.18 ERA) provides late-game insurance with all high-leverage arms available. Baserunning edge (BSR 3.2) creates extra value against a catcher with 2.08 pop time. Starter quality (3.45 ERA) is a contributing factor.", "weather_flag": None, "injury_flag": None, "line_move": "flat", "best_book": "Caesars", "model_prob": 0.59, "implied_prob": 0.54},
    {"id": "bb5", "sport": "MLB", "game_time": "2026-04-16T19:05:00Z", "home_team": "White Sox", "away_team": "Rays", "bet_type": "total", "pick": "Under 8.5 (-115)", "confidence": 7.3, "edge_pct": 3.9, "ev_pct": 3.1, "rationale": "Starter quality (3.21 ERA) is a contributing factor with both arms featuring high groundball rates. Weather conditions factor in with 18 mph crosswinds suppressing fly ball distance. Poor defense (OAA -8, DRS -12) on both sides keeps runners off base via strikeouts rather than balls in play.", "weather_flag": "Wind 18mph crosswind", "injury_flag": None, "line_move": "down", "best_book": "DraftKings", "model_prob": 0.57, "implied_prob": 0.53},
]

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
    return MOCK_BETS
