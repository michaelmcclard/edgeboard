from fastapi import APIRouter

router = APIRouter()

MOCK_PARLAYS = [
    {"id": "p1", "legs": [{"game_id": "g1", "pick": "Lakers -3.5", "confidence": 8.5}, {"game_id": "g2", "pick": "Celtics ML", "confidence": 7.8}, {"game_id": "g3", "pick": "Under 9.5", "confidence": 7.2}], "num_legs": 3, "combined_odds": 595, "implied_prob": 14.4, "model_prob": 22.1, "correlated_risk": False},
    {"id": "p2", "legs": [{"game_id": "g1", "pick": "Lakers -3.5", "confidence": 8.5}, {"game_id": "g5", "pick": "Blues -1.5", "confidence": 6.5}], "num_legs": 2, "combined_odds": 320, "implied_prob": 23.8, "model_prob": 31.2, "correlated_risk": False},
    {"id": "p3", "legs": [{"game_id": "g2", "pick": "Celtics ML", "confidence": 7.8}, {"game_id": "g6", "pick": "LAFC ML", "confidence": 6.0}, {"game_id": "g5", "pick": "Blues -1.5", "confidence": 6.5}, {"game_id": "g3", "pick": "Under 9.5", "confidence": 7.2}], "num_legs": 4, "combined_odds": 1850, "implied_prob": 5.1, "model_prob": 8.7, "correlated_risk": False},
]

@router.get("/today")
def parlays_today():
    return MOCK_PARLAYS
