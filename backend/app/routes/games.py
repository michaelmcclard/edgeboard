from fastapi import APIRouter
from datetime import date

router = APIRouter()

MOCK_GAMES = [
    {"id": "g1", "sport": "NBA", "home_team": "Lakers", "away_team": "Warriors", "home_score": 102, "away_score": 99, "status": "Q4", "clock": "02:13", "period": "Q4", "possession": "home", "game_time": "2026-04-13T19:30:00Z"},
    {"id": "g2", "sport": "NBA", "home_team": "Celtics", "away_team": "Bucks", "home_score": 88, "away_score": 91, "status": "Q3", "clock": "08:45", "period": "Q3", "possession": "away", "game_time": "2026-04-13T20:00:00Z"},
    {"id": "g3", "sport": "MLB", "home_team": "Yankees", "away_team": "Red Sox", "home_score": 3, "away_score": 5, "status": "Top 6th", "clock": None, "period": "6", "possession": "away", "game_time": "2026-04-13T19:05:00Z"},
    {"id": "g4", "sport": "MLB", "home_team": "Dodgers", "away_team": "Padres", "home_score": 0, "away_score": 0, "status": "scheduled", "clock": None, "period": None, "possession": None, "game_time": "2026-04-13T22:10:00Z"},
    {"id": "g5", "sport": "NHL", "home_team": "Blues", "away_team": "Blackhawks", "home_score": 2, "away_score": 1, "status": "2nd Period", "clock": "11:22", "period": "P2", "possession": None, "game_time": "2026-04-13T19:00:00Z"},
    {"id": "g6", "sport": "MLS", "home_team": "CITY SC", "away_team": "LAFC", "home_score": 1, "away_score": 1, "status": "2nd Half", "clock": "67'", "period": "2H", "possession": "home", "game_time": "2026-04-13T17:00:00Z"},
]


@router.get("/today")
def today_games():
    try:
        from app.core.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        today = date.today().isoformat()
        res = supabase.table("games").select("*").eq("date", today).execute()
        if res.data:
            return res.data
    except Exception:
        pass
    return MOCK_GAMES
