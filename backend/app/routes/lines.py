from fastapi import APIRouter

router = APIRouter()

# April 16, 2026 — Real MLB odds from DraftKings/FanDuel/BetMGM/Caesars
# Sources: covers.com, actionnetwork, rotowire
MOCK_LINES = [
    {
        "game_id": "g4", "home_team": "Yankees", "away_team": "Angels", "books": [
            {"book": "DraftKings", "spread": -1.5, "spread_juice": 126, "ml_home": -292, "ml_away": 258, "total": 10.0, "total_juice": -110},
            {"book": "FanDuel", "spread": -1.5, "spread_juice": 122, "ml_home": -295, "ml_away": 250, "total": 10.0, "total_juice": -110},
            {"book": "BetMGM", "spread": -1.5, "spread_juice": 130, "ml_home": -300, "ml_away": 255, "total": 10.0, "total_juice": -110},
            {"book": "Caesars", "spread": -1.5, "spread_juice": 125, "ml_home": -290, "ml_away": 260, "total": 10.0, "total_juice": -112},
        ],
        "opening_spread": -1.5, "current_spread": -1.5,
        "movement": [{"time": "09:00", "spread": -1.5}, {"time": "12:00", "spread": -1.5}],
        "steam_alert": False
    },
    {
        "game_id": "g5", "home_team": "Phillies", "away_team": "Cubs", "books": [
            {"book": "DraftKings", "spread": -1.5, "spread_juice": 152, "ml_home": -145, "ml_away": 125, "total": 8.5, "total_juice": -110},
            {"book": "FanDuel", "spread": -1.5, "spread_juice": 148, "ml_home": -148, "ml_away": 128, "total": 8.5, "total_juice": -110},
            {"book": "BetMGM", "spread": -1.5, "spread_juice": 155, "ml_home": -150, "ml_away": 130, "total": 8.5, "total_juice": -110},
            {"book": "Caesars", "spread": -1.5, "spread_juice": 150, "ml_home": -145, "ml_away": 124, "total": 8.5, "total_juice": -108},
        ],
        "opening_spread": -1.5, "current_spread": -1.5,
        "movement": [{"time": "09:00", "spread": -1.5}, {"time": "12:00", "spread": -1.5}],
        "steam_alert": False
    },
    {
        "game_id": "g6", "home_team": "Astros", "away_team": "Rockies", "books": [
            {"book": "DraftKings", "spread": -1.5, "spread_juice": 110, "ml_home": -240, "ml_away": 205, "total": 9.0, "total_juice": -110},
            {"book": "FanDuel", "spread": -1.5, "spread_juice": 108, "ml_home": -245, "ml_away": 208, "total": 9.0, "total_juice": -110},
            {"book": "BetMGM", "spread": -1.5, "spread_juice": 112, "ml_home": -250, "ml_away": 210, "total": 9.0, "total_juice": -110},
            {"book": "Caesars", "spread": -1.5, "spread_juice": 110, "ml_home": -238, "ml_away": 200, "total": 9.0, "total_juice": -110},
        ],
        "opening_spread": -1.5, "current_spread": -1.5,
        "movement": [{"time": "09:00", "spread": -1.5}, {"time": "13:00", "spread": -1.5}],
        "steam_alert": False
    },
    {
        "game_id": "g7", "home_team": "Guardians", "away_team": "Orioles", "books": [
            {"book": "DraftKings", "spread": -1.5, "spread_juice": -105, "ml_home": -131, "ml_away": 112, "total": 8.0, "total_juice": -110},
            {"book": "FanDuel", "spread": -1.5, "spread_juice": -108, "ml_home": -135, "ml_away": 115, "total": 8.0, "total_juice": -110},
            {"book": "BetMGM", "spread": -1.5, "spread_juice": -102, "ml_home": -130, "ml_away": 110, "total": 8.0, "total_juice": -110},
            {"book": "Caesars", "spread": -1.5, "spread_juice": -106, "ml_home": -132, "ml_away": 111, "total": 8.0, "total_juice": -108},
        ],
        "opening_spread": -1.5, "current_spread": -1.5,
        "movement": [{"time": "09:00", "spread": -1.5}, {"time": "14:00", "spread": -1.5}],
        "steam_alert": True
    },
    {
        "game_id": "g8", "home_team": "Padres", "away_team": "Mariners", "books": [
            {"book": "DraftKings", "spread": -1.5, "spread_juice": -115, "ml_home": 105, "ml_away": -120, "total": 8.5, "total_juice": -105},
            {"book": "FanDuel", "spread": -1.5, "spread_juice": -112, "ml_home": 108, "ml_away": -125, "total": 8.5, "total_juice": -105},
            {"book": "BetMGM", "spread": -1.5, "spread_juice": -118, "ml_home": 104, "ml_away": -122, "total": 8.5, "total_juice": -110},
            {"book": "Caesars", "spread": -1.5, "spread_juice": -115, "ml_home": 106, "ml_away": -120, "total": 8.5, "total_juice": -105},
        ],
        "opening_spread": -1.5, "current_spread": 1.5,
        "movement": [{"time": "09:00", "spread": -1.5}, {"time": "15:00", "spread": 1.5}],
        "steam_alert": True
    },
    {
        "game_id": "g9", "home_team": "Dodgers", "away_team": "Mets", "books": [
            {"book": "DraftKings", "spread": -1.5, "spread_juice": 112, "ml_home": -200, "ml_away": 172, "total": 7.5, "total_juice": -105},
            {"book": "FanDuel", "spread": -1.5, "spread_juice": 110, "ml_home": -204, "ml_away": 175, "total": 7.5, "total_juice": -105},
            {"book": "BetMGM", "spread": -1.5, "spread_juice": 115, "ml_home": -205, "ml_away": 175, "total": 7.5, "total_juice": -110},
            {"book": "Caesars", "spread": -1.5, "spread_juice": 112, "ml_home": -200, "ml_away": 170, "total": 7.5, "total_juice": -105},
        ],
        "opening_spread": -1.5, "current_spread": -1.5,
        "movement": [{"time": "09:00", "spread": -1.5}, {"time": "14:00", "spread": -1.5}],
        "steam_alert": False
    },
]


@router.get("/movement")
def line_movement():
    return MOCK_LINES


@router.get("/comparison")
def book_comparison():
    return MOCK_LINES
