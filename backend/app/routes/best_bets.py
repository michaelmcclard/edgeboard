from fastapi import APIRouter
from datetime import date

router = APIRouter()

MOCK_BETS = [
    {"id": "bb1", "sport": "NBA", "game_time": "2026-04-13T19:30:00Z", "home_team": "Lakers", "away_team": "Warriors", "bet_type": "spread", "pick": "Lakers -3.5", "confidence": 8.5, "edge_pct": 6.2, "ev_pct": 4.8, "rationale": "Lakers rest edge and rebounding advantage create value against a tired Warriors squad on a back-to-back.", "weather_flag": None, "injury_flag": "Curry questionable", "line_move": "up", "best_book": "DraftKings", "model_prob": 0.62, "implied_prob": 0.55},
    {"id": "bb2", "sport": "NBA", "game_time": "2026-04-13T20:00:00Z", "home_team": "Celtics", "away_team": "Bucks", "bet_type": "moneyline", "pick": "Celtics ML (-165)", "confidence": 7.8, "edge_pct": 5.1, "ev_pct": 3.9, "rationale": "Celtics elite home defense and Giannis injury concern give them a significant edge at this price.", "weather_flag": None, "injury_flag": "Giannis questionable", "line_move": "down", "best_book": "FanDuel", "model_prob": 0.68, "implied_prob": 0.62},
    {"id": "bb3", "sport": "MLB", "game_time": "2026-04-13T19:05:00Z", "home_team": "Yankees", "away_team": "Red Sox", "bet_type": "total", "pick": "Under 9.5", "confidence": 7.2, "edge_pct": 4.3, "ev_pct": 3.1, "rationale": "Both starters posting sub-3.00 ERAs and 15 mph winds blowing in make this a pitching duel.", "weather_flag": "Wind game", "injury_flag": None, "line_move": "flat", "best_book": "BetMGM", "model_prob": 0.58, "implied_prob": 0.52},
    {"id": "bb4", "sport": "NHL", "game_time": "2026-04-13T19:00:00Z", "home_team": "Blues", "away_team": "Blackhawks", "bet_type": "spread", "pick": "Blues -1.5 (+145)", "confidence": 6.5, "edge_pct": 3.8, "ev_pct": 2.9, "rationale": "Blues dominate this rivalry at home with a 7-2 ATS record in last 9 meetings.", "weather_flag": None, "injury_flag": None, "line_move": "up", "best_book": "Caesars", "model_prob": 0.45, "implied_prob": 0.41},
    {"id": "bb5", "sport": "MLS", "game_time": "2026-04-13T17:00:00Z", "home_team": "CITY SC", "away_team": "LAFC", "bet_type": "moneyline", "pick": "LAFC ML (+130)", "confidence": 6.0, "edge_pct": 3.2, "ev_pct": 2.4, "rationale": "LAFC travel well with best away xG in MLS and face a side missing two starting defenders.", "weather_flag": "Rain likely", "injury_flag": "2 defenders OUT", "line_move": "flat", "best_book": "DraftKings", "model_prob": 0.48, "implied_prob": 0.43},
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
