// Anthropic rationale generator — called per pick with real game data
// Requires VITE_ANTHROPIC_API_KEY in environment

export interface RationaleInput {
  betType: 'moneyline' | 'run_line' | 'spread';
  pick: string;
  favTeam: string;
  dogTeam: string;
  favPitcher: { name: string; era: number; whip: number; kPer9: number; last3: { ip: number; er: number; k: number }[] } | null;
  dogPitcher: { name: string; era: number; whip: number; kPer9: number } | null;
  favBullpenEra: number;
  dogBullpenEra: number;
  favOps: number;
  parkFactor: number;
  parkNotes: string;
  weather: string;
  confidence: number;
}

function fallbackRationale(input: RationaleInput): string {
  const { favPitcher, dogPitcher, favTeam, favOps, favBullpenEra, betType } = input;
  if (favPitcher && dogPitcher) {
    if (betType === 'run_line' || betType === 'spread') {
      const avgIp = favPitcher.last3.length > 0
        ? (favPitcher.last3.reduce((s, x) => s + x.ip, 0) / favPitcher.last3.length).toFixed(1)
        : '5.5';
      const avgEr = favPitcher.last3.length > 0
        ? (favPitcher.last3.reduce((s, x) => s + x.er, 0) / favPitcher.last3.length).toFixed(1)
        : '?';
      return `${favPitcher.name} (${favPitcher.era.toFixed(2)} ERA, ${favPitcher.kPer9.toFixed(1)} K/9) averaging ${avgIp} IP and ${avgEr} ER over his last ${favPitcher.last3.length} starts. Bullpen ERA ${favBullpenEra.toFixed(2)} vs opponent ${input.dogBullpenEra.toFixed(2)} — late-game advantage is significant. ${input.parkNotes}.`;
    } else {
      return `${favPitcher.name} (${favPitcher.era.toFixed(2)} ERA, ${favPitcher.whip.toFixed(2)} WHIP) has a clear edge over ${dogPitcher.name} (${dogPitcher.era.toFixed(2)} ERA). ${favTeam} lineup posts ${favOps.toFixed(3)} OPS and bullpen ERA is ${favBullpenEra.toFixed(2)}.`;
    }
  }
  return `${favTeam} has the statistical edge at ${(input.confidence).toFixed(1)}/10 confidence. ${input.parkNotes}.`;
}

export async function generateRationale(input: RationaleInput): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return fallbackRationale(input);

  const { favPitcher, dogPitcher, favTeam, dogTeam, favOps, favBullpenEra, dogBullpenEra, parkFactor, parkNotes, weather, betType, confidence, pick } = input;

  const last3Str = favPitcher?.last3?.length
    ? favPitcher.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', ')
    : 'no recent data';

  const betLabel = betType === 'moneyline' ? 'moneyline' : 'run line (-1.5)';

  const prompt = `You are a sharp MLB betting analyst. Write a 2-3 sentence synopsis for this pick.

Pick: ${pick} (${betLabel})
Confidence: ${confidence.toFixed(1)}/10

Key data:
- ${favTeam} starter: ${favPitcher ? `${favPitcher.name}, ${favPitcher.era.toFixed(2)} ERA, ${favPitcher.whip.toFixed(2)} WHIP, ${favPitcher.kPer9.toFixed(1)} K/9, last 3 starts: ${last3Str}` : 'unknown'}
- ${dogTeam} starter: ${dogPitcher ? `${dogPitcher.name}, ${dogPitcher.era.toFixed(2)} ERA, ${dogPitcher.kPer9.toFixed(1)} K/9` : 'unknown'}
- ${favTeam} lineup OPS: ${favOps.toFixed(3)}
- ${favTeam} bullpen ERA: ${favBullpenEra.toFixed(2)} vs ${dogTeam} bullpen ERA: ${dogBullpenEra.toFixed(2)}
- Park factor: ${parkFactor.toFixed(2)} (${parkNotes})
- Weather: ${weather}

Rules:
- Reference specific numbers from the data above
- Explain why this bet wins TODAY specifically
- Do NOT use the words "edge" or "value"
- Do NOT start with the team name
- No hedging — be assertive
- 2-3 sentences only`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return fallbackRationale(input);
    const json = await res.json();
    const text = json?.content?.[0]?.text?.trim();
    return text || fallbackRationale(input);
  } catch {
    return fallbackRationale(input);
  }
}
