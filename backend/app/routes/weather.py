from fastapi import APIRouter

router = APIRouter()

# April 16, 2026 — Real MLB weather data
# Source: RotoWire, Covers.com weather reports
MOCK_WEATHER = [
    {
        "game_id": "g4",
        "stadium": "Yankee Stadium",
        "city": "New York, NY",
        "temp_f": 86,
        "wind_mph": 8,
        "wind_dir": "Out to LF",
        "precip_pct": 0,
        "condition": "Partly Cloudy",
        "impact_text": "Warm 86° with light wind blowing out to left. Several HRs possible — lean over on totals."
    },
    {
        "game_id": "g3",
        "stadium": "Comerica Park",
        "city": "Detroit, MI",
        "temp_f": 65,
        "wind_mph": 11,
        "wind_dir": "R-L",
        "precip_pct": 100,
        "condition": "Rain — Delay/Postponement Likely",
        "impact_text": "100% chance of rain in Detroit. Game likely delayed or postponed. Avoid totals bets."
    },
    {
        "game_id": "g7",
        "stadium": "Progressive Field",
        "city": "Cleveland, OH",
        "temp_f": 69,
        "wind_mph": 9,
        "precip_pct": 44,
        "wind_dir": "L-R",
        "condition": "Chance of Rain",
        "impact_text": "44% precip chance in Cleveland tonight. Possible delay — monitor close to game time."
    },
    {
        "game_id": "g2",
        "stadium": "Great American Ball Park",
        "city": "Cincinnati, OH",
        "temp_f": 75,
        "wind_mph": 14,
        "wind_dir": "R-L",
        "precip_pct": 0,
        "condition": "Partly Cloudy",
        "impact_text": "Moderate crosswind blowing right to left at 14mph. Comfortable 75°. Ball carries well — slight lean over."
    },
    {
        "game_id": "g6",
        "stadium": "Minute Maid Park",
        "city": "Houston, TX",
        "temp_f": 78,
        "wind_mph": 5,
        "wind_dir": "Indoor (dome)",
        "precip_pct": 0,
        "condition": "Retractable Roof — Closed",
        "impact_text": "Minute Maid roof closed. No weather impact. Controlled conditions."
    },
    {
        "game_id": "g8",
        "stadium": "Petco Park",
        "city": "San Diego, CA",
        "temp_f": 68,
        "wind_mph": 10,
        "wind_dir": "In from CF",
        "precip_pct": 0,
        "condition": "Clear",
        "impact_text": "Typical San Diego night. Wind blowing in from center — slightly suppresses scoring. Slight lean under."
    },
]


@router.get("/today")
def weather_today():
    return MOCK_WEATHER
