from fastapi import APIRouter

router = APIRouter()

MOCK_PERFORMANCE = [
    {"date": "2026-04-01", "units_won": 1.2, "roi_pct": 8.5, "record": "3-1", "cumulative_units": 1.2},
    {"date": "2026-04-02", "units_won": -1.0, "roi_pct": -6.7, "record": "1-2", "cumulative_units": 0.2},
    {"date": "2026-04-03", "units_won": 2.1, "roi_pct": 14.0, "record": "4-1", "cumulative_units": 2.3},
    {"date": "2026-04-04", "units_won": 0.5, "roi_pct": 3.3, "record": "2-1", "cumulative_units": 2.8},
    {"date": "2026-04-05", "units_won": -0.5, "roi_pct": -3.3, "record": "2-3", "cumulative_units": 2.3},
    {"date": "2026-04-06", "units_won": 1.8, "roi_pct": 12.0, "record": "3-0", "cumulative_units": 4.1},
    {"date": "2026-04-07", "units_won": 0.0, "roi_pct": 0.0, "record": "1-1", "cumulative_units": 4.1},
    {"date": "2026-04-08", "units_won": 1.5, "roi_pct": 10.0, "record": "3-1", "cumulative_units": 5.6},
    {"date": "2026-04-09", "units_won": -1.2, "roi_pct": -8.0, "record": "1-3", "cumulative_units": 4.4},
    {"date": "2026-04-10", "units_won": 2.0, "roi_pct": 13.3, "record": "4-1", "cumulative_units": 6.4},
    {"date": "2026-04-11", "units_won": 0.8, "roi_pct": 5.3, "record": "2-1", "cumulative_units": 7.2},
    {"date": "2026-04-12", "units_won": 1.1, "roi_pct": 7.3, "record": "3-2", "cumulative_units": 8.3},
]

MOCK_SUMMARY = {
    "total_bets": 62,
    "wins": 38,
    "losses": 22,
    "pushes": 2,
    "win_pct": 63.3,
    "total_units": 8.3,
    "roi_pct": 6.8,
    "best_sport": "NBA",
    "best_bet_type": "spread",
}

@router.get("/performance")
def performance():
    return MOCK_PERFORMANCE

@router.get("/summary")
def summary():
    return MOCK_SUMMARY
