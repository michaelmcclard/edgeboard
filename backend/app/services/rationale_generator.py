"""Rationale generator for EdgeBoard picks.
Builds a complete data package prompt for Anthropic Claude.
Every available data point is included — Claude picks the most significant factor.
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


def _build_full_data_block(pick):
    """Build a complete data package string from ALL available pick factors."""
    factors = pick.get("factors", {})
    lines = []

    # --- PITCHING ---
    p = factors.get("pitching", {}).get("detail", {})
    if p:
        lines.append("PITCHING (home starter):")
        lines.append(f"  ERA: {p.get('era', 'N/A')} | FIP: {p.get('fip', 'N/A')} | WHIP: {p.get('whip', 'N/A')} | K/9: {p.get('k9', 'N/A')} | Last3 ERA: {p.get('last3_era', 'N/A')}")
    else:
        lines.append("PITCHING: no data available")

    # --- BULLPEN ---
    bp = factors.get("bullpen", {}).get("detail", {})
    if bp:
        lines.append("BULLPEN:")
        lines.append(f"  BP ERA: {bp.get('bp_era', 'N/A')} | BP FIP: {bp.get('bp_fip', 'N/A')} | L7D ERA: {bp.get('l7d_era', 'N/A')} | Closer available: {bp.get('closer_avail', 'N/A')} | Tired arms: {bp.get('tired_arms', 'N/A')}")
    else:
        lines.append("BULLPEN: no data available")

    # --- HITTING / LINEUP ---
    h = factors.get("hitting", {}).get("detail", {})
    if h:
        lines.append("LINEUP (favored team):")
        lines.append(f"  OPS: {h.get('full_ops', 'N/A')} | Barrel%: {h.get('barrel', 'N/A')} | HardHit%: {h.get('hard_hit', 'N/A')} | ISO: {h.get('iso', 'N/A')} | RISP OPS: {h.get('risp_ops', 'N/A')}")
    else:
        lines.append("LINEUP: no data available")

    # --- DEFENSE ---
    d = factors.get("defense", {}).get("detail", {})
    if d:
        lines.append("DEFENSE:")
        lines.append(f"  OAA: {d.get('oaa', 'N/A')} | DRS: {d.get('drs', 'N/A')} | Errors/G: {d.get('errors', 'N/A')}")

    # --- MARKET SIGNALS ---
    m = factors.get("market", {}).get("detail", {})
    if m:
        rlm = m.get('rlm', False)
        sharp = m.get('sharp', 'N/A')
        pub_pct = m.get('pub_pct', 'N/A')
        money_pct = m.get('money_pct', 'N/A')
        steam = m.get('steam', False)
        rlm_mag = m.get('rlm_mag', 0)
        lines.append("MARKET SIGNALS:")
        lines.append(f"  RLM: {rlm} (magnitude: {rlm_mag} pts) | Sharp money: {sharp} | Public%: {pub_pct}% | Money%: {money_pct}% | Steam: {steam}")
    else:
        lines.append("MARKET SIGNALS: no data available")

    # --- MATCHUP ---
    mu = factors.get("matchup", {}).get("detail", {})
    if mu:
        lines.append("MATCHUP:")
        lines.append(f"  OPS vs pitcher hand: {mu.get('lineup_vs_hand', 'N/A')} | Platoon disadvantage: {mu.get('platoon_disadv', 'N/A')} players | Sprint speed: {mu.get('sprint_speed', 'N/A')} | BSR: {mu.get('bsr', 'N/A')}")

    # --- WEATHER ---
    wx = factors.get("weather", {}).get("detail", {})
    wx_flag = pick.get("weather_flag") or ""
    if wx:
        lines.append("WEATHER:")
        lines.append(f"  Wind: {wx.get('wind', 'N/A')}mph {wx.get('wind_dir', '')} | Temp: {wx.get('temp', 'N/A')}F | Precip: {wx.get('precip', 'N/A')}%")
    elif wx_flag:
        lines.append(f"WEATHER: {wx_flag}")
    else:
        lines.append("WEATHER: no significant conditions")

    # --- SITUATIONAL ---
    sit = factors.get("situational", {}).get("detail", {})
    if sit:
        lines.append("SITUATIONAL:")
        lines.append(f"  Rest days: {sit.get('rest_days', 'N/A')} | Road games in streak: {sit.get('road_games', 'N/A')} | Playoff race: {sit.get('playoff_race', 'N/A')} | Venue history: {sit.get('venue_hist', 'N/A')}")

    # --- INJURY / FLAGS ---
    injury = pick.get("injury_flag") or ""
    lines.append(f"INJURY/FLAGS: {injury if injury else 'none'}")

    # --- TOP SCORING FACTORS (names only, no scores — avoid ranking bias) ---
    scored = []
    for name, info in factors.items():
        s = info.get("score", 0)
        if s > 0:
            scored.append((name, s))
    scored.sort(key=lambda x: x[1], reverse=True)
    if scored:
        top_names = ", ".join(name.upper() for name, _ in scored[:3])
        lines.append(f"ENGINE TOP FACTORS: {top_names}")

    return "\n".join(lines)


def _anthropic_rationale(pick):
    """Call Claude with a complete data package — no ranking bias."""
    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            logger.warning("ANTHROPIC_API_KEY not set - using template fallback")
            return _template_rationale(pick)

        client = anthropic.Anthropic(api_key=api_key)

        home = pick.get("home_team", "Home")
        away = pick.get("away_team", "Away")
        pick_str = pick.get("pick", "")
        bet_type = pick.get("bet_type", "")
        confidence = pick.get("confidence", 0)

        full_data_block = _build_full_data_block(pick)

        if not full_data_block.strip():
            return _template_rationale(pick)

        if bet_type == "moneyline":
            bet_instruction = "MONEYLINE: explain why this team WINS OUTRIGHT today. Do NOT mention spread, run line, or covering."
        else:
            bet_instruction = "RUN LINE / SPREAD (-1.5): explain why this team wins BY MULTIPLE RUNS today. Address margin of victory — starter depth, bullpen, lineup power. Do NOT say 'win outright'."

        prompt = (
            f"You are a sharp MLB betting analyst. Write a 2-3 sentence pick rationale.\n\n"
            f"Game: {away} @ {home}\n"
            f"Pick: {pick_str}\n"
            f"Bet type: {bet_instruction}\n"
            f"Confidence: {confidence}/10\n\n"
            f"FULL DATA PACKAGE:\n"
            f"{full_data_block}\n\n"
            f"INSTRUCTIONS:\n"
            f"- Read ALL the data above. Identify the single most decisive factor for THIS specific pick.\n"
            f"- If the lineup OPS or barrel rate stands out, lead with that. If RLM + sharp money align, lead with that. If bullpen ERA gap is decisive, lead with that. If pitching dominates, lead with pitching.\n"
            f"- Reference at least 3 specific numeric values from the data package above.\n"
            f"- Every rationale must be different. Do not use the same sentence structure as other picks.\n"
            f"- BANNED phrases: 'clear pitching mismatch', 'significantly sharper', 'edge reflects that gap', 'edge exists', 'value here', 'this is a clear'\n"
            f"- Do NOT start the sentence with the team name.\n"
            f"- Do NOT use the words 'edge' or 'value'.\n"
            f"- Be assertive. No hedging. 2-3 sentences max."
        )

        message = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=220,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        logger.info("Rationale generated for %s %s: %s", pick.get('pick',''), bet_type, text[:80])
        return text if text else _template_rationale(pick)

    except Exception as exc:
        logger.error("Anthropic rationale failed: %s", exc)
        return _template_rationale(pick)


def _template_rationale(pick):
    """Fallback template for non-ML/spread bets or API failure."""
    factors = pick.get("factors", {})
    bet_type = pick.get("bet_type", "")
    parts = []

    # Pull every available factor in order of score
    scored = []
    for name, info in factors.items():
        s = info.get("score", 0)
        if s > 0:
            scored.append((name, s, info.get("detail", {})))
    scored.sort(key=lambda x: x[1], reverse=True)

    if not scored:
        return "Model composite scoring across all factors."

    for name, s, d in scored[:3]:
        if name == "pitching":
            parts.append(f"Starter ({d.get('era','?')} ERA, {d.get('k9','?')} K/9) is the anchor.")
        elif name == "hitting":
            parts.append(f"Lineup ({d.get('full_ops','?')} OPS, {d.get('barrel','?')}% barrel rate) generates the offense.")
        elif name == "bullpen":
            parts.append(f"Bullpen ({d.get('bp_era','?')} ERA, {d.get('l7d_era','?')} L7D ERA) locks it down late.")
        elif name == "matchup":
            parts.append(f"Lineup posts {d.get('lineup_vs_hand','?')} OPS vs this arm with {d.get('platoon_disadv','?')} platoon disadvantages.")
        elif name == "market":
            if d.get("rlm"):
                parts.append(f"Reverse line movement ({d.get('rlm_mag',0)} pts) with {d.get('sharp','?')} sharp money.")
            elif d.get("sharp") == "high":
                parts.append(f"Sharp money ({d.get('money_pct','?')}% of handle) is aligned against {d.get('pub_pct','?')}% public.")
            else:
                parts.append("Market indicators lean favorable.")
        elif name == "weather":
            parts.append(f"Wind at {d.get('wind','?')}mph ({d.get('wind_dir','?')}) is a scoring factor.")
        elif name == "defense":
            parts.append(f"Defense (OAA {d.get('oaa',0)}, DRS {d.get('drs',0)}) suppresses extra bases.")
        elif name == "situational":
            parts.append(f"Schedule spot: {d.get('rest_days','?')}d rest favors this side.")

    if bet_type == "spread" and parts:
        parts.append("Margin profile supports covering -1.5.")

    return " ".join(parts) if parts else "Model composite scoring across all factors."
