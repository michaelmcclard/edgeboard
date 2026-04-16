from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

# April 16, 2026 — Real MLB betting news and injury updates
MOCK_NEWS = [
    {
        "id": "n1",
        "sport": "MLB",
        "headline": "Luis Castillo ERA sits at 6.92 entering Padres start — sharp money hitting San Diego",
        "source": "RotoWire",
        "url": "https://www.rotowire.com/baseball/article/mlb-best-bets-single-game-odds-and-picks-for-thursday-april-16-111453",
        "tags": ["Mariners", "Padres", "pitching", "line move"],
        "published_at": "2026-04-16T14:00:00Z"
    },
    {
        "id": "n2",
        "sport": "MLB",
        "headline": "Royals-Tigers game in Detroit facing 100% rain forecast — postponement likely",
        "source": "RotoWire Weather",
        "url": "https://www.rotowire.com/baseball/weather.php",
        "tags": ["Tigers", "Royals", "weather", "postponement"],
        "published_at": "2026-04-16T10:00:00Z"
    },
    {
        "id": "n3",
        "sport": "MLB",
        "headline": "Yankees ML (-292) vs Angels: Gerrit Cole vs Tyler Anderson — experts backing New York run line",
        "source": "ProCappers",
        "url": "https://procappers.com/article/mlb-best-bets-today-top-5-free-picks-and-expert-predictions-for-april-16-2026",
        "tags": ["Yankees", "Angels", "best bet"],
        "published_at": "2026-04-16T09:00:00Z"
    },
    {
        "id": "n4",
        "sport": "MLB",
        "headline": "Phillies -1.5 (+152) vs Cubs: Sanchez on mound, plus-money run line value identified",
        "source": "Reddit MLBPicksAI",
        "url": "https://www.reddit.com/r/MLBPicksAI/comments/1skv8t4/",
        "tags": ["Phillies", "Cubs", "run line", "value"],
        "published_at": "2026-04-16T08:30:00Z"
    },
    {
        "id": "n5",
        "sport": "MLB",
        "headline": "Astros -1.5 (+110) vs Rockies: Houston heavily favored, Freeland ERA at 5.91 on road",
        "source": "ProCappers",
        "url": "https://procappers.com/article/mlb-best-bets-today-top-5-free-picks-and-expert-predictions-for-april-16-2026",
        "tags": ["Astros", "Rockies", "run line"],
        "published_at": "2026-04-16T09:30:00Z"
    },
    {
        "id": "n6",
        "sport": "MLB",
        "headline": "Dodgers -1.5 (+112) vs Mets: Yamamoto vs Peterson — model flags plus-money run line on LA",
        "source": "Reddit MLBPicksAI",
        "url": "https://www.reddit.com/r/MLBPicksAI/comments/1skv8t4/",
        "tags": ["Dodgers", "Mets", "run line", "best bet"],
        "published_at": "2026-04-16T08:00:00Z"
    },
    {
        "id": "n7",
        "sport": "MLB",
        "headline": "Guardians vs Orioles tonight: VSiN notes influential sharp money on both sides — steam alert active",
        "source": "VSiN",
        "url": "https://vsin.com/mlb/mlb-best-bets-today-adam-burkes-picks-for-thursday-april-16/",
        "tags": ["Guardians", "Orioles", "sharp money", "steam"],
        "published_at": "2026-04-16T11:00:00Z"
    },
    {
        "id": "n8",
        "sport": "MLB",
        "headline": "Padres Over 8.5 correlated with home dog play — both Castillo and Buehler off to slow starts",
        "source": "RotoWire",
        "url": "https://www.rotowire.com/baseball/article/mlb-best-bets-single-game-odds-and-picks-for-thursday-april-16-111453",
        "tags": ["Padres", "Mariners", "over", "totals"],
        "published_at": "2026-04-16T13:00:00Z"
    },
]


@router.get("/feed")
def news_feed(sport: str | None = None):
    if sport:
        return [n for n in MOCK_NEWS if n["sport"] == sport]
    return MOCK_NEWS
