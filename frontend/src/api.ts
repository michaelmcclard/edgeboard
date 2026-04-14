import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ============ INTERFACES ============
export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  game_time: string;
  sport: string;
  home_score: number;
  away_score: number;
  status: string;
  stadium: string;
}
export interface PitcherStats {
  name: string;
  hand: string;
  era: number;
  whip: number;
  kPer9: number;
  bbPer9: number;
  hrPer9: number;
  ip: number;
  gamesStarted: number;
  strikeoutPct: string;
  groundOutRate: string;
  confirmed: boolean;
}
export interface GoalieStats {
  name: string;
  savePct: number;
  gaa: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  last5: { date: string; ga: number; sa: number; svPct: number; decision: string }[];
  confirmed: boolean;
}
export interface BestBet {
  id: string;
  game_id: string;
  pick: string;
  edge_pct: number;
  confidence: number;
  rationale: string;
  bet_type: string;
  best_book: string;
  sport: string;
  data_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  home_pitcher?: PitcherStats;
  away_pitcher?: PitcherStats;
  home_goalie?: GoalieStats;
  away_goalie?: GoalieStats;
  matchup_detail?: string;
}
export interface LineMovement {
  game_id: string;
  book: string;
  spread: number;
  recorded_at: string;
}
export interface NewsItem {
  id: string;
  headline: string;
  url: string;
  source: string;
  fetched_at: string;
  sport: string;
}
export interface WeatherData {
  id: number;
  game_id: string;
  temp_f: number;
  wind_mph: number;
  condition: string;
  impact_text: string;
}
export interface Parlay {
  id: string;
  legs: { game_id: string; pick: string; confidence: number }[];
  combined_odds: number;
  num_legs: number;
}

// ============ ESPN HELPERS ============
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const SPORT_MAP: Record<string, string> = { MLB: 'baseball/mlb', NBA: 'basketball/nba', NHL: 'hockey/nhl', NFL: 'football/nfl' };

function parseEspnStatus(c: any): string {
  const st = c?.status?.type?.name;
  if (st === 'STATUS_FINAL') return 'final';
  if (st === 'STATUS_IN_PROGRESS') return c?.status?.type?.shortDetail || 'live';
  return 'scheduled';
}

async function fetchEspnScoreboard(sport: string): Promise<Game[]> {
  try {
    const res = await fetch(`${ESPN_BASE}/${SPORT_MAP[sport]}/scoreboard`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.events || []).map((ev: any) => {
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((t: any) => t.homeAway === 'home');
      const away = comp?.competitors?.find((t: any) => t.homeAway === 'away');
      return { id: ev.id, home_team: home?.team?.displayName || 'TBD', away_team: away?.team?.displayName || 'TBD', game_time: ev.date, sport, home_score: Number(home?.score ?? 0), away_score: Number(away?.score ?? 0), status: parseEspnStatus(comp), stadium: comp?.venue?.fullName || '' };
    });
  } catch { return []; }
}

async function fetchEspnNews(): Promise<NewsItem[]> {
  const sports = ['baseball/mlb', 'basketball/nba', 'hockey/nhl'];
  const labels = ['MLB', 'NBA', 'NHL'];
  const all: NewsItem[] = [];
  for (let i = 0; i < sports.length; i++) {
    try {
      const res = await fetch(`${ESPN_BASE}/${sports[i]}/news?limit=3`);
      if (!res.ok) continue;
      const json = await res.json();
      (json?.articles || []).forEach((a: any) => {
        all.push({ id: String(a.id || Math.random()), headline: a.headline || '', url: a.links?.web?.href || '#', source: 'ESPN', fetched_at: a.published || new Date().toISOString(), sport: labels[i] });
      });
    } catch {}
  }
  return all.slice(0, 10);
}

// ============ MLB STATS API — PITCHER DATA ============
const MLB_API = 'https://statsapi.mlb.com/api/v1';

interface MLBScheduleGame {
  gamePk: number;
  homeTeam: string;
  awayTeam: string;
  homeRecord: string;
  awayRecord: string;
  homePitcher: PitcherStats | null;
  awayPitcher: PitcherStats | null;
  venue: string;
  gameTime: string;
}

