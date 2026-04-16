"""Rationale generator for EdgeBoard picks.
Uses Anthropic Claude API for moneyline and spread picks with distinct prompts.
Falls back to template for all other bet types.
"""
import logging
import os
import anthropic

logger = logging.getLogger("rationale_generator")


def build_rationale(pick):
    """Entry point: Anthropic API for ML/spread, template fallback for others."""
    bet_type = pick.get("bet_type", "")
    if bet_type in ("moneyline", "spread"):
        return _anthropic_rationale(pick)
    return _template_rationale(pick)


def _get_top3(pick):
    """Return top 3 scoring factors as (name, score, detail) tuples."""
    factors = pick.get("factors", {})
    scored = []
    for name, info in factors.items():
        s = info.get("score", 0)
        if s > 0:
            scored.append((name, s, info.get("detail", {})))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:3]


def _fmt(name, d):
    """Format a factor's key metrics into a compact string."""
    if name == "pitching":
        return (
            f"ERA {d.get('era','?')}, FIP {d.get('fip','?')}, "
            f"WHIP {d.get('whip','?')}, K/9 {d.get('k9','?')}, "
            f"Last3 ERA {d.get('last3_era','?')}"
        )
    if name == "hitting":
        return (
            f"OPS {d.get('full_ops','?')}, Barrel% {d.get('barrel','?')}, "
            f"HardHit% {d.get('hard_hit','?')}, ISO {d.get('iso','?')}, "
            f"RISP OPS {d.get('risp_ops','?')}"
        )
    if name == "bullpen":
        return (
            f"BP ERA {d.get('bp_era','?')}, BP FIP {d.get('bp_fip','?')}, "
            f"CloserAvail:{d.get('closer_avail','?')}, "
            f"TiredArms:{d.get('tired_arms','?')}, "
            f"L7D ERA {d.get('l7d_era','?')}"
        )
    if name == "matchup":
        return (
            f"OPS vs Hand {d.get('lineup_vs_hand','?')}, "
            f"PlatoonDisadv {d.get('platoon_disadv','?')}, "
            f"SprintSpd {d.get('sprint_speed','?')}, "
            f"BSR {d.get('bsr','?')}"
        )
    if name == "situational":
        return (
            f"RestDays {d.get('rest_days','?')}, "
            f"RoadGames {d.get('road_games','?')}, "
            f"PlayoffRace:{d.get('playoff_race','?')}, "
            f"VenueHist {d.get('venue_hist','?')}"
        )
    if name == "market":
        return (
            f"RLM:{d.get('rlm','?')}, Sharp:{d.get('sharp','?')}, "
            f"Public%:{d.get('pub_pct','?')}, Steam:{d.get('steam','?')}"
        )
    if name == "weather":
        return (
            f"Wind {d.get('wind','?')}mph {d.get('wind_dir','?')}, "
            f"Temp {d.get('temp','?')}F, Precip {d.get('precip','?')}%"
        )
    if name == "defense":
        return (
            f"OAA {d.get('oaa','?')}, DRS {d.get('drs','?')}, "
            f"Errors/G {d.get('errors','?')}"
        )
    return str(d)


def _anthropic_rationale(pick):
    """Call Claude to generate a unique, bet-type-specific synopsis."""
    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set - using template fallback")
            return _template_rationale(pick)

        client = anthropic.Anthropic(api_key=api_key)
        top3 = _get_top3(pick)
        if not top3:
            return _template_rationale(pick)

        home = pick.get("home_team", "Home")
        away = pick.get("away_team", "Away")
        pick_str = pick.get("pick", "")
        bet_type = pick.get("bet_type", "")
        confidence = pick.get("confidence", 0)
        injury_flag = pick.get("injury_flag") or ""

        factor_lines = []
        for name, score, detail in top3:
            factor_lines.append(
                f" - {name.upper()} (score {score:.1f}/10): {_fmt(name, detail)}"
            )
        factors_block = "\n".join(factor_lines)
        dominant = top3[0][0] if top3 else "unknown"

        if bet_type == "moneyline":
            bet_label = "moneyline"
            bet_specific = (
                f"- Explain why this team WINS OUTRIGHT — not just covers, but wins the game\n"
                f"- Address what gives them the straight-up win probability edge\n"
                f"- If there is an injury flag, work it in: {injury_flag if injury_flag else 'none'}\n"
                f"- Do NOT mention run line, spread, or covering"
            )
        else:  # spread
            bet_label = "run line / spread (-1.5)"
            bet_specific = (
                f"- Explain why this team wins BY MULTIPLE RUNS — not just wins, but dominates\n"
                f"- Address margin of victory potential: deep starter, bullpen depth, lineup power\n"
                f"- If there is an injury flag, work it in: {injury_flag if injury_flag else 'none'}\n"
                f"- Do NOT say 'win outright' or pretend this is a moneyline bet"
            )

        prompt = (
            f"You are a sharp MLB betting analyst. Write a 2-3 sentence pick synopsis.\n\n"
            f"Game: {away} @ {home}\n"
            f"Pick: {pick_str} ({bet_label})\n"
            f"Confidence: {confidence}/10\n\n"
            f"Top 3 scoring factors (use ONLY these, with their exact numbers):\n"
            f"{factors_block}\n\n"
            f"Requirements:\n"
            f"- Your opening sentence MUST center on {dominant.upper()} data specifically\n"
            f"- Reference at least 2 specific numeric values from the factor data above\n"
            f"{bet_specific}\n"
            f"- Do NOT use generic phrases like 'edge exists' or 'value here'\n"
            f"- Do NOT start with the team name\n"
            f"- Do NOT use the words 'edge' or 'value'\n"
            f"- Be assertive, no hedging\n"
            f"- 2-3 sentences max"
        )

        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        return text if text else _template_rationale(pick)

    except Exception as exc:
        logger.error("Anthropic rationale failed: %s", exc)
        return _template_rationale(pick)


def _template_rationale(pick):
    """Simple template fallback used for non-ML/spread bets or when API fails."""
    top3 = _get_top3(pick)
    bet_type = pick.get("bet_type", "")
    if not top3:
        return "Model composite scoring across all factors."
    parts = []
    for name, s, d in top3:
        if name == "pitching":
            parts.append(f"Starter ({d.get('era','?')} ERA) anchors this pick.")
        elif name == "hitting":
            parts.append(f"Lineup ({d.get('full_ops','?')} OPS) drives the pick.")
        elif name == "bullpen":
            parts.append(f"Bullpen ({d.get('bp_era','?')} ERA) provides late security.")
        elif name == "matchup":
            parts.append(f"Matchup ({d.get('lineup_vs_hand','?')} OPS vs hand) is favorable.")
        elif name == "market":
            if d.get("rlm"):
                parts.append("Reverse line movement detected.")
            elif d.get("sharp") == "high":
                parts.append("Sharp money is aligned.")
            else:
                parts.append("Market indicators lean favorable.")
        elif name == "weather":
            parts.append(f"Wind at {d.get('wind','?')}mph is a contributing factor.")
        elif name == "defense":
            parts.append(f"Defense (OAA {d.get('oaa',0)}) contributes.")
        elif name == "situational":
            parts.append(f"Schedule ({d.get('rest_days','?')}d rest) favors this side.")
    if bet_type == "spread" and parts:
        parts.append("Margin potential supports covering -1.5.")
    return " ".join(parts) if parts else "Model composite scoring across all factors."
