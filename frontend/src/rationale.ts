// Rationale generator — calls Railway backend /api/rationale
// The backend uses ANTHROPIC_API_KEY (server-side) to call Claude

export interface RationaleInput {
  betType: 'moneyline' | 'run_line' | 'spread' | 'total' | 'player_prop' | 'first_5';
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
  topFactors?: string[];
  factorDetails?: Record<string, unknown>;
}

function buildFallback(input: RationaleInput): string {
  const { favPitcher, dogPitcher, favTeam, favOps, favBullpenEra, dogBullpenEra, betType, parkNotes } = input;
  if (favPitcher && dogPitcher) {
    if (betType === 'run_line' || betType === 'spread') {
      const avgIp = favPitcher.last3.length > 0
        ? (favPitcher.last3.reduce((s, x) => s + x.ip, 0) / favPitcher.last3.length).toFixed(1)
        : '5.5';
      const avgEr = favPitcher.last3.length > 0
        ? (favPitcher.last3.reduce((s, x) => s + x.er, 0) / favPitcher.last3.length).toFixed(1)
        : '?';
      const last3Str = favPitcher.last3.length > 0
        ? favPitcher.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', ')
        : 'no recent data';
      return `${favPitcher.name} (${favPitcher.era.toFixed(2)} ERA, ${favPitcher.kPer9.toFixed(1)} K/9) averaging ${avgIp} IP and ${avgEr} ER over last ${favPitcher.last3.length} starts (${last3Str}). Bullpen ERA ${favBullpenEra.toFixed(2)} vs opponent ${dogBullpenEra.toFixed(2)} — late-game cover advantage is significant. ${parkNotes}.`;
    }
    const last3Str = favPitcher.last3.length > 0
      ? favPitcher.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', ')
      : 'no recent data';
    return `${favPitcher.name} (${favPitcher.era.toFixed(2)} ERA, ${favPitcher.whip.toFixed(2)} WHIP, ${favPitcher.kPer9.toFixed(1)} K/9, last 3: ${last3Str}) outmatches ${dogPitcher.name} (${dogPitcher.era.toFixed(2)} ERA). ${favTeam} lineup posts ${favOps.toFixed(3)} OPS and bullpen ERA is ${favBullpenEra.toFixed(2)}. ${parkNotes}.`;
  }
  return `${favTeam} has the statistical advantage at ${input.confidence.toFixed(1)}/10 confidence. ${parkNotes}.`;
}

export async function generateRationale(input: RationaleInput): Promise<string> {
  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL as string | undefined;
  if (!backendUrl) return buildFallback(input);

  const topFactors = input.topFactors || [];
  const factorDetails = input.factorDetails || {};

  // Build top_factors from available data if not provided
  const autoFactors: string[] = [];
  if (topFactors.length === 0) {
    if (input.favPitcher && input.dogPitcher) {
      const pitcherGap = Math.abs(input.favPitcher.era - input.dogPitcher.era);
      if (pitcherGap > 0.5) autoFactors.push('pitching');
    }
    if (Math.abs(input.favBullpenEra - input.dogBullpenEra) > 0.5) autoFactors.push('bullpen');
    if (input.parkFactor > 1.08 || input.parkFactor < 0.93) autoFactors.push('park_factor');
    if (input.weather && (input.weather.includes('mph') || input.weather.toLowerCase().includes('cold'))) autoFactors.push('weather');
    if (input.favOps > 0.750) autoFactors.push('offense');
    if (autoFactors.length < 2 && input.favPitcher) autoFactors.push('pitching');
    if (autoFactors.length < 2) autoFactors.push('bullpen');
  }

  const finalFactors = topFactors.length > 0 ? topFactors : autoFactors.slice(0, 3);

  const autoDetails: Record<string, unknown> = { ...factorDetails };
  if (!autoDetails['pitching'] && input.favPitcher && input.dogPitcher) {
    autoDetails['pitching'] = {
      fav_pitcher: input.favPitcher.name,
      fav_era: input.favPitcher.era,
      fav_whip: input.favPitcher.whip,
      fav_k9: input.favPitcher.kPer9,
      fav_last3: input.favPitcher.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', '),
      dog_pitcher: input.dogPitcher.name,
      dog_era: input.dogPitcher.era,
    };
  }
  if (!autoDetails['bullpen']) {
    autoDetails['bullpen'] = { fav_era: input.favBullpenEra, dog_era: input.dogBullpenEra };
  }
  if (!autoDetails['offense']) {
    autoDetails['offense'] = { ops: input.favOps };
  }
  if (!autoDetails['park_factor']) {
    autoDetails['park_factor'] = { factor: input.parkFactor, notes: input.parkNotes };
  }

  try {
    const res = await fetch(`${backendUrl}/api/rationale/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bet_type: input.betType,
        pick: input.pick,
        fav_team: input.favTeam,
        dog_team: input.dogTeam,
        fav_pitcher: input.favPitcher ? {
          name: input.favPitcher.name,
          era: input.favPitcher.era,
          whip: input.favPitcher.whip,
          k_per9: input.favPitcher.kPer9,
          last3: input.favPitcher.last3,
        } : null,
        dog_pitcher: input.dogPitcher ? {
          name: input.dogPitcher.name,
          era: input.dogPitcher.era,
          whip: input.dogPitcher.whip,
          k_per9: input.dogPitcher.kPer9,
        } : null,
        fav_bullpen_era: input.favBullpenEra,
        dog_bullpen_era: input.dogBullpenEra,
        fav_ops: input.favOps,
        park_factor: input.parkFactor,
        park_notes: input.parkNotes,
        weather: input.weather,
        top_factors: finalFactors,
        factor_details: autoDetails,
        confidence: input.confidence,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.rationale) return json.rationale;
    }
  } catch {
    // fall through to fallback
  }

  return buildFallback(input);
}