async function fetchPitcherStats(playerId: number): Promise<PitcherStats | null> {
  try {
    const res = await fetch(`${MLB_API}/people/${playerId}?hydrate=stats(group=[pitching],type=[season],season=2026)`);
    if (!res.ok) return null;
    const json = await res.json();
    const person = json?.people?.[0];
    if (!person) return null;
    const stat = person.stats?.[0]?.splits?.[0]?.stat;
    if (!stat) return { name: person.fullName, hand: person.pitchHand?.code || '?', era: 0, whip: 0, kPer9: 0, bbPer9: 0, hrPer9: 0, ip: 0, gamesStarted: 0, strikeoutPct: '0%', groundOutRate: '0', confirmed: true };
    return {
      name: person.fullName,
      hand: person.pitchHand?.code || '?',
      era: parseFloat(stat.era) || 0,
      whip: parseFloat(stat.whip) || 0,
      kPer9: parseFloat(stat.strikeoutsPer9Inn) || 0,
      bbPer9: parseFloat(stat.walksPer9Inn) || 0,
      hrPer9: parseFloat(stat.homeRunsPer9) || 0,
      ip: parseFloat(stat.inningsPitched) || 0,
      gamesStarted: stat.gamesStarted || 0,
      strikeoutPct: stat.strikePercentage || '0',
      groundOutRate: stat.groundOutsToAirouts || '0',
      confirmed: true,
    };
  } catch { return null; }
}

