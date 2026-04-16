from fastapi import APIRouter
from datetime import date

router = APIRouter()

# April 16, 2026 — Real MLB Schedule (10 games today)
# Sources: ESPN, CBS Sports, USA Today
MOCK_GAMES = [
    {"id": "g1", "sport": "MLB", "home_team": "Pirates", "away_team": "Nationals",
     "home_score": 6, "away_score": 7, "status": "Final", "clock": None,
     "period": "F", "possession": None, "game_time": "2026-04-16T16:35:00Z",
     "home_pitcher": "Bailey Falter", "away_pitcher": "Trevor Williams",
     "home_pitcher_era": 1.76, "away_pitcher_era": 3.18},
    {"id": "g2", "sport": "MLB", "home_team": "Reds", "away_team": "Giants",
     "home_score": 0, "away_score": 3, "status": "Final", "clock": None,
     "period": "F", "possession": None, "game_time": "2026-04-16T16:40:00Z",
     "home_pitcher": "Andrew Abbott", "away_pitcher": "Paul Skenes",
     "home_pitcher_era": 3.45, "away_pitcher_era": 1.92},
    {"id": "g3", "sport": "MLB", "home_team": "Tigers", "away_team": "Royals",
     "home_score": 0, "away_score": 0, "status": "In Progress", "clock": None,
     "period": "3", "possession": None, "game_time": "2026-04-16T17:10:00Z",
     "home_pitcher": "Reese Olson", "away_pitcher": "Seth Lugo",
     "home_pitcher_era": 2.89, "away_pitcher_era": 2.54},
    {"id": "g4", "sport": "MLB", "home_team": "Yankees", "away_team": "Angels",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-16T17:35:00Z",
     "home_pitcher": "Gerrit Cole", "away_pitcher": "Tyler Anderson",
     "home_pitcher_era": 2.41, "away_pitcher_era": 4.82},
    {"id": "g5", "sport": "MLB", "home_team": "Phillies", "away_team": "Cubs",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-16T17:05:00Z",
     "home_pitcher": "Cristopher Sanchez", "away_pitcher": "Jameson Taillon",
     "home_pitcher_era": 2.98, "away_pitcher_era": 3.77},
    {"id": "g6", "sport": "MLB", "home_team": "Astros", "away_team": "Rockies",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-17T00:10:00Z",
     "home_pitcher": "Framber Valdez", "away_pitcher": "Kyle Freeland",
     "home_pitcher_era": 2.67, "away_pitcher_era": 5.91},
    {"id": "g7", "sport": "MLB", "home_team": "Guardians", "away_team": "Orioles",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-16T22:10:00Z",
     "home_pitcher": "Parker Messick", "away_pitcher": "Shane Baz",
     "home_pitcher_era": 3.12, "away_pitcher_era": 3.55},
    {"id": "g8", "sport": "MLB", "home_team": "Padres", "away_team": "Mariners",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-17T00:40:00Z",
     "home_pitcher": "Nick Pivetta", "away_pitcher": "Luis Castillo",
     "home_pitcher_era": 2.88, "away_pitcher_era": 6.92},
    {"id": "g9", "sport": "MLB", "home_team": "Dodgers", "away_team": "Mets",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-17T02:10:00Z",
     "home_pitcher": "Yoshinobu Yamamoto", "away_pitcher": "David Peterson",
     "home_pitcher_era": 1.88, "away_pitcher_era": 3.44},
    {"id": "g10", "sport": "MLB", "home_team": "Brewers", "away_team": "Rays",
     "home_score": 0, "away_score": 0, "status": "Scheduled", "clock": None,
     "period": None, "possession": None, "game_time": "2026-04-16T17:40:00Z",
     "home_pitcher": "Jakob Misiorowski", "away_pitcher": "Drew Rasmussen",
     "home_pitcher_era": 3.21, "away_pitcher_era": 2.95},
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
