from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

MOCK_NEWS = [
    {"id": "n1", "headline": "Curry listed as questionable with ankle soreness ahead of Lakers matchup", "source": "ESPN", "url": "#", "tags": ["Injury", "NBA"], "fetched_at": datetime.utcnow().isoformat(), "sport": "NBA"},
    {"id": "n2", "headline": "Giannis upgrades to probable, expected to play vs Celtics", "source": "The Athletic", "url": "#", "tags": ["Injury", "NBA"], "fetched_at": datetime.utcnow().isoformat(), "sport": "NBA"},
    {"id": "n3", "headline": "Yankees-Red Sox line moves from -2.5 to -3.5 on sharp action", "source": "Action Network", "url": "#", "tags": ["Line Move", "MLB"], "fetched_at": datetime.utcnow().isoformat(), "sport": "MLB"},
    {"id": "n4", "headline": "Blues activate top defenseman from IR ahead of Blackhawks game", "source": "NHL.com", "url": "#", "tags": ["Roster", "NHL"], "fetched_at": datetime.utcnow().isoformat(), "sport": "NHL"},
    {"id": "n5", "headline": "LAFC travel squad confirmed: full strength for road trip", "source": "MLS Soccer", "url": "#", "tags": ["Roster", "MLS"], "fetched_at": datetime.utcnow().isoformat(), "sport": "MLS"},
    {"id": "n6", "headline": "Public hammering Lakers spread; sharps on Warriors side", "source": "VSiN", "url": "#", "tags": ["Line Move", "NBA"], "fetched_at": datetime.utcnow().isoformat(), "sport": "NBA"},
    {"id": "n7", "headline": "Wind advisory issued for Yankee Stadium: gusts up to 20 mph", "source": "Weather Channel", "url": "#", "tags": ["General", "MLB"], "fetched_at": datetime.utcnow().isoformat(), "sport": "MLB"},
]

@router.get("/feed")
def news_feed(sport: str | None = None):
    if sport:
        return [n for n in MOCK_NEWS if n["sport"] == sport]
    return MOCK_NEWS