async function fetchMLBScheduleWithPitchers(): Promise<MLBScheduleGame[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${MLB_API}/schedule?sportId=1&date=${today}&hydrate=probablePitcher(note),linescore,team`);
    if (!res.ok) return [];
    const json = await res.json();
    const games = json?.dates?.[0]?.games || [];
    const results: MLBScheduleGame[] = [];
    for (const g of games) {
      const homeId = g.teams?.home?.probablePitcher?.id;
      const awayId = g.teams?.away?.probablePitcher?.id;
      const [homePitcher, awayPitcher] = await Promise.all([
        homeId ? fetchPitcherStats(homeId) : null,
        awayId ? fetchPitcherStats(awayId) : null,
      ]);
      results.push({
        gamePk: g.gamePk,
        homeTeam: g.teams?.home?.team?.name || 'TBD',
        awayTeam: g.teams?.away?.team?.name || 'TBD',
        homeRecord: `${g.teams?.home?.leagueRecord?.wins || 0}-${g.teams?.home?.leagueRecord?.losses || 0}`,
        awayRecord: `${g.teams?.away?.leagueRecord?.wins || 0}-${g.teams?.away?.leagueRecord?.losses || 0}`,
        homePitcher: homePitcher ? { ...homePitcher, confirmed: true } : null,
        awayPitcher: awayPitcher ? { ...awayPitcher, confirmed: true } : null,
        venue: g.venue?.name || '',
        gameTime: g.gameDate || '',
      });
    }
    return results;
  } catch { return []; }
}

// ============ NHL API — GOALIE DATA ============
const NHL_API = 'https://api-web.nhle.com/v1';

interface NHLGameData {
  gameId: number;
  homeTeam: string;
  awayTeam: string;
  homeAbbrev: string;
  awayAbbrev: string;
  homeRecord: string;
  awayRecord: string;
  homeGoalie: GoalieStats | null;
  awayGoalie: GoalieStats | null;
  odds: { homeML: number; awayML: number; ou: number } | null;
}

async function fetchNHLGoalieByTeam(teamAbbrev: string): Promise<GoalieStats | null> {
  try {
    const rosterRes = await fetch(`${NHL_API}/roster/${teamAbbrev}/current`);
    if (!rosterRes.ok) return null;
    const roster = await rosterRes.json();
    const goalies = roster?.goalies || [];
    if (goalies.length === 0) return null;
    // Get first goalie (starter heuristic: first listed)
    const goalieId = goalies[0]?.id;
    if (!goalieId) return null;
    const playerRes = await fetch(`${NHL_API}/player/${goalieId}/landing`);
    if (!playerRes.ok) return null;
    const p = await playerRes.json();
    const season = p?.featuredStats?.season?.subSeason;
    const last5Raw = p?.last5Games || [];
    const last5 = last5Raw.slice(0, 5).map((g: any) => ({
      date: g.gameDate || '',
      ga: g.goalsAgainst || 0,
      sa: g.shotsAgainst || 0,
      svPct: g.savePctg || 0,
      decision: g.decision || '',
    }));
    return {
      name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
      savePct: season?.savePctg || 0,
      gaa: season?.goalsAgainstAvg || 0,
      wins: season?.wins || 0,
      losses: season?.losses || 0,
      gamesPlayed: season?.gamesPlayed || 0,
      last5,
      confirmed: true,
    };
  } catch { return null; }
}

async function fetchNHLGamesWithGoalies(): Promise<NHLGameData[]> {
  try {
    const res = await fetch(`${NHL_API}/score/now`);
    if (!res.ok) return [];
    const json = await res.json();
    const games = json?.games || [];
    const results: NHLGameData[] = [];
    for (const g of games) {
      const homeAbbrev = g.homeTeam?.abbrev || '';
      const awayAbbrev = g.awayTeam?.abbrev || '';
      const [homeGoalie, awayGoalie] = await Promise.all([
        homeAbbrev ? fetchNHLGoalieByTeam(homeAbbrev) : null,
        awayAbbrev ? fetchNHLGoalieByTeam(awayAbbrev) : null,
      ]);
      let odds: NHLGameData['odds'] = null;
      if (g.homeTeam?.odds || g.awayTeam?.odds) {
        const hOdds = g.homeTeam?.odds || [];
        const aOdds = g.awayTeam?.odds || [];
        const hML = hOdds.find((o: any) => o.providerId === 3);
        const aML = aOdds.find((o: any) => o.providerId === 3);
        if (hML && aML) odds = { homeML: parseFloat(hML.value), awayML: parseFloat(aML.value), ou: 0 };
      }
      results.push({
        gameId: g.id,
        homeTeam: g.homeTeam?.name?.default || '',
        awayTeam: g.awayTeam?.name?.default || '',
        homeAbbrev, awayAbbrev,
        homeRecord: g.homeTeam?.record || '',
        awayRecord: g.awayTeam?.record || '',
        homeGoalie, awayGoalie, odds,
      });
    }
    return results;
  } catch { return []; }
}

// ============ WEATHER ============
interface VenueCoord { lat: number; lon: number; label: string; }
const VENUE_COORDS: VenueCoord[] = [
  { lat: 38.6226, lon: -90.1928, label: 'St. Louis' },
  { lat: 40.8296, lon: -73.9262, label: 'New York' },
  { lat: 41.8827, lon: -87.6233, label: 'Chicago' },
  { lat: 34.0739, lon: -118.2400, label: 'Los Angeles' },
  { lat: 42.3467, lon: -71.0972, label: 'Boston' },
];
function wmoToCondition(code: number): string {
  if (code <= 1) return 'Clear'; if (code <= 3) return 'Partly Cloudy'; if (code <= 48) return 'Cloudy/Fog';
  if (code <= 67) return 'Rain'; if (code <= 77) return 'Snow'; if (code <= 82) return 'Heavy Rain'; return 'Thunderstorm';
}
async function fetchWeather(): Promise<WeatherData[]> {
  const out: WeatherData[] = [];
  try {
    const lats = VENUE_COORDS.map(v => v.lat).join(',');
    const lons = VENUE_COORDS.map(v => v.lon).join(',');
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`);
    if (!res.ok) return out;
    const json = await res.json();
    const results = Array.isArray(json) ? json : [json];
    results.forEach((r: any, i: number) => {
      const cur = r?.current || r?.current_weather;
      if (!cur) return;
      out.push({ id: i, game_id: '', temp_f: Math.round(cur.temperature_2m ?? cur.temperature ?? 0), wind_mph: Math.round(cur.wind_speed_10m ?? cur.windspeed ?? 0), condition: wmoToCondition(cur.weather_code ?? 0), impact_text: VENUE_COORDS[i]?.label || '' });
    });
  } catch {}
  return out;
}

