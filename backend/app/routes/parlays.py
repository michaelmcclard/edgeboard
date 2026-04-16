from fastapi import APIRouter

router = APIRouter()

# April 16, 2026 — Real MLB parlay suggestions
# Based on today's best bets: Yankees RL, Phillies RL, Dodgers RL, Astros RL
# Source: Reddit MLBPicksAI, ProCappers
MOCK_PARLAYS = [
    {
        "id": "p1",
        "name": "Power Parlay — Apr 16",
        "sport": "MLB",
        "legs": [
            {"game_id": "g4", "pick": "Yankees -1.5 (+126)", "confidence": 8.8, "bet_type": "spread"},
            {"game_id": "g5", "pick": "Phillies -1.5 (+152)", "confidence": 9.0, "bet_type": "spread"},
            {"game_id": "g9", "pick": "Dodgers -1.5 (+112)", "confidence": 8.5, "bet_type": "spread"},
        ],
        "combined_odds": "+645",
        "model_confidence": 9.2,
        "parlay_type": "run_line",
        "notes": "Three plus-money run lines on the card's biggest favorites. Each is backed by elite starters vs. poor opposition pitching."
    },
    {
        "id": "p2",
        "name": "Sharp 2-Leg — Yankees + Phillies",
        "sport": "MLB",
        "legs": [
            {"game_id": "g4", "pick": "Yankees -1.5 (+126)", "confidence": 8.8, "bet_type": "spread"},
            {"game_id": "g5", "pick": "Phillies -1.5 (+152)", "confidence": 9.0, "bet_type": "spread"},
        ],
        "combined_odds": "+348",
        "model_confidence": 9.0,
        "parlay_type": "run_line",
        "notes": "Top two confidence plays on the board today. Both starters are elite; both opponents are depleted or cold."
    },
    {
        "id": "p3",
        "name": "4-Leg Hammer — Full Slate",
        "sport": "MLB",
        "legs": [
            {"game_id": "g4", "pick": "Yankees -1.5 (+126)", "confidence": 8.8, "bet_type": "spread"},
            {"game_id": "g5", "pick": "Phillies -1.5 (+152)", "confidence": 9.0, "bet_type": "spread"},
            {"game_id": "g6", "pick": "Astros -1.5 (+110)", "confidence": 8.5, "bet_type": "spread"},
            {"game_id": "g9", "pick": "Dodgers -1.5 (+112)", "confidence": 8.5, "bet_type": "spread"},
        ],
        "combined_odds": "+1820",
        "model_confidence": 8.7,
        "parlay_type": "run_line",
        "notes": "Four-leg all-plus-money run line parlay. Higher risk but every leg is a quality favorite facing clear pitching mismatches."
    },
]


@router.get("/today")
def parlays_today():
    return MOCK_PARLAYS
