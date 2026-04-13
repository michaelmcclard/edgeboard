from fastapi import APIRouter

router = APIRouter()

MOCK_WEATHER = [
    {"game_id": "g3", "stadium": "Yankee Stadium", "city": "New York, NY", "temp_f": 52, "wind_mph": 18, "wind_dir": "NW", "precip_pct": 10, "condition": "Partly Cloudy", "impact_text": "Wind game - 18mph gusts blowing in. Expect lower scoring. Lean under on totals."},
    {"game_id": "g6", "stadium": "CITYPARK", "city": "St. Louis, MO", "temp_f": 61, "wind_mph": 8, "wind_dir": "S", "precip_pct": 55, "condition": "Rain Likely", "impact_text": "Rain expected mid-game. Wet surface favors defensive play and under totals."},
]

@router.get("/today")
def weather_today():
    return MOCK_WEATHER