// ============ BALLPARK FACTORS ============
const PARK_FACTOR: Record<string, number> = {
  'Coors Field': 1.38, 'Great American Ball Park': 1.15, 'Fenway Park': 1.12,
  'Yankee Stadium': 1.10, 'Citizens Bank Park': 1.09, 'Wrigley Field': 1.08,
  'Globe Life Field': 1.02, 'Oriole Park at Camden Yards': 1.06,
  'Guaranteed Rate Field': 1.04, 'Chase Field': 1.03,
  'Dodger Stadium': 0.95, 'Oracle Park': 0.90, 'Tropicana Field': 0.93,
  'T-Mobile Park': 0.92, 'Oakland Coliseum': 0.91, 'Petco Park': 0.93,
  'Kauffman Stadium': 0.96, 'Minute Maid Park': 1.05,
};
function getParkFactor(venue: string): number {
  for (const [k, v] of Object.entries(PARK_FACTOR)) {
    if (venue.toLowerCase().includes(k.toLowerCase().split(' ')[0])) return v;
  }
  return 1.0;
}

// ============ MLB BET ENGINE — PITCHER-FIRST MODEL ============
function generateMLBBets(games: MLBScheduleGame[], weather: WeatherData[]): BestBet[] {
  const bets: BestBet[] = [];
  for (const g of games) {
    const hp = g.homePitcher;
    const ap = g.awayPitcher;
    const parkFactor = getParkFactor(g.venue);
    const dataConf: 'HIGH' | 'MEDIUM' | 'LOW' = (hp?.confirmed && ap?.confirmed) ? (hp.ip > 10 && ap.ip > 10 ? 'HIGH' : 'MEDIUM') : 'LOW';

    // Skip if no pitcher data
    if (!hp && !ap) {
      bets.push({ id: `mlb-${g.gamePk}-pending`, game_id: String(g.gamePk), pick: `${g.awayTeam} @ ${g.homeTeam} — PENDING`, edge_pct: 0, confidence: 0, rationale: 'Starting pitchers not yet confirmed. No recommendation until probables are announced.', bet_type: 'NO BET', best_book: '', sport: 'MLB', data_confidence: 'LOW', matchup_detail: `${g.awayTeam} (${g.awayRecord}) @ ${g.homeTeam} (${g.homeRecord}) | ${g.venue}` });
      continue;
    }

    // --- PITCHER MATCHUP ANALYSIS ---
    let betterPitcher: 'home' | 'away' | 'even' = 'even';
    let pitcherEdge = 0;
    if (hp && ap) {
      // Composite score: lower ERA + lower WHIP + higher K/9 + lower BB/9
      const homeScore = (10 - hp.era) + (5 - hp.whip * 3) + hp.kPer9 - hp.bbPer9;
      const awayScore = (10 - ap.era) + (5 - ap.whip * 3) + ap.kPer9 - ap.bbPer9;
      pitcherEdge = Math.abs(homeScore - awayScore);
      if (homeScore > awayScore + 1.5) betterPitcher = 'home';
      else if (awayScore > homeScore + 1.5) betterPitcher = 'away';
    } else if (hp && !ap) {
      betterPitcher = 'home'; pitcherEdge = 3;
    } else if (ap && !hp) {
      betterPitcher = 'away'; pitcherEdge = 3;
    }

    const favPitcher = betterPitcher === 'home' ? hp! : betterPitcher === 'away' ? ap! : (hp || ap)!;
    const oppPitcher = betterPitcher === 'home' ? ap : betterPitcher === 'away' ? hp : null;
    const favTeam = betterPitcher === 'home' ? g.homeTeam : g.awayTeam;
    const oppTeam = betterPitcher === 'home' ? g.awayTeam : g.homeTeam;

    // --- STRIKEOUT PROP ---
    if (favPitcher && favPitcher.kPer9 >= 8.0 && favPitcher.ip >= 10) {
      const projK = (favPitcher.kPer9 / 9) * 5.5; // ~5.5 IP average
      const kLine = Math.round(projK * 2) / 2 - 0.5;
      const conf = Math.min(9.2, 6.5 + (favPitcher.kPer9 - 7) * 0.4 + (pitcherEdge > 3 ? 1 : 0));
      bets.push({
        id: `mlb-${g.gamePk}-kprop`, game_id: String(g.gamePk),
        pick: `${favPitcher.name} OVER ${kLine} strikeouts`,
        edge_pct: parseFloat(((favPitcher.kPer9 - 7.5) * 2.5).toFixed(1)),
        confidence: parseFloat(conf.toFixed(1)),
        rationale: `${favPitcher.name} (${favPitcher.hand}HP) averaging ${favPitcher.kPer9.toFixed(1)} K/9 through ${favPitcher.ip} IP this season (${favPitcher.gamesStarted} GS). ERA ${favPitcher.era.toFixed(2)}, WHIP ${favPitcher.whip.toFixed(2)}.${oppPitcher ? ` Opposing ${oppTeam} lineup faces a ${favPitcher.hand === 'R' ? 'right' : 'left'}-hander.` : ''} K rate projects to ${projK.toFixed(1)} Ks over ~5.5 IP.`,
        bet_type: 'player_prop', best_book: 'DraftKings', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp || undefined, away_pitcher: ap || undefined,
        matchup_detail: `${ap?.name || 'TBD'} (${ap?.era.toFixed(2) || '?'} ERA) vs ${hp?.name || 'TBD'} (${hp?.era.toFixed(2) || '?'} ERA) | ${g.venue}`,
      });
    }

    // --- F5 INNINGS (First 5) ---
    if (hp && ap && betterPitcher !== 'even') {
      const conf = Math.min(8.8, 6.0 + pitcherEdge * 0.5);
      bets.push({
        id: `mlb-${g.gamePk}-f5`, game_id: String(g.gamePk),
        pick: `${favTeam} F5 -0.5`,
        edge_pct: parseFloat((pitcherEdge * 1.8).toFixed(1)),
        confidence: parseFloat(conf.toFixed(1)),
        rationale: `${favPitcher.name} (${favPitcher.era.toFixed(2)} ERA, ${favPitcher.whip.toFixed(2)} WHIP, ${favPitcher.kPer9.toFixed(1)} K/9) vs ${oppPitcher!.name} (${oppPitcher!.era.toFixed(2)} ERA, ${oppPitcher!.whip.toFixed(2)} WHIP, ${oppPitcher!.kPer9.toFixed(1)} K/9). First 5 favors ${favTeam} — pitching advantage is strongest before bullpens engage. ${favPitcher.hand}HP vs ${oppPitcher!.hand}HP matchup.`,
        bet_type: 'first_5', best_book: 'FanDuel', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} (${ap.era.toFixed(2)}) vs ${hp.name} (${hp.era.toFixed(2)}) | ${g.venue}`,
      });
    }

    // --- GAME TOTAL (O/U) weighted by pitching + park factor ---
    if (hp && ap) {
      const combinedERA = (hp.era + ap.era) / 2;
      const adjustedForPark = combinedERA * (2 - parkFactor); // Lower adjusted = more runs
      let ouDirection: 'OVER' | 'UNDER';
      let ouReason: string;
      if (adjustedForPark < 3.2 && parkFactor >= 1.05) {
        ouDirection = 'OVER';
        ouReason = `Combined pitching ERA (${combinedERA.toFixed(2)}) at a hitter-friendly park (${g.venue}, factor ${parkFactor.toFixed(2)}). ${hp.name} (${hp.hrPer9.toFixed(2)} HR/9) and ${ap.name} (${ap.hrPer9.toFixed(2)} HR/9) are both vulnerable to the long ball.`;
      } else if (combinedERA < 2.5 || (hp.kPer9 > 9 && ap.kPer9 > 9)) {
        ouDirection = 'UNDER';
        ouReason = `Elite pitching matchup — ${hp.name} (${hp.era.toFixed(2)} ERA, ${hp.kPer9.toFixed(1)} K/9) vs ${ap.name} (${ap.era.toFixed(2)} ERA, ${ap.kPer9.toFixed(1)} K/9). Both starters dominating early this season. Park factor ${parkFactor.toFixed(2)} is neutral-to-pitcher-friendly.`;
      } else if (parkFactor >= 1.10) {
        ouDirection = 'OVER';
        ouReason = `${g.venue} is one of the most hitter-friendly parks in baseball (factor ${parkFactor.toFixed(2)}). Neither starter has been dominant enough to suppress scoring here.`;
      } else {
        continue; // No clear edge on total
      }
      const conf = Math.min(8.5, 6.5 + Math.abs(parkFactor - 1.0) * 10);
      bets.push({
        id: `mlb-${g.gamePk}-ou`, game_id: String(g.gamePk),
        pick: `${ouDirection} (${g.awayTeam}@${g.homeTeam})`,
        edge_pct: parseFloat((Math.abs(parkFactor - 1.0) * 15 + 2).toFixed(1)),
        confidence: parseFloat(conf.toFixed(1)),
        rationale: ouReason,
        bet_type: 'total', best_book: 'BetMGM', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} (${ap.era.toFixed(2)}) vs ${hp.name} (${hp.era.toFixed(2)}) | ${g.venue} (PF: ${parkFactor.toFixed(2)})`,
      });
    }
  }
  return bets.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ============ NHL BET ENGINE — GOALIE-FIRST MODEL ============
