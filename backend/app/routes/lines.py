from fastapi import APIRouter

router = APIRouter()

MOCK_LINES = [
    {"game_id": "g1", "home_team": "Lakers", "away_team": "Warriors", "books": [
        {"book": "DraftKings", "spread": -3.5, "spread_juice": -110, "ml_home": -160, "ml_away": 135, "total": 224.5, "total_juice": -110},
        {"book": "FanDuel", "spread": -3, "spread_juice": -115, "ml_home": -155, "ml_away": 130, "total": 225, "total_juice": -110},
        {"book": "BetMGM", "spread": -3.5, "spread_juice": -105, "ml_home": -165, "ml_away": 140, "total": 224, "total_juice": -110},
        {"book": "Caesars", "spread": -3.5, "spread_juice": -110, "ml_home": -158, "ml_away": 132, "total": 225, "total_juice": -112},
    ], "opening_spread": -2.5, "current_spread": -3.5, "movement": [{"time": "06:00", "spread": -2.5}, {"time": "09:00", "spread": -3}, {"time": "12:00", "spread": -3.5}, {"time": "15:00", "spread": -3.5}], "steam_alert": True},
    {"game_id": "g2", "home_team": "Celtics", "away_team": "Bucks", "books": [
        {"book": "DraftKings", "spread": -4.5, "spread_juice": -110, "ml_home": -190, "ml_away": 160, "total": 218, "total_juice": -110},
        {"book": "FanDuel", "spread": -4.5, "spread_juice": -108, "ml_home": -185, "ml_away": 155, "total": 217.5, "total_juice": -110},
        {"book": "BetMGM", "spread": -5, "spread_juice": -110, "ml_home": -195, "ml_away": 165, "total": 218.5, "total_juice": -110},
        {"book": "Caesars", "spread": -4.5, "spread_juice": -112, "ml_home": -188, "ml_away": 158, "total": 218, "total_juice": -108},
    ], "opening_spread": -4, "current_spread": -4.5, "movement": [{"time": "06:00", "spread": -4}, {"time": "10:00", "spread": -4.5}, {"time": "14:00", "spread": -4.5}], "steam_alert": False},
]

@router.get("/movement")
def line_movement():
    return MOCK_LINES

@router.get("/comparison")
def book_comparison():
    return MOCK_LINES
