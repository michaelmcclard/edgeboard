import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx

router = APIRouter()

class Last3Start(BaseModel):
    ip: float
    er: int
    k: int

class PitcherInput(BaseModel):
    name: str
    era: float
    whip: float
    k_per9: float
    last3: Optional[List[Last3Start]] = []

class DogPitcherInput(BaseModel):
    name: str
    era: float
    whip: float
    k_per9: float

class RationaleRequest(BaseModel):
    bet_type: str  # moneyline, run_line, spread, total, player_prop
    pick: str
    fav_team: str
    dog_team: str
    fav_pitcher: Optional[PitcherInput] = None
    dog_pitcher: Optional[DogPitcherInput] = None
    fav_bullpen_era: float = 4.00
    dog_bullpen_era: float = 4.00
    fav_ops: float = 0.720
    fav_barrel_rate: Optional[float] = None
    fav_hard_hit: Optional[float] = None
    park_factor: float = 1.0
    park_notes: str = ""
    weather: str = ""
    top_factors: List[str] = []
    factor_details: Dict[str, Any] = {}
    confidence: float = 7.0

def build_fallback(req: RationaleRequest) -> str:
    fp = req.fav_pitcher
    dp = req.dog_pitcher
    if fp and dp:
        if req.bet_type in ("run_line", "spread"):
            avg_ip = "5.5"
            avg_er = "?"
            if fp.last3:
                avg_ip = f"{sum(s.ip for s in fp.last3) / len(fp.last3):.1f}"
                avg_er = f"{sum(s.er for s in fp.last3) / len(fp.last3):.1f}"
            last3_str = ", ".join(f"{s.ip}IP/{s.er}ER/{s.k}K" for s in fp.last3) if fp.last3 else "no recent data"
            return (f"{fp.name} ({fp.era:.2f} ERA, {fp.k_per9:.1f} K/9) averaging {avg_ip} IP "
                    f"and {avg_er} ER over his last {len(fp.last3)} starts ({last3_str}). "
                    f"Bullpen ERA {req.fav_bullpen_era:.2f} vs opponent {req.dog_bullpen_era:.2f} — "
                    f"late-game advantage is significant. {req.park_notes}.")
        else:
            last3_str = ", ".join(f"{s.ip}IP/{s.er}ER/{s.k}K" for s in fp.last3) if fp.last3 else "no recent data"
            return (f"{fp.name} ({fp.era:.2f} ERA, {fp.whip:.2f} WHIP, {fp.k_per9:.1f} K/9, "
                    f"last 3: {last3_str}) has a clear edge over "
                    f"{dp.name} ({dp.era:.2f} ERA). {req.fav_team} lineup posts "
                    f"{req.fav_ops:.3f} OPS and bullpen ERA is {req.fav_bullpen_era:.2f}. "
                    f"{req.park_notes}.")
    return f"{req.fav_team} has the statistical edge at {req.confidence:.1f}/10 confidence. {req.park_notes}."

@router.post("/")
async def generate_rationale(req: RationaleRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"rationale": build_fallback(req)}

    fp = req.fav_pitcher
    dp = req.dog_pitcher
    top_factors = req.top_factors or ["pitching", "bullpen", "offense"]
    factor_details = req.factor_details or {}

    last3_str = "no recent data"
    if fp and fp.last3:
        last3_str = ", ".join(f"{s.ip}IP/{s.er}ER/{s.k}K" for s in fp.last3)

    bet_label = {
        "moneyline": "moneyline",
        "run_line": "run line (-1.5)",
        "spread": "spread",
        "total": "game total",
        "player_prop": "player prop",
    }.get(req.bet_type, req.bet_type)

    factors_formatted = json.dumps(factor_details, indent=2)

    prompt = f"""You are a sharp MLB betting analyst. Write a 2-3 sentence synopsis for this specific bet.

Pick: {req.pick} ({bet_label})
Confidence: {req.confidence:.1f}/10

Top 3 factors driving this pick: {top_factors}

Factor details:
{factors_formatted}

Additional data:
- {req.fav_team} starter: {f"{fp.name}, {fp.era:.2f} ERA, {fp.whip:.2f} WHIP, {fp.k_per9:.1f} K/9, last 3: {last3_str}" if fp else 'unknown'}
- {req.dog_team} starter: {f"{dp.name}, {dp.era:.2f} ERA, {dp.k_per9:.1f} K/9" if dp else 'unknown'}
- {req.fav_team} lineup OPS: {req.fav_ops:.3f}
- {req.fav_team} bullpen ERA: {req.fav_bullpen_era:.2f} vs {req.dog_team} bullpen ERA: {req.dog_bullpen_era:.2f}
- Park factor: {req.park_factor:.2f} ({req.park_notes})
- Weather: {req.weather}

Rules:
- ONLY reference the top 3 factors listed above. Do not mention any other factors.
- Use the specific numbers from factor_details and additional data.
- Every rationale must be completely unique — reference the exact numbers provided.
- Explain why this bet wins TODAY specifically.
- Do NOT use the words "edge" or "value".
- Do NOT start with the team name.
- Be assertive and specific. No hedging.
- 2-3 sentences only."""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": "claude-haiku-4-5",
                    "max_tokens": 200,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
        if resp.status_code == 200:
            data = resp.json()
            text = data.get("content", [{}])[0].get("text", "").strip()
            if text:
                return {"rationale": text}
    except Exception:
        pass

    return {"rationale": build_fallback(req)}