function generateNHLBets(games: NHLGameData[]): BestBet[] {
  const bets: BestBet[] = [];
  for (const g of games) {
    const hg = g.homeGoalie;
    const ag = g.awayGoalie;
    const dataConf: 'HIGH' | 'MEDIUM' | 'LOW' = (hg?.confirmed && ag?.confirmed) ? (hg.gamesPlayed > 10 && ag.gamesPlayed > 10 ? 'HIGH' : 'MEDIUM') : 'LOW';

    if (!hg && !ag) {
      bets.push({ id: `nhl-${g.gameId}-pending`, game_id: String(g.gameId), pick: `${g.awayTeam} @ ${g.homeTeam} — PENDING`, edge_pct: 0, confidence: 0, rationale: 'Starting goalie not confirmed for either team. No recommendation.', bet_type: 'NO BET', best_book: '', sport: 'NHL', data_confidence: 'LOW' });
      continue;
    }

    // Goalie comparison
    if (hg && ag) {
      const homeSvDiff = hg.savePct - ag.savePct;
      const homeGAADiff = ag.gaa - hg.gaa; // positive = home goalie better
      const goalieEdge = (homeSvDiff * 100) + (homeGAADiff * 2);

      // Last 5 form
      const hgLast5Avg = hg.last5.length > 0 ? hg.last5.reduce((s, g) => s + g.svPct, 0) / hg.last5.length : hg.savePct;
      const agLast5Avg = ag.last5.length > 0 ? ag.last5.reduce((s, g) => s + g.svPct, 0) / ag.last5.length : ag.savePct;

      if (Math.abs(goalieEdge) > 2) {
        const betterSide = goalieEdge > 0 ? 'home' : 'away';
        const betterGoalie = betterSide === 'home' ? hg : ag;
        const worseGoalie = betterSide === 'home' ? ag : hg;
        const betterTeam = betterSide === 'home' ? g.homeTeam : g.awayTeam;
        const conf = Math.min(9.0, 6.5 + Math.abs(goalieEdge) * 0.3);
        bets.push({
          id: `nhl-${g.gameId}-ml`, game_id: String(g.gameId),
          pick: `${betterTeam} ML`,
          edge_pct: parseFloat(Math.abs(goalieEdge).toFixed(1)),
          confidence: parseFloat(conf.toFixed(1)),
          rationale: `${betterGoalie.name} (${(betterGoalie.savePct * 100).toFixed(1)}% SV, ${betterGoalie.gaa.toFixed(2)} GAA, ${betterGoalie.wins}W) vs ${worseGoalie.name} (${(worseGoalie.savePct * 100).toFixed(1)}% SV, ${worseGoalie.gaa.toFixed(2)} GAA, ${worseGoalie.wins}W). ${betterGoalie.name} last 5 SV%: ${(hgLast5Avg * 100).toFixed(1)}%. Goaltending edge clearly favors ${betterTeam}.`,
          bet_type: 'moneyline', best_book: 'DraftKings', sport: 'NHL', data_confidence: dataConf,
          home_goalie: hg, away_goalie: ag,
          matchup_detail: `${ag.name} (${(ag.savePct * 100).toFixed(1)}% SV) vs ${hg.name} (${(hg.savePct * 100).toFixed(1)}% SV) | ${g.homeTeam} (${g.homeRecord}) vs ${g.awayTeam} (${g.awayRecord})`,
        });
      }

      // Under if both goalies hot
      if (hgLast5Avg > 0.920 && agLast5Avg > 0.920) {
        bets.push({
          id: `nhl-${g.gameId}-under`, game_id: String(g.gameId),
          pick: `UNDER (${g.awayTeam}@${g.homeTeam})`,
          edge_pct: parseFloat(((hgLast5Avg + agLast5Avg - 1.84) * 50).toFixed(1)),
          confidence: parseFloat(Math.min(8.5, 7.0 + (hgLast5Avg - 0.92) * 50).toFixed(1)),
          rationale: `Both goalies in elite recent form. ${hg.name} last 5 SV%: ${(hgLast5Avg * 100).toFixed(1)}%, ${ag.name} last 5 SV%: ${(agLast5Avg * 100).toFixed(1)}%. Low-scoring game expected.`,
          bet_type: 'total', best_book: 'FanDuel', sport: 'NHL', data_confidence: dataConf,
          home_goalie: hg, away_goalie: ag,
        });
      }
    }
  }
  return bets.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ============ NBA BET ENGINE — MATCHUP-BASED ============
async function generateNBABets(): Promise<BestBet[]> {
  const bets: BestBet[] = [];
  try {
    const res = await fetch(`${ESPN_BASE}/basketball/nba/scoreboard`);
    if (!res.ok) return [];
    const json = await res.json();
    const events = json?.events || [];

    for (const ev of events) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      const eventId = ev.id;
      const home = comp.competitors?.find((t: any) => t.homeAway === 'home');
      const away = comp.competitors?.find((t: any) => t.homeAway === 'away');
      const homeTeam = home?.team?.displayName || 'Home';
      const awayTeam = away?.team?.displayName || 'Away';
      const homeRecord = home?.records?.[0]?.summary || '';
      const awayRecord = away?.records?.[0]?.summary || '';

      // Fetch odds
      try {
        const oddsRes = await fetch(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${eventId}/competitions/${eventId}/odds`);
        if (!oddsRes.ok) continue;
        const oddsJson = await oddsRes.json();
        const item = oddsJson?.items?.[0];
        if (!item) continue;

        const spread = parseFloat(item.details?.split(' ').pop() || '0') || 0;
        const overUnder = parseFloat(item.overUnder) || 0;
        const homeML = item.homeTeamOdds?.moneyLine;
        const awayML = item.awayTeamOdds?.moneyLine;
        const homeFav = item.homeTeamOdds?.favorite === true;
        const favTeam = homeFav ? homeTeam : awayTeam;
        const dogTeam = homeFav ? awayTeam : homeTeam;

        // High total = pace-up game
        if (overUnder >= 228) {
          bets.push({
            id: `nba-${eventId}-over`, game_id: eventId,
            pick: `OVER ${overUnder} (${awayTeam}@${homeTeam})`,
            edge_pct: parseFloat(((overUnder - 225) * 0.8).toFixed(1)),
            confidence: parseFloat(Math.min(8.8, 6.5 + (overUnder - 225) * 0.3).toFixed(1)),
            rationale: `Game total set at ${overUnder} — one of the highest on the slate indicating oddsmakers expect a pace-up game. ${homeTeam} (${homeRecord}) hosting ${awayTeam} (${awayRecord}). High totals correlate with increased scoring variance favoring the over.`,
            bet_type: 'total', best_book: 'FanDuel', sport: 'NBA', data_confidence: 'MEDIUM',
            matchup_detail: `${awayTeam} (${awayRecord}) @ ${homeTeam} (${homeRecord}) | O/U: ${overUnder} | Spread: ${spread}`,
          });
        }

        // Spread value
        if (Math.abs(spread) >= 3 && Math.abs(spread) <= 7) {
          bets.push({
            id: `nba-${eventId}-spread`, game_id: eventId,
            pick: `${favTeam} ${spread > 0 ? '+' : ''}${spread}`,
            edge_pct: parseFloat((Math.abs(spread) * 0.8).toFixed(1)),
            confidence: parseFloat(Math.min(8.5, 6.5 + Math.abs(spread) * 0.25).toFixed(1)),
            rationale: `${favTeam} favored by ${Math.abs(spread)} at home. ${favTeam} (${homeFav ? homeRecord : awayRecord}) has the stronger record. Spread is in the value range (3-7 pts) where favorites cover at a higher rate in the NBA.`,
            bet_type: 'spread', best_book: 'DraftKings', sport: 'NBA', data_confidence: 'MEDIUM',
            matchup_detail: `${awayTeam} (${awayRecord}) @ ${homeTeam} (${homeRecord}) | Spread: ${spread}`,
          });
        }

        // Moneyline value on close games
        if (homeML && awayML && Math.abs(spread) <= 3) {
          bets.push({
            id: `nba-${eventId}-ml`, game_id: eventId,
            pick: `${homeFav ? homeTeam : dogTeam} ML (${homeFav ? homeML : awayML > 0 ? '+' + awayML : awayML})`,
            edge_pct: 4.5,
            confidence: 7.5,
            rationale: `Near pick'em game (spread ${spread}). ${homeTeam} has home court advantage. Close lines offer value on the home team ML in playoff/late-season scenarios.`,
            bet_type: 'moneyline', best_book: 'Caesars', sport: 'NBA', data_confidence: 'MEDIUM',
            matchup_detail: `${awayTeam} (${awayRecord}) @ ${homeTeam} (${homeRecord})`,
          });
        }
      } catch {}
    }
  } catch {}
  return bets.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ============ CACHE ============
