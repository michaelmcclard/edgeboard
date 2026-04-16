import os
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


def build_full_data_block(req: RationaleRequest) -> str:
    """Build a complete, unranked data package for Claude."""
    fp = req.fav_pitcher
    dp = req.dog_pitcher
    lines = []

    # PITCHING
    if fp:
        last3_str = ", ".join(f"{s.ip}IP/{s.er}ER/{s.k}K" for s in fp.last3) if fp.last3 else "no recent data"
        lines.append("PITCHING:")
        lines.append(f"  {req.fav_team} starter: {fp.name} | ERA: {fp.era:.2f} | WHIP: {fp.whip:.2f} | K/9: {fp.k_per9:.1f} | Last 3: {last3_str}")
    if dp:
        lines.append(f"  {req.dog_team} starter: {dp.name} | ERA: {dp.era:.2f} | WHIP: {dp.whip:.2f} | K/9: {dp.k_per9:.1f}")
    if not fp and not dp:
        lines.append("PITCHING: no starter data available")

    # BULLPEN
    lines.append("BULLPEN:")
    lines.append(f"  {req.fav_team} BP ERA: {req.fav_bullpen_era:.2f} | {req.dog_team} BP ERA: {req.dog_bullpen_era:.2f}")
    bp_gap = req.dog_bullpen_era - req.fav_bullpen_era
    if abs(bp_gap) >= 0.5:
        lines.append(f"  Bullpen gap: {abs(bp_gap):.2f} ERA advantage to {req.fav_team if bp_gap > 0 else req.dog_team}")

    # LINEUP / OFFENSE
    lines.append("LINEUP (favored team):")
    lines.append(f"  OPS: {req.fav_ops:.3f}" +
                 (f" | Barrel%: {req.fav_barrel_rate:.1f}" if req.fav_barrel_rate else "") +
                 (f" | HardHit%: {req.fav_hard_hit:.1f}" if req.fav_hard_hit else ""))

    # PARK FACTOR
    lines.append("PARK FACTOR:")
    park_lean = "hitter-friendly" if req.park_factor >= 1.06 else ("pitcher-friendly" if req.park_factor <= 0.94 else "neutral")
    lines.append(f"  Factor: {req.park_factor:.2f} ({park_lean}) | {req.park_notes}")

    # WEATHER
    lines.append("WEATHER:")
    lines.append(f"  {req.weather if req.weather else 'No significant conditions'}")

    # MARKET / SITUATIONAL (from factor_details if present)
    fd = req.factor_details or {}
    market = fd.get("market") or fd.get("market_signals")
    if market and isinstance(market, dict):
        lines.append("MARKET SIGNALS:")
        rlm = market.get("rlm") or market.get("fav_era")  # check for real RLM key
        if isinstance(rlm, bool) or isinstance(rlm, int):
            lines.append(f"  RLM: {rlm} | Sharp money: {market.get('sharp', 'N/A')} | Public%: {market.get('pub_pct', 'N/A')}% | Money%: {market.get('money_pct', 'N/A')}%")

    situational = fd.get("situational")
    if situational and isinstance(situational, dict):
        lines.append("SITUATIONAL:")
        lines.append(f"  Rest days: {situational.get('rest_days', 'N/A')} | Road streak: {situational.get('road_games', 'N/A')} | Playoff race: {situational.get('playoff_race', 'N/A')}")

    # AVAILABLE FACTORS (names only — no scores to avoid ranking bias)
    if req.top_factors:
        lines.append(f"ENGINE FLAGGED FACTORS: {', '.join(f.upper() for f in req.top_factors)}")

    return "\n".join(lines)


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
            return (
                f"{fp.name} ({fp.era:.2f} ERA, {fp.k_per9:.1f} K/9) averaging {avg_ip} IP "
                f"and {avg_er} ER over his last {len(fp.last3)} starts ({last3_str}). "
                f"Bullpen ERA {req.fav_bullpen_era:.2f} vs opponent {req.dog_bullpen_era:.2f} — "
                f"late-game advantage is significant. {req.park_notes}."
            )
        else:
            last3_str = ", ".join(f"{s.ip}IP/{s.er}ER/{s.k}K" for s in fp.last3) if fp.last3 else "no recent data"
            return (
                f"{fp.name} ({fp.era:.2f} ERA, {fp.whip:.2f} WHIP, {fp.k_per9:.1f} K/9, "
                f"last 3: {last3_str}) vs {dp.name} ({dp.era:.2f} ERA). "
                f"{req.fav_team} posts {req.fav_ops:.3f} OPS with {req.fav_bullpen_era:.2f} bullpen ERA. "
                f"{req.park_notes}."
            )
    return f"{req.fav_team} has the statistical advantage at {req.confidence:.1f}/10 confidence. {req.park_notes}."


@router.post("/")
async def generate_rationale(req: RationaleRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"rationale": build_fallback(req)}

    full_data_block = build_full_data_block(req)

    if req.bet_type == "moneyline":
        bet_instruction = (
            f"MONEYLINE: explain why {req.fav_team} WINS OUTRIGHT today. "
            f"Do NOT mention run line, spread, or covering."
        )
    elif req.bet_type in ("run_line", "spread"):
        bet_instruction = (
            f"RUN LINE / SPREAD (-1.5): explain why {req.fav_team} wins BY MULTIPLE RUNS. "
            f"Address margin of victory — starter depth, bullpen, or lineup power. "
            f"Do NOT say 'wins outright'."
        )
    else:
        bet_instruction = f"Explain why {req.pick} hits today."

    prompt = f"""You are a sharp MLB betting analyst. Write a 2-3 sentence pick rationale.

Game: {req.dog_team} @ {req.fav_team}
Pick: {req.pick}
Bet type: {bet_instruction}
Confidence: {req.confidence:.1f}/10

FULL DATA PACKAGE:
{full_data_block}

INSTRUCTIONS:
- Read ALL the data above. Find the single most decisive factor for THIS specific pick.
- If the bullpen gap is the biggest number, lead with bullpen. If lineup OPS + barrel rate stands out, lead with offense. If weather is extreme, lead with weather. If pitching clearly dominates, lead with pitching. If park factor is extreme (>1.15 or <0.90), lead with park.
- Reference at least 3 specific numeric values from the data package.
- Every rationale must be structurally different from a generic pitching comparison.
- BANNED phrases: 'clear pitching mismatch', 'significantly sharper', 'edge reflects', 'this is a clear', 'edge exists', 'value here'
- Do NOT start the sentence with the team name.
- Do NOT use the words 'edge' or 'value'.
- Be assertive. No hedging. 2-3 sentences max."""

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
                    "max_tokens": 220,
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