async function cacheGames(games: Game[]) {
  if (!supabaseUrl || games.length === 0) return;
  try { await supabase.from('games').upsert(games.map(g => ({ ...g, date: new Date().toISOString().split('T')[0] })), { onConflict: 'id' }); } catch {}
}
async function cacheNews(news: NewsItem[]) {
  if (!supabaseUrl || news.length === 0) return;
  try { await supabase.from('news_items').upsert(news, { onConflict: 'id' }); } catch {}
}

// ============ PUBLIC API ============
export const api = {
  games: async (): Promise<Game[]> => {
    const [mlb, nba, nhl] = await Promise.all([
      fetchEspnScoreboard('MLB'), fetchEspnScoreboard('NBA'), fetchEspnScoreboard('NHL'),
    ]);
    const all = [...mlb, ...nba, ...nhl];
    cacheGames(all);
    return all;
  },
  bestBets: async (): Promise<BestBet[]> => {
    const [mlbGames, nhlGames, nbaBets, weather] = await Promise.all([
      fetchMLBScheduleWithPitchers(),
      fetchNHLGamesWithGoalies(),
      generateNBABets(),
      fetchWeather(),
    ]);
    const mlbBets = generateMLBBets(mlbGames, weather);
    const nhlBets = generateNHLBets(nhlGames);
    return [...mlbBets, ...nbaBets, ...nhlBets];
  },
  lines: async (gameId: string): Promise<LineMovement[]> => {
    const { data } = await supabase.from('lines').select('*').eq('game_id', gameId).order('recorded_at');
    return data || [];
  },
  news: async (): Promise<NewsItem[]> => {
    const live = await fetchEspnNews();
    if (live.length > 0) { cacheNews(live); return live; }
    const { data } = await supabase.from('news_items').select('*').order('fetched_at', { ascending: false }).limit(10);
    return data || [];
  },
  weather: async (): Promise<WeatherData[]> => fetchWeather(),
  history: async (): Promise<BestBet[]> => {
    const { data } = await supabase.from('best_bets').select('*').not('result', 'is', null).order('created_at', { ascending: false }).limit(20);
    return data || [];
  },
  parlays: async (): Promise<Parlay[]> => {
    const { data } = await supabase.from('parlays').select('*').eq('date', new Date().toISOString().split('T')[0]);
    return data || [];
  },
};
