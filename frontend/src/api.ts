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
  last3: { ip: number; er: number; k: number; date: string }[];
  homeEra: number;
  awayEra: number;
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
  weather_detail?: string;
  umpire_detail?: string;
  bullpen_detail?: string;
  recommendation?: 'BET' | 'LEAN' | 'NO BET';
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
  wind_direction: string;
  condition: string;
  impact_text: string;
  is_dome: boolean;
  is_significant_wind: boolean;
  is_cold_game: boolean;
  precip_chance: number;
}
export interface Parlay {
  id: string;
  legs: { game_id: string; pick: string; confidence: number }[];
  combined_odds: number;
  num_legs: number;
}
export interface GameCard {
  game_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  game_time: string;
  venue: string;
  bets: BestBet[];
}

export interface StreakData {
  wins: number;
  losses: number;
  pushes: number;
  streak: string;
  streakType: 'W' | 'L' | 'P' | 'none';
  streakCount: number;
  roi: number;
  totalWagered: number;
  totalProfit: number;
  hasBets: boolean;
}

export interface BetSlipLeg {
  id: string;
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
  betType: 'moneyline' | 'spread' | 'total';
  pick: string;
  odds: number;
  line?: number;
}

export interface UserBet {
  id: string;
  date: string;
  pick: string;
  sport: string;
  bet_type: string;
  result: string | null;
  units: number;
  odds: number;
  profit: number;
  game_id: string;
  legs: BetSlipLeg[] | null;
  total_odds: number;
  stake: number;
  potential_payout: number;
  status: string;
  created_at: string;
  settled_at: string | null;
}

// ============ ESPN HELPERS ============
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const SPORT_MAP: Record<string, string> = {
  MLB: 'baseball/mlb',
  NBA: 'basketball/nba',
  NHL: 'hockey/nhl',
  NFL: 'football/nfl'
};

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
      return {
        id: ev.id, home_team: home?.team?.displayName || 'TBD',
        away_team: away?.team?.displayName || 'TBD', game_time: ev.date, sport,
        home_score: Number(home?.score ?? 0), away_score: Number(away?.score ?? 0),
        status: parseEspnStatus(comp), stadium: comp?.venue?.fullName || ''
      };
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
        all.push({ id: String(a.id || Math.random()), headline: a.headline || '',
          url: a.links?.web?.href || '#', source: 'ESPN',
          fetched_at: a.published || new Date().toISOString(), sport: labels[i] });
      });
    } catch {}
  }
  return all.slice(0, 10);
}

// ============ MLB STATS API ============
const MLB_API = 'https://statsapi.mlb.com/api/v1';

interface MLBScheduleGame {
  gamePk: number;
  homeTeam: string; awayTeam: string;
  homeRecord: string; awayRecord: string;
  homePitcher: PitcherStats | null; awayPitcher: PitcherStats | null;
  homeTeamId: number; awayTeamId: number;
  venue: string; gameTime: string;
  umpire: { name: string; kPer9: number; runsPerGame: number; overPct: number } | null;
}

async function fetchTeamKRate(teamId: number): Promise<number> {
  try {
    const res = await fetch(`${MLB_API}/teams/${teamId}/stats?stats=season&group=hitting&season=2026`);
    if (!res.ok) return 0.22;
    const json = await res.json();
    const stat = json?.stats?.[0]?.splits?.[0]?.stat;
    if (!stat) return 0.22;
    const so = stat.strikeOuts || 0;
    const pa = stat.plateAppearances || 1;
    return so / pa;
  } catch { return 0.22; }
}

async function fetchTeamBattingStats(teamId: number): Promise<{ ops: number; avg: number; slg: number; obp: number; kRate: number; bbRate: number; hr: number; woba: number }> {
  try {
    const res = await fetch(`${MLB_API}/teams/${teamId}/stats?stats=season&group=hitting&season=2026`);
    if (!res.ok) return { ops: .720, avg: .250, slg: .400, obp: .320, kRate: .22, bbRate: .08, hr: 0, woba: .310 };
    const json = await res.json();
    const s = json?.stats?.[0]?.splits?.[0]?.stat;
    if (!s) return { ops: .720, avg: .250, slg: .400, obp: .320, kRate: .22, bbRate: .08, hr: 0, woba: .310 };
    const pa = s.plateAppearances || 1;
    return {
      ops: parseFloat(s.ops) || .720,
      avg: parseFloat(s.avg) || .250,
      slg: parseFloat(s.slg) || .400,
      obp: parseFloat(s.obp) || .320,
      kRate: (s.strikeOuts || 0) / pa,
      bbRate: (s.baseOnBalls || 0) / pa,
      hr: s.homeRuns || 0,
      woba: parseFloat(s.ops) * 0.44 || .310
    };
  } catch { return { ops: .720, avg: .250, slg: .400, obp: .320, kRate: .22, bbRate: .08, hr: 0, woba: .310 }; }
}

async function fetchBullpenEra(teamId: number): Promise<{ era: number; whip: number; kPer9: number; ip: number }> {
  try {
    const res = await fetch(`${MLB_API}/teams/${teamId}/stats?stats=season&group=pitching&season=2026`);
    if (!res.ok) return { era: 4.00, whip: 1.30, kPer9: 8.5, ip: 0 };
    const json = await res.json();
    const s = json?.stats?.[0]?.splits?.[0]?.stat;
    if (!s) return { era: 4.00, whip: 1.30, kPer9: 8.5, ip: 0 };
    return {
      era: parseFloat(s.era) || 4.00,
      whip: parseFloat(s.whip) || 1.30,
      kPer9: parseFloat(s.strikeoutsPer9Inn) || 8.5,
      ip: parseFloat(s.inningsPitched) || 0
    };
  } catch { return { era: 4.00, whip: 1.30, kPer9: 8.5, ip: 0 }; }
}

async function fetchPitcherStats(playerId: number): Promise<PitcherStats | null> {
  try {
    const res = await fetch(`${MLB_API}/people/${playerId}?hydrate=stats(group=[pitching],type=[season],season=2026)`);
    if (!res.ok) return null;
    const json = await res.json();
    const person = json?.people?.[0];
    if (!person) return null;
    const stat = person.stats?.[0]?.splits?.[0]?.stat;
    const base: PitcherStats = {
      name: person.fullName, hand: person.pitchHand?.code || '?',
      era: parseFloat(stat?.era) || 0, whip: parseFloat(stat?.whip) || 0,
      kPer9: parseFloat(stat?.strikeoutsPer9Inn) || 0, bbPer9: parseFloat(stat?.walksPer9Inn) || 0,
      hrPer9: parseFloat(stat?.homeRunsPer9) || 0, ip: parseFloat(stat?.inningsPitched) || 0,
      gamesStarted: stat?.gamesStarted || 0, strikeoutPct: stat?.strikePercentage || '0',
      groundOutRate: stat?.groundOutsToAirouts || '0', confirmed: false,
      last3: [], homeEra: parseFloat(stat?.era) || 0, awayEra: parseFloat(stat?.era) || 0
    };
    // Fetch game log for last 3 starts
    try {
      const glRes = await fetch(`${MLB_API}/people/${playerId}/stats?stats=gameLog&group=pitching&season=2026`);
      if (glRes.ok) {
        const glJson = await glRes.json();
        const splits = glJson?.stats?.[0]?.splits || [];
        const starts = splits.filter((s: any) => s.stat?.gamesStarted > 0).slice(-3);
        base.last3 = starts.map((s: any) => ({
          ip: parseFloat(s.stat?.inningsPitched) || 0,
          er: s.stat?.earnedRuns || 0,
          k: s.stat?.strikeOuts || 0,
          date: s.date || ''
        }));
      }
    } catch {}
    return base;
  } catch { return null; }
}

async function fetchMLBScheduleWithPitchers(): Promise<MLBScheduleGame[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${MLB_API}/schedule?sportId=1&date=${today}&hydrate=probablePitcher(note),linescore,team,officials`);
    if (!res.ok) return [];
    const json = await res.json();
    const games = json?.dates?.[0]?.games || [];
    const results: MLBScheduleGame[] = [];
    for (const g of games) {
      const homeProb = g.teams?.home?.probablePitcher;
      const awayProb = g.teams?.away?.probablePitcher;
      const homeId = homeProb?.id;
      const awayId = awayProb?.id;
      const homeConfirmed = !!homeId;
      const awayConfirmed = !!awayId;
      const [homePitcher, awayPitcher] = await Promise.all([
        homeId ? fetchPitcherStats(homeId) : null,
        awayId ? fetchPitcherStats(awayId) : null,
      ]);
      if (homePitcher) homePitcher.confirmed = homeConfirmed;
      if (awayPitcher) awayPitcher.confirmed = awayConfirmed;
      // Extract umpire
      let umpire: MLBScheduleGame['umpire'] = null;
      const officials = g.officials || [];
      const hp = officials.find((o: any) => o.officialType === 'Home Plate');
      if (hp) {
        umpire = { name: hp.official?.fullName || 'Unknown', kPer9: 0, runsPerGame: 4.3, overPct: 50 };
      }
      results.push({
        gamePk: g.gamePk, homeTeam: g.teams?.home?.team?.name || 'TBD',
        awayTeam: g.teams?.away?.team?.name || 'TBD',
        homeRecord: `${g.teams?.home?.leagueRecord?.wins || 0}-${g.teams?.home?.leagueRecord?.losses || 0}`,
        awayRecord: `${g.teams?.away?.leagueRecord?.wins || 0}-${g.teams?.away?.leagueRecord?.losses || 0}`,
        homePitcher, awayPitcher,
        homeTeamId: g.teams?.home?.team?.id || 0, awayTeamId: g.teams?.away?.team?.id || 0,
        venue: g.venue?.name || '', gameTime: g.gameDate || '', umpire
      });
    }
    return results;
  } catch { return []; }
}

// ============ NHL API — GOALIE DATA ============
const NHL_API = 'https://api-web.nhle.com/v1';
interface NHLGameData {
  gameId: number; homeTeam: string; awayTeam: string;
  homeAbbrev: string; awayAbbrev: string;
  homeRecord: string; awayRecord: string;
  homeGoalie: GoalieStats | null; awayGoalie: GoalieStats | null;
  homeGoalieConfirmed: boolean; awayGoalieConfirmed: boolean;
}
async function fetchNHLGoalieById(goalieId: number): Promise<GoalieStats | null> {
  try {
    const playerRes = await fetch(`${NHL_API}/player/${goalieId}/landing`);
    if (!playerRes.ok) return null;
    const p = await playerRes.json();
    const season = p?.featuredStats?.season?.subSeason;
    const last5Raw = p?.last5Games || [];
    const last5 = last5Raw.slice(0, 5).map((g: any) => ({
      date: g.gameDate || '', ga: g.goalsAgainst || 0, sa: g.shotsAgainst || 0,
      svPct: g.savePctg || 0, decision: g.decision || ''
    }));
    return {
      name: `${p.firstName?.default || ''} ${p.lastName?.default || ''}`.trim(),
      savePct: season?.savePctg || 0, gaa: season?.goalsAgainstAvg || 0,
      wins: season?.wins || 0, losses: season?.losses || 0,
      gamesPlayed: season?.gamesPlayed || 0, last5, confirmed: false
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
      const homeStarterId = g.homeTeam?.startingGoalie?.id;
      const awayStarterId = g.awayTeam?.startingGoalie?.id;
      const homeGoalieConfirmed = !!homeStarterId;
      const awayGoalieConfirmed = !!awayStarterId;
      let homeGoalie: GoalieStats | null = null;
      let awayGoalie: GoalieStats | null = null;
      if (homeStarterId) {
        homeGoalie = await fetchNHLGoalieById(homeStarterId);
        if (homeGoalie) homeGoalie.confirmed = true;
      } else if (homeAbbrev) {
        try {
          const rr = await fetch(`${NHL_API}/roster/${homeAbbrev}/current`);
          if (rr.ok) { const r = await rr.json(); const gl = r?.goalies || []; if (gl.length > 0) { homeGoalie = await fetchNHLGoalieById(gl[0]?.id); if (homeGoalie) homeGoalie.confirmed = false; } }
        } catch {}
      }
      if (awayStarterId) {
        awayGoalie = await fetchNHLGoalieById(awayStarterId);
        if (awayGoalie) awayGoalie.confirmed = true;
      } else if (awayAbbrev) {
        try {
          const rr = await fetch(`${NHL_API}/roster/${awayAbbrev}/current`);
          if (rr.ok) { const r = await rr.json(); const gl = r?.goalies || []; if (gl.length > 0) { awayGoalie = await fetchNHLGoalieById(gl[0]?.id); if (awayGoalie) awayGoalie.confirmed = false; } }
        } catch {}
      }
      results.push({ gameId: g.id, homeTeam: g.homeTeam?.name?.default || '', awayTeam: g.awayTeam?.name?.default || '',
        homeAbbrev, awayAbbrev, homeRecord: g.homeTeam?.record || '', awayRecord: g.awayTeam?.record || '',
        homeGoalie, awayGoalie, homeGoalieConfirmed, awayGoalieConfirmed });
    }
    return results;
  } catch { return []; }
}

// ============ WEATHER ============
const VENUE_COORDS: Record<string, { lat: number; lon: number }> = {
  'Yankee Stadium': { lat: 40.8296, lon: -73.9262 }, 'Fenway Park': { lat: 42.3467, lon: -71.0972 },
  'Wrigley Field': { lat: 41.9484, lon: -87.6553 }, 'Coors Field': { lat: 39.7559, lon: -104.9942 },
  'Oracle Park': { lat: 37.7786, lon: -122.3893 }, 'Dodger Stadium': { lat: 34.0739, lon: -118.24 },
  'Citizens Bank Park': { lat: 39.9061, lon: -75.1665 }, 'Busch Stadium': { lat: 38.6226, lon: -90.1928 },
  'Great American Ball Park': { lat: 39.0974, lon: -84.5082 }, 'PNC Park': { lat: 40.4469, lon: -80.0057 },
  'Oriole Park at Camden Yards': { lat: 39.2838, lon: -76.6218 }, 'Kauffman Stadium': { lat: 39.0517, lon: -94.4803 },
  'Target Field': { lat: 44.9817, lon: -93.2778 }, 'Guaranteed Rate Field': { lat: 41.83, lon: -87.6339 },
  'Comerica Park': { lat: 42.339, lon: -83.0485 }, 'Progressive Field': { lat: 41.4962, lon: -81.6852 },
  'Angel Stadium': { lat: 33.8003, lon: -117.8827 }, 'T-Mobile Park': { lat: 47.5914, lon: -122.3326 },
  'Petco Park': { lat: 32.7076, lon: -117.157 }, 'Oakland Coliseum': { lat: 37.7516, lon: -122.2005 },
  'Nationals Park': { lat: 38.873, lon: -77.0074 }, 'Citi Field': { lat: 40.7571, lon: -73.8458 },
  'American Family Field': { lat: 43.028, lon: -87.9712 }, 'Minute Maid Park': { lat: 29.7573, lon: -95.3555 },
  'Sutter Health Park': { lat: 38.5805, lon: -121.5073 },
};
const DOME_VENUES = new Set([
  'Tropicana Field', 'Minute Maid Park', 'Globe Life Field', 'loanDepot park', 'Rogers Centre',
  'American Family Field', 'Chase Field', 'T-Mobile Park', 'Sutter Health Park',
]);
function wmoToCondition(code: number): string {
  if (code <= 1) return 'Clear'; if (code <= 3) return 'Partly Cloudy'; if (code <= 48) return 'Cloudy/Fog';
  if (code <= 67) return 'Rain'; if (code <= 77) return 'Snow'; if (code <= 82) return 'Heavy Rain'; return 'Thunderstorm';
}
async function fetchGameWeather(venue: string): Promise<WeatherData> {
  const isDome = DOME_VENUES.has(venue);
  if (isDome) return { id: 0, game_id: '', temp_f: 72, wind_mph: 0, wind_direction: 'N/A', condition: 'Climate Controlled', impact_text: `${venue} (Dome)`, is_dome: true, is_significant_wind: false, is_cold_game: false, precip_chance: 0 };
  const coords = VENUE_COORDS[venue];
  if (!coords) return { id: 0, game_id: '', temp_f: 72, wind_mph: 5, wind_direction: 'Unknown', condition: 'Unknown', impact_text: venue, is_dome: false, is_significant_wind: false, is_cold_game: false, precip_chance: 0 };
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`);
    if (!res.ok) return { id: 0, game_id: '', temp_f: 72, wind_mph: 5, wind_direction: 'Unknown', condition: 'Unknown', impact_text: venue, is_dome: false, is_significant_wind: false, is_cold_game: false, precip_chance: 0 };
    const json = await res.json();
    const cur = json?.current || json?.current_weather;
    const temp = Math.round(cur?.temperature_2m ?? cur?.temperature ?? 72);
    const wind = Math.round(cur?.wind_speed_10m ?? cur?.windspeed ?? 5);
    const windDir = cur?.wind_direction_10m ?? cur?.winddirection ?? 0;
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    const dirStr = dirs[Math.round(windDir / 22.5) % 16];
    const isWind = wind >= 15;
    const isCold = temp < 50;
    let impact = `${temp}F, Wind ${wind}mph ${dirStr}`;
    if (isWind) impact += ' ⚠️ SIGNIFICANT WIND';
    if (isCold) impact += ' ❄️ COLD GAME';
    return { id: 0, game_id: '', temp_f: temp, wind_mph: wind, wind_direction: dirStr, condition: wmoToCondition(cur?.weather_code ?? 0), impact_text: impact, is_dome: false, is_significant_wind: isWind, is_cold_game: isCold, precip_chance: 0 };
  } catch { return { id: 0, game_id: '', temp_f: 72, wind_mph: 5, wind_direction: 'Unknown', condition: 'Unknown', impact_text: venue, is_dome: false, is_significant_wind: false, is_cold_game: false, precip_chance: 0 }; }
}
async function fetchWeather(): Promise<WeatherData[]> {
  const cities = [
    { lat: 38.6226, lon: -90.1928, label: 'St. Louis' }, { lat: 40.8296, lon: -73.9262, label: 'New York' },
    { lat: 41.8827, lon: -87.6233, label: 'Chicago' }, { lat: 34.0739, lon: -118.24, label: 'Los Angeles' },
    { lat: 42.3467, lon: -71.0972, label: 'Boston' },
  ];
  const out: WeatherData[] = [];
  try {
    const lats = cities.map(v => v.lat).join(','); const lons = cities.map(v => v.lon).join(',');
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`);
    if (!res.ok) return out;
    const json = await res.json();
    const results = Array.isArray(json) ? json : [json];
    results.forEach((r: any, i: number) => { const cur = r?.current || r?.current_weather; if (!cur) return; out.push({ id: i, game_id: '', temp_f: Math.round(cur.temperature_2m ?? cur.temperature ?? 0), wind_mph: Math.round(cur.wind_speed_10m ?? cur.windspeed ?? 0), wind_direction: '', condition: wmoToCondition(cur.weather_code ?? 0), impact_text: cities[i]?.label || '', is_dome: false, is_significant_wind: false, is_cold_game: false, precip_chance: 0 }); });
  } catch {}
  return out;
}

// ============ BALLPARK FACTORS ============
const PARK_FACTOR: Record<string, { runs: number; hr: number; hits: number; notes: string }> = {
  'Coors Field': { runs: 1.38, hr: 1.40, hits: 1.20, notes: 'Altitude 5280ft, ball carries significantly' },
  'Great American Ball Park': { runs: 1.15, hr: 1.25, hits: 1.05, notes: 'Small dimensions, short RF porch' },
  'Fenway Park': { runs: 1.12, hr: 1.05, hits: 1.15, notes: 'Green Monster creates doubles, short RF' },
  'Yankee Stadium': { runs: 1.10, hr: 1.30, hits: 1.00, notes: 'Short RF porch 314ft, homer-friendly' },
  'Citizens Bank Park': { runs: 1.09, hr: 1.15, hits: 1.05, notes: 'Hitter-friendly, moderate dimensions' },
  'Wrigley Field': { runs: 1.08, hr: 1.10, hits: 1.05, notes: 'Wind-dependent, blowing out = big overs' },
  'Globe Life Field': { runs: 1.02, hr: 1.05, hits: 1.00, notes: 'Retractable roof, neutral' },
  'Oriole Park at Camden Yards': { runs: 1.06, hr: 1.15, hits: 1.00, notes: 'Short LF wall, HR friendly' },
  'Guaranteed Rate Field': { runs: 1.04, hr: 1.10, hits: 1.00, notes: 'Above average HR park' },
  'Chase Field': { runs: 1.03, hr: 1.05, hits: 1.00, notes: 'Retractable roof, dry air' },
  'Minute Maid Park': { runs: 1.05, hr: 1.10, hits: 1.00, notes: 'Retractable roof, Crawford Boxes short LF' },
  'Dodger Stadium': { runs: 0.95, hr: 0.95, hits: 0.95, notes: 'Spacious outfield, marine layer suppresses HR' },
  'Oracle Park': { runs: 0.90, hr: 0.75, hits: 0.95, notes: 'Cold marine air, deep RF, extreme pitcher park' },
  'Tropicana Field': { runs: 0.93, hr: 0.90, hits: 0.95, notes: 'Dome, catwalk interference, dead air' },
  'T-Mobile Park': { runs: 0.92, hr: 0.85, hits: 0.95, notes: 'Retractable roof, marine influence' },
  'Oakland Coliseum': { runs: 0.91, hr: 0.80, hits: 0.95, notes: 'Vast foul territory, deep OF' },
  'Petco Park': { runs: 0.93, hr: 0.85, hits: 0.95, notes: 'Marine layer, spacious OF dimensions' },
  'Kauffman Stadium': { runs: 0.96, hr: 0.90, hits: 1.00, notes: 'Open outfield, wind factor' },
  'Comerica Park': { runs: 0.96, hr: 0.90, hits: 0.95, notes: 'Deep LCF, spacious' },
  'PNC Park': { runs: 0.98, hr: 0.95, hits: 1.00, notes: 'Near neutral, river winds variable' },
  'Target Field': { runs: 1.00, hr: 1.00, hits: 1.00, notes: 'Neutral, wind variable' },
  'Busch Stadium': { runs: 0.97, hr: 0.95, hits: 0.98, notes: 'Slight pitcher lean' },
  'Nationals Park': { runs: 1.00, hr: 1.05, hits: 0.98, notes: 'Neutral to slight HR boost' },
  'Citi Field': { runs: 0.95, hr: 0.90, hits: 0.95, notes: 'Pitcher-friendly, deep OF walls' },
  'Sutter Health Park': { runs: 1.05, hr: 1.10, hits: 1.00, notes: 'Warm Sacramento air, hitter lean' },
  'American Family Field': { runs: 1.02, hr: 1.05, hits: 1.00, notes: 'Retractable roof, neutral' },
  'Progressive Field': { runs: 0.98, hr: 0.95, hits: 1.00, notes: 'Near neutral' },
  'Angel Stadium': { runs: 0.98, hr: 1.00, hits: 0.98, notes: 'Neutral' },
};
function getParkData(venue: string): { runs: number; hr: number; hits: number; notes: string } {
  for (const [k, v] of Object.entries(PARK_FACTOR)) {
    if (venue.toLowerCase().includes(k.toLowerCase().split(' ')[0])) return v;
  }
  return { runs: 1.0, hr: 1.0, hits: 1.0, notes: 'Unknown park' };
}

// ============ FULL MLB GAME CARD ENGINE ============
async function generateMLBFullCards(games: MLBScheduleGame[]): Promise<BestBet[]> {
  const allBets: BestBet[] = [];
  for (const g of games) {
    const hp = g.homePitcher;
    const ap = g.awayPitcher;
    // GATE: require BOTH pitchers confirmed
    if (!hp?.confirmed || !ap?.confirmed) continue;
    const dataConf: 'HIGH' | 'MEDIUM' | 'LOW' = (hp.ip > 10 && ap.ip > 10) ? 'HIGH' : 'MEDIUM';
    const park = getParkData(g.venue);
    const wx = await fetchGameWeather(g.venue);
    const [awayKRate, homeKRate] = await Promise.all([fetchTeamKRate(g.awayTeamId), fetchTeamKRate(g.homeTeamId)]);
    const [homeBat, awayBat] = await Promise.all([fetchTeamBattingStats(g.homeTeamId), fetchTeamBattingStats(g.awayTeamId)]);
    const [homeBullpen, awayBullpen] = await Promise.all([fetchBullpenEra(g.homeTeamId), fetchBullpenEra(g.awayTeamId)]);
    const umpStr = g.umpire ? `HP Umpire: ${g.umpire.name} (${g.umpire.runsPerGame} R/G avg, ${g.umpire.overPct}% overs)` : 'Umpire: TBD';
    const wxStr = wx.is_dome ? `${wx.impact_text}` : `${wx.condition} ${wx.temp_f}F, Wind ${wx.wind_mph}mph ${wx.wind_direction}`;
    const bpStr = `Home BP ERA: ${homeBullpen.era.toFixed(2)} | Away BP ERA: ${awayBullpen.era.toFixed(2)}`;
    const last3Str = (p: PitcherStats) => p.last3.length > 0 ? p.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', ') : 'No recent starts';
    // --- PITCHING QUALITY SCORES ---
    const homeScore = (10 - hp.era) + (5 - hp.whip * 3) + hp.kPer9 - hp.bbPer9;
    const awayScore = (10 - ap.era) + (5 - ap.whip * 3) + ap.kPer9 - ap.bbPer9;
    const pitcherEdge = Math.abs(homeScore - awayScore);
    const betterPitcher: 'home' | 'away' | 'even' = homeScore > awayScore + 1.5 ? 'home' : awayScore > homeScore + 1.5 ? 'away' : 'even';
    // Weather impact on totals
    let wxTotalAdj = 0;
    if (!wx.is_dome) {
      if (wx.wind_mph >= 15) wxTotalAdj += 0.5;
      if (wx.temp_f >= 85) wxTotalAdj += 0.3;
      if (wx.temp_f < 50) wxTotalAdj -= 0.3;
    }
    // ===== 1. MONEYLINE =====
    if (betterPitcher !== 'even') {
      const fav = betterPitcher === 'home' ? hp : ap;
      const dog = betterPitcher === 'home' ? ap : hp;
      const favTeam = betterPitcher === 'home' ? g.homeTeam : g.awayTeam;
      const favRec = betterPitcher === 'home' ? g.homeRecord : g.awayRecord;
      const favBat = betterPitcher === 'home' ? homeBat : awayBat;
      const dogBat = betterPitcher === 'home' ? awayBat : homeBat;
      const favBp = betterPitcher === 'home' ? homeBullpen : awayBullpen;
      const dogBp = betterPitcher === 'home' ? awayBullpen : homeBullpen;
      const mlConf = Math.min(9.0, 6.0 + pitcherEdge * 0.4 + (favBp.era < dogBp.era ? 0.5 : 0));
      const rec: 'BET' | 'LEAN' | 'NO BET' = mlConf >= 8.0 ? 'BET' : mlConf >= 7.0 ? 'LEAN' : 'NO BET';
      allBets.push({
        id: `mlb-${g.gamePk}-ml`, game_id: String(g.gamePk),
        pick: `${favTeam} ML`, edge_pct: parseFloat((pitcherEdge * 1.5).toFixed(1)),
        confidence: parseFloat(mlConf.toFixed(1)),
        rationale: `${fav.name} (${fav.era.toFixed(2)} ERA, ${fav.whip.toFixed(2)} WHIP, ${fav.kPer9.toFixed(1)} K/9, last 3: ${last3Str(fav)}) vs ${dog.name} (${dog.era.toFixed(2)} ERA, ${dog.whip.toFixed(2)} WHIP, ${dog.kPer9.toFixed(1)} K/9, last 3: ${last3Str(dog)}). ${favTeam} (${favRec}) offense: ${favBat.ops.toFixed(3)} OPS. Bullpen edge: ${favBp.era.toFixed(2)} vs ${dogBp.era.toFixed(2)} ERA.`,
        bet_type: 'moneyline', best_book: 'DraftKings', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} (${ap.era.toFixed(2)}) vs ${hp.name} (${hp.era.toFixed(2)}) | ${g.venue}`,
        weather_detail: wxStr, umpire_detail: umpStr, bullpen_detail: bpStr, recommendation: rec
      });
    }
    // ===== 2. RUN LINE =====
    if (betterPitcher !== 'even') {
      const fav = betterPitcher === 'home' ? hp : ap;
      const dog = betterPitcher === 'home' ? ap : hp;
      const favTeam = betterPitcher === 'home' ? g.homeTeam : g.awayTeam;
      const favBp = betterPitcher === 'home' ? homeBullpen : awayBullpen;
      const dogBp = betterPitcher === 'home' ? awayBullpen : homeBullpen;
      const avgIpLast3 = fav.last3.length > 0 ? fav.last3.reduce((s, x) => s + x.ip, 0) / fav.last3.length : 5.0;
      const rlConf = Math.min(8.8, 5.5 + pitcherEdge * 0.35 + (avgIpLast3 > 6 ? 0.8 : 0) + (favBp.era < 3.5 ? 0.5 : 0));
      const rlRec: 'BET' | 'LEAN' | 'NO BET' = rlConf >= 8.0 ? 'BET' : rlConf >= 7.0 ? 'LEAN' : 'NO BET';
      allBets.push({
        id: `mlb-${g.gamePk}-rl`, game_id: String(g.gamePk),
        pick: `${favTeam} -1.5`, edge_pct: parseFloat((pitcherEdge * 1.2).toFixed(1)),
        confidence: parseFloat(rlConf.toFixed(1)),
        rationale: `${fav.name} averaging ${avgIpLast3.toFixed(1)} IP over last ${fav.last3.length} starts (last 3: ${last3Str(fav)}). Only giving up ${fav.last3.length > 0 ? (fav.last3.reduce((s, x) => s + x.er, 0) / fav.last3.length).toFixed(1) : '?'} ER/start. ${favTeam} bullpen ERA ${favBp.era.toFixed(2)} vs opponent BP ERA ${dogBp.era.toFixed(2)}. Park factor: ${park.runs.toFixed(2)} (${park.notes}).`,
        bet_type: 'run_line', best_book: 'FanDuel', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} vs ${hp.name} | ${g.venue} (PF: ${park.runs.toFixed(2)})`,
        weather_detail: wxStr, umpire_detail: umpStr, bullpen_detail: bpStr, recommendation: rlRec
      });
    }
    // ===== 3. GAME TOTAL (O/U) =====
    const combinedERA = (hp.era + ap.era) / 2;
    const parkAdj = combinedERA * park.runs;
    const projRuns = (hp.era * 5 / 9 + ap.era * 5 / 9) * park.runs + wxTotalAdj;
    let ouDir: 'OVER' | 'UNDER' | null = null;
    let ouReason = '';
    if (park.runs >= 1.10 || (park.runs >= 1.05 && wx.temp_f >= 80)) {
      ouDir = 'OVER';
      ouReason = `Hitter-friendly ${g.venue} (PF ${park.runs.toFixed(2)}, HR factor ${park.hr.toFixed(2)}). ${park.notes}. ${hp.name} HR/9: ${hp.hrPer9.toFixed(2)}, ${ap.name} HR/9: ${ap.hrPer9.toFixed(2)}. ${!wx.is_dome ? `Weather: ${wx.temp_f}F, wind ${wx.wind_mph}mph ${wx.wind_direction}.` : 'Dome — climate controlled.'} Home lineup OPS: ${homeBat.ops.toFixed(3)}, Away OPS: ${awayBat.ops.toFixed(3)}.`;
    } else if (combinedERA < 3.0 || (hp.kPer9 > 9.5 && ap.kPer9 > 9.5)) {
      ouDir = 'UNDER';
      ouReason = `Elite pitching matchup: ${hp.name} (${hp.era.toFixed(2)} ERA, ${hp.kPer9.toFixed(1)} K/9) vs ${ap.name} (${ap.era.toFixed(2)} ERA, ${ap.kPer9.toFixed(1)} K/9). Park factor ${park.runs.toFixed(2)} neutral-to-pitcher-friendly. ${!wx.is_dome ? `${wx.temp_f}F, wind ${wx.wind_mph}mph.` : 'Dome.'}`;
    } else if (park.runs <= 0.93) {
      ouDir = 'UNDER';
      ouReason = `${g.venue} is one of MLB's most pitcher-friendly parks (PF ${park.runs.toFixed(2)}, HR factor ${park.hr.toFixed(2)}). ${park.notes}. Combined starter ERA: ${combinedERA.toFixed(2)}.`;
    }
    if (ouDir) {
      const ouConf = Math.min(8.8, 6.5 + Math.abs(park.runs - 1.0) * 12 + (combinedERA < 3.0 ? 1.0 : 0) + wxTotalAdj);
      const ouRec: 'BET' | 'LEAN' | 'NO BET' = ouConf >= 8.0 ? 'BET' : ouConf >= 7.0 ? 'LEAN' : 'NO BET';
      allBets.push({
        id: `mlb-${g.gamePk}-ou`, game_id: String(g.gamePk),
        pick: `${ouDir} (${g.awayTeam}@${g.homeTeam})`, edge_pct: parseFloat((Math.abs(park.runs - 1.0) * 15 + 2).toFixed(1)),
        confidence: parseFloat(ouConf.toFixed(1)),
        rationale: ouReason, bet_type: 'total', best_book: 'BetMGM', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} (${ap.era.toFixed(2)}) vs ${hp.name} (${hp.era.toFixed(2)}) | ${g.venue} (PF: ${park.runs.toFixed(2)})`,
        weather_detail: wxStr, umpire_detail: umpStr, bullpen_detail: bpStr, recommendation: ouRec
      });
    }
    // ===== 4. FIRST 5 INNINGS TOTAL =====
    const f5ProjRuns = (hp.era * 5 / 9 + ap.era * 5 / 9) * park.runs * 0.55;
    const f5Dir: 'OVER' | 'UNDER' = (hp.era < 3.0 && ap.era < 3.0) || (hp.kPer9 > 9 && ap.kPer9 > 9) ? 'UNDER' : (park.runs >= 1.10) ? 'OVER' : 'UNDER';
    const f5Conf = Math.min(8.5, 6.5 + Math.abs(combinedERA - 4.0) * 0.8);
    const f5Rec: 'BET' | 'LEAN' | 'NO BET' = f5Conf >= 8.0 ? 'BET' : f5Conf >= 7.0 ? 'LEAN' : 'NO BET';
    allBets.push({
      id: `mlb-${g.gamePk}-f5`, game_id: String(g.gamePk),
      pick: `F5 ${f5Dir} (${g.awayTeam}@${g.homeTeam})`,
      edge_pct: parseFloat((Math.abs(combinedERA - 4.0) * 2).toFixed(1)),
      confidence: parseFloat(f5Conf.toFixed(1)),
      rationale: `F5 isolates starters, removes bullpen variance. ${hp.name} (${hp.era.toFixed(2)} ERA, ${hp.kPer9.toFixed(1)} K/9) + ${ap.name} (${ap.era.toFixed(2)} ERA, ${ap.kPer9.toFixed(1)} K/9) project ~${f5ProjRuns.toFixed(1)} combined F5 runs. Park factor: ${park.runs.toFixed(2)}. ${!wx.is_dome ? `${wx.temp_f}F, wind ${wx.wind_mph}mph.` : 'Dome.'}`,
      bet_type: 'first_5', best_book: 'FanDuel', sport: 'MLB', data_confidence: dataConf,
      home_pitcher: hp, away_pitcher: ap,
      matchup_detail: `F5: ${ap.name} vs ${hp.name} | ${g.venue}`,
      weather_detail: wxStr, umpire_detail: umpStr, bullpen_detail: bpStr, recommendation: f5Rec
    });
    // ===== 5. STRIKEOUT PROPS (existing prop engine — keep as is) =====
    if (hp.kPer9 >= 8.0 && hp.ip >= 10) {
      const matchupK = hp.kPer9 * (awayKRate / 0.22);
      const projK = (matchupK / 9) * 5.5;
      const kLine = Math.round(projK * 2) / 2 - 0.5;
      const kBoost = awayKRate > 0.25 ? 'high-strikeout lineup' : awayKRate < 0.19 ? 'contact-heavy lineup (caution)' : 'average K-rate lineup';
      const kConf = Math.min(9.2, 6.5 + (matchupK - 7) * 0.4 + (awayKRate > 0.24 ? 1.0 : 0));
      allBets.push({
        id: `mlb-${g.gamePk}-kprop-hp`, game_id: String(g.gamePk),
        pick: `${hp.name} OVER ${kLine} strikeouts`,
        edge_pct: parseFloat(((matchupK - 7.5) * 2.5).toFixed(1)),
        confidence: parseFloat(kConf.toFixed(1)),
        rationale: `${hp.name} (${hp.hand}HP) averaging ${hp.kPer9.toFixed(1)} K/9 through ${hp.ip} IP (${hp.gamesStarted} GS). ERA ${hp.era.toFixed(2)}, WHIP ${hp.whip.toFixed(2)}. Last 3: ${last3Str(hp)}. Opposing ${g.awayTeam} K-rate: ${(awayKRate * 100).toFixed(1)}% (${kBoost}). Matchup-adjusted projection: ${projK.toFixed(1)} Ks over ~5.5 IP.`,
        bet_type: 'player_prop', best_book: 'DraftKings', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} (${ap.era.toFixed(2)}) vs ${hp.name} (${hp.era.toFixed(2)}) | ${g.venue} | Away K%: ${(awayKRate*100).toFixed(1)}%`,
        weather_detail: wxStr, umpire_detail: umpStr, recommendation: 'BET'
      });
    }
    if (ap.kPer9 >= 8.0 && ap.ip >= 10) {
      const matchupK = ap.kPer9 * (homeKRate / 0.22);
      const projK = (matchupK / 9) * 5.5;
      const kLine = Math.round(projK * 2) / 2 - 0.5;
      const kBoost = homeKRate > 0.25 ? 'high-strikeout lineup' : homeKRate < 0.19 ? 'contact-heavy lineup (caution)' : 'average K-rate lineup';
      const kConf = Math.min(9.2, 6.5 + (matchupK - 7) * 0.4 + (homeKRate > 0.24 ? 1.0 : 0));
      allBets.push({
        id: `mlb-${g.gamePk}-kprop-ap`, game_id: String(g.gamePk),
        pick: `${ap.name} OVER ${kLine} strikeouts`,
        edge_pct: parseFloat(((matchupK - 7.5) * 2.5).toFixed(1)),
        confidence: parseFloat(kConf.toFixed(1)),
        rationale: `${ap.name} (${ap.hand}HP) averaging ${ap.kPer9.toFixed(1)} K/9 through ${ap.ip} IP (${ap.gamesStarted} GS). ERA ${ap.era.toFixed(2)}, WHIP ${ap.whip.toFixed(2)}. Last 3: ${last3Str(ap)}. Opposing ${g.homeTeam} K-rate: ${(homeKRate * 100).toFixed(1)}% (${kBoost}). Matchup-adjusted projection: ${projK.toFixed(1)} Ks over ~5.5 IP.`,
        bet_type: 'player_prop', best_book: 'DraftKings', sport: 'MLB', data_confidence: dataConf,
        home_pitcher: hp, away_pitcher: ap,
        matchup_detail: `${ap.name} (${ap.era.toFixed(2)}) vs ${hp.name} (${hp.era.toFixed(2)}) | ${g.venue} | Home K%: ${(homeKRate*100).toFixed(1)}%`,
        weather_detail: wxStr, umpire_detail: umpStr, recommendation: 'BET'
      });
    }
  }
  return allBets;
}

// ============ FULL NHL GAME CARD ENGINE ============
function generateNHLFullCards(games: NHLGameData[]): BestBet[] {
  const allBets: BestBet[] = [];
  for (const g of games) {
    const hg = g.homeGoalie;
    const ag = g.awayGoalie;
    // GATE: require BOTH goalies confirmed
    if (!hg?.confirmed || !ag?.confirmed) continue;
    const dataConf: 'HIGH' | 'MEDIUM' | 'LOW' = (hg.gamesPlayed > 10 && ag.gamesPlayed > 10) ? 'HIGH' : 'MEDIUM';
    const hgL5 = hg.last5.length > 0 ? hg.last5.reduce((s, x) => s + x.svPct, 0) / hg.last5.length : hg.savePct;
    const agL5 = ag.last5.length > 0 ? ag.last5.reduce((s, x) => s + x.svPct, 0) / ag.last5.length : ag.savePct;
    const goalieEdge = (hg.savePct - ag.savePct) * 100 + (ag.gaa - hg.gaa) * 2;
    // ===== 1. MONEYLINE =====
    if (Math.abs(goalieEdge) > 1.5) {
      const better = goalieEdge > 0 ? 'home' : 'away';
      const bGoalie = better === 'home' ? hg : ag;
      const wGoalie = better === 'home' ? ag : hg;
      const bTeam = better === 'home' ? g.homeTeam : g.awayTeam;
      const bRec = better === 'home' ? g.homeRecord : g.awayRecord;
      const mlConf = Math.min(9.0, 6.5 + Math.abs(goalieEdge) * 0.3);
      const rec: 'BET' | 'LEAN' | 'NO BET' = mlConf >= 8.0 ? 'BET' : mlConf >= 7.0 ? 'LEAN' : 'NO BET';
      allBets.push({
        id: `nhl-${g.gameId}-ml`, game_id: String(g.gameId),
        pick: `${bTeam} ML`, edge_pct: parseFloat(Math.abs(goalieEdge).toFixed(1)),
        confidence: parseFloat(mlConf.toFixed(1)),
        rationale: `${bGoalie.name} (${(bGoalie.savePct*100).toFixed(1)}% SV, ${bGoalie.gaa.toFixed(2)} GAA, ${bGoalie.wins}W-${bGoalie.losses}L, last 5 SV%: ${(hgL5*100).toFixed(1)}%) vs ${wGoalie.name} (${(wGoalie.savePct*100).toFixed(1)}% SV, ${wGoalie.gaa.toFixed(2)} GAA, ${wGoalie.wins}W-${wGoalie.losses}L). Goaltending edge favors ${bTeam} (${bRec}).`,
        bet_type: 'moneyline', best_book: 'DraftKings', sport: 'NHL', data_confidence: dataConf,
        home_goalie: hg, away_goalie: ag, recommendation: rec
      });
    }
    // ===== 2. PUCK LINE =====
    if (Math.abs(goalieEdge) > 3) {
      const better = goalieEdge > 0 ? 'home' : 'away';
      const bTeam = better === 'home' ? g.homeTeam : g.awayTeam;
      const bGoalie = better === 'home' ? hg : ag;
      const plConf = Math.min(8.5, 6.0 + Math.abs(goalieEdge) * 0.25);
      const plRec: 'BET' | 'LEAN' | 'NO BET' = plConf >= 7.5 ? 'LEAN' : 'NO BET';
      allBets.push({
        id: `nhl-${g.gameId}-pl`, game_id: String(g.gameId),
        pick: `${bTeam} -1.5`, edge_pct: parseFloat((Math.abs(goalieEdge) * 0.8).toFixed(1)),
        confidence: parseFloat(plConf.toFixed(1)),
        rationale: `Significant goaltending gap. ${bGoalie.name} (${bGoalie.gaa.toFixed(2)} GAA) has edge large enough to cover puck line. ${bTeam} (${better === 'home' ? g.homeRecord : g.awayRecord}) at home with goalie advantage.`,
        bet_type: 'puck_line', best_book: 'FanDuel', sport: 'NHL', data_confidence: dataConf,
        home_goalie: hg, away_goalie: ag, recommendation: plRec
      });
    }
    // ===== 3. GAME TOTAL =====
    const combinedGAA = (hg.gaa + ag.gaa) / 2;
    const bothHot = hgL5 > 0.920 && agL5 > 0.920;
    const bothCold = hgL5 < 0.900 && agL5 < 0.900;
    if (bothHot || combinedGAA < 2.5) {
      const ouConf = Math.min(8.5, 7.0 + (hgL5 + agL5 - 1.84) * 30);
      allBets.push({
        id: `nhl-${g.gameId}-under`, game_id: String(g.gameId),
        pick: `UNDER (${g.awayTeam}@${g.homeTeam})`, edge_pct: parseFloat(((hgL5 + agL5 - 1.84) * 50).toFixed(1)),
        confidence: parseFloat(ouConf.toFixed(1)),
        rationale: `Both goalies in strong form. ${hg.name} last 5 SV%: ${(hgL5*100).toFixed(1)}%, ${ag.name} last 5 SV%: ${(agL5*100).toFixed(1)}%. Combined GAA: ${combinedGAA.toFixed(2)}. Low-scoring game expected.`,
        bet_type: 'total', best_book: 'BetMGM', sport: 'NHL', data_confidence: dataConf,
        home_goalie: hg, away_goalie: ag, recommendation: ouConf >= 7.5 ? 'LEAN' : 'NO BET'
      });
    } else if (bothCold || combinedGAA > 3.5) {
      const ouConf = Math.min(8.5, 6.5 + (1.80 - hgL5 - agL5 + 0.04) * 30);
      allBets.push({
        id: `nhl-${g.gameId}-over`, game_id: String(g.gameId),
        pick: `OVER (${g.awayTeam}@${g.homeTeam})`, edge_pct: parseFloat(((combinedGAA - 3.0) * 5).toFixed(1)),
        confidence: parseFloat(ouConf.toFixed(1)),
        rationale: `Both goalies struggling. ${hg.name} last 5 SV%: ${(hgL5*100).toFixed(1)}%, ${ag.name} last 5 SV%: ${(agL5*100).toFixed(1)}%. Combined GAA: ${combinedGAA.toFixed(2)}. High-scoring game expected.`,
        bet_type: 'total', best_book: 'BetMGM', sport: 'NHL', data_confidence: dataConf,
        home_goalie: hg, away_goalie: ag, recommendation: ouConf >= 7.5 ? 'LEAN' : 'NO BET'
      });
    }
    // ===== 4. GOALIE SAVE PROPS =====
    if (hgL5 > 0.930 && hg.gamesPlayed > 15) {
      const avgSA = hg.last5.length > 0 ? hg.last5.reduce((s, x) => s + x.sa, 0) / hg.last5.length : 28;
      const projSaves = Math.round(avgSA * hgL5);
      allBets.push({
        id: `nhl-${g.gameId}-sv-hg`, game_id: String(g.gameId),
        pick: `${hg.name} OVER ${projSaves - 2}.5 saves`,
        edge_pct: parseFloat(((hgL5 - 0.91) * 200).toFixed(1)),
        confidence: parseFloat(Math.min(9.0, 7.0 + (hgL5 - 0.92) * 50).toFixed(1)),
        rationale: `${hg.name} in elite form: last 5 SV% ${(hgL5*100).toFixed(1)}%. Season: ${(hg.savePct*100).toFixed(1)}% SV, ${hg.gaa.toFixed(2)} GAA in ${hg.gamesPlayed} GP. Avg ${avgSA.toFixed(0)} SA/game last 5.`,
        bet_type: 'player_prop', best_book: 'DraftKings', sport: 'NHL', data_confidence: dataConf,
        home_goalie: hg, away_goalie: ag, recommendation: 'BET'
      });
    }
    if (agL5 > 0.930 && ag.gamesPlayed > 15) {
      const avgSA = ag.last5.length > 0 ? ag.last5.reduce((s, x) => s + x.sa, 0) / ag.last5.length : 28;
      const projSaves = Math.round(avgSA * agL5);
      allBets.push({
        id: `nhl-${g.gameId}-sv-ag`, game_id: String(g.gameId),
        pick: `${ag.name} OVER ${projSaves - 2}.5 saves`,
        edge_pct: parseFloat(((agL5 - 0.91) * 200).toFixed(1)),
        confidence: parseFloat(Math.min(9.0, 7.0 + (agL5 - 0.92) * 50).toFixed(1)),
        rationale: `${ag.name} in elite form: last 5 SV% ${(agL5*100).toFixed(1)}%. Season: ${(ag.savePct*100).toFixed(1)}% SV, ${ag.gaa.toFixed(2)} GAA in ${ag.gamesPlayed} GP.`,
        bet_type: 'player_prop', best_book: 'DraftKings', sport: 'NHL', data_confidence: dataConf,
        home_goalie: hg, away_goalie: ag, recommendation: 'BET'
      });
    }
  }
  return allBets;
}

// ============ FULL NBA GAME CARD ENGINE ============
interface NBATeamStats {
  teamId: string; teamName: string; record: string;
  pointsPerGame: number; oppPointsPerGame: number; pace: number; reboundsPerGame: number;
}
async function fetchNBATeamStats(teamId: string): Promise<NBATeamStats | null> {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/statistics`);
    if (!res.ok) return null;
    const json = await res.json();
    const stats = json?.results?.stats?.categories || json?.stats?.categories || [];
    let ppg = 0, oppPpg = 0, rpg = 0, pace = 98;
    for (const cat of stats) {
      for (const stat of (cat?.stats || [])) {
        if (stat.name === 'avgPoints') ppg = stat.value || 0;
        if (stat.name === 'avgPointsAgainst' || stat.name === 'oppAvgPoints') oppPpg = stat.value || 0;
        if (stat.name === 'avgRebounds') rpg = stat.value || 0;
        if (stat.name === 'possessions' || stat.name === 'pace') pace = stat.value || 98;
      }
    }
    return { teamId, teamName: '', record: '', pointsPerGame: ppg, oppPointsPerGame: oppPpg, pace, reboundsPerGame: rpg };
  } catch { return null; }
}
async function generateNBAFullCards(): Promise<BestBet[]> {
  const allBets: BestBet[] = [];
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
      const homeTeamId = home?.team?.id || '';
      const awayTeamId = away?.team?.id || '';
      const [homeStats, awayStats] = await Promise.all([fetchNBATeamStats(homeTeamId), fetchNBATeamStats(awayTeamId)]);
      let oddsData: any = null;
      try {
        const oddsRes = await fetch(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/events/${eventId}/competitions/${eventId}/odds`);
        if (oddsRes.ok) { const oddsJson = await oddsRes.json(); oddsData = oddsJson?.items?.[0]; }
      } catch {}
      const spread = parseFloat(oddsData?.details?.split(' ').pop() || '0') || 0;
      const overUnder = parseFloat(oddsData?.overUnder) || 0;
      const homeDefR = homeStats?.oppPointsPerGame || 110;
      const awayDefR = awayStats?.oppPointsPerGame || 110;
      const homePace = homeStats?.pace || 98;
      const awayPace = awayStats?.pace || 98;
      const combinedPace = (homePace + awayPace) / 2;
      const paceAdjTotal = (homeDefR + awayDefR) * (combinedPace / 98);
      // ===== 1. MONEYLINE =====
      if (Math.abs(spread) >= 2 && homeStats && awayStats) {
        const homeFav = spread < 0;
        const favTeam = homeFav ? homeTeam : awayTeam;
        const favRec = homeFav ? homeRecord : awayRecord;
        const favOff = homeFav ? (homeStats.pointsPerGame || 0) : (awayStats.pointsPerGame || 0);
        const dogDef = homeFav ? awayDefR : homeDefR;
        const mlConf = Math.min(8.8, 6.0 + Math.abs(spread) * 0.3);
        const rec: 'BET' | 'LEAN' | 'NO BET' = mlConf >= 7.5 ? 'LEAN' : 'NO BET';
        allBets.push({
          id: `nba-${eventId}-ml`, game_id: eventId,
          pick: `${favTeam} ML`, edge_pct: parseFloat((Math.abs(spread) * 0.8).toFixed(1)),
          confidence: parseFloat(mlConf.toFixed(1)),
          rationale: `${favTeam} (${favRec}) favored by ${Math.abs(spread).toFixed(1)}. Offense: ${favOff.toFixed(1)} PPG vs ${dogDef.toFixed(1)} PPG allowed. Pace: ${combinedPace.toFixed(1)}.`,
          bet_type: 'moneyline', best_book: 'DraftKings', sport: 'NBA', data_confidence: (homeStats && awayStats) ? 'MEDIUM' : 'LOW',
          matchup_detail: `${awayTeam} (${awayRecord}) @ ${homeTeam} (${homeRecord}) | Spread: ${spread}`,
          recommendation: rec
        });
      }
      // ===== 2. SPREAD =====
      if (Math.abs(spread) >= 3 && Math.abs(spread) <= 10 && homeStats && awayStats) {
        const homeFav = spread < 0;
        const favTeam = homeFav ? homeTeam : awayTeam;
        const spConf = Math.min(8.5, 6.5 + Math.abs(spread) * 0.2);
        const spRec: 'BET' | 'LEAN' | 'NO BET' = spConf >= 7.5 ? 'LEAN' : 'NO BET';
        allBets.push({
          id: `nba-${eventId}-spread`, game_id: eventId,
          pick: `${favTeam} ${spread > 0 ? '+' : ''}${spread}`,
          edge_pct: parseFloat((Math.abs(spread) * 0.6).toFixed(1)),
          confidence: parseFloat(spConf.toFixed(1)),
          rationale: `${favTeam} (${homeFav ? homeRecord : awayRecord}) spread ${spread}. DEF matchup: ${homeTeam} allows ${homeDefR.toFixed(1)} PPG, ${awayTeam} allows ${awayDefR.toFixed(1)} PPG. Pace: ${combinedPace.toFixed(1)}.`,
          bet_type: 'spread', best_book: 'FanDuel', sport: 'NBA', data_confidence: 'MEDIUM',
          matchup_detail: `${awayTeam} @ ${homeTeam} | Spread: ${spread} | DEF: ${homeDefR.toFixed(1)} vs ${awayDefR.toFixed(1)}`,
          recommendation: spRec
        });
      }
      // ===== 3. GAME TOTAL =====
      if (overUnder > 0) {
        let totDir: 'OVER' | 'UNDER' | null = null;
        let totReason = '';
        if (combinedPace > 99 && paceAdjTotal > overUnder) {
          totDir = 'OVER'; totReason = `High-pace matchup (${combinedPace.toFixed(1)}). ${homeTeam} DEF allows ${homeDefR.toFixed(1)} PPG, ${awayTeam} DEF allows ${awayDefR.toFixed(1)} PPG. Pace-adjusted total: ${paceAdjTotal.toFixed(1)} vs line ${overUnder}.`;
        } else if (combinedPace < 96 && paceAdjTotal < overUnder) {
          totDir = 'UNDER'; totReason = `Slow-pace matchup (${combinedPace.toFixed(1)}). Both teams grind. Pace-adjusted total: ${paceAdjTotal.toFixed(1)} vs line ${overUnder}.`;
        }
        if (totDir) {
          const totConf = Math.min(8.5, 6.5 + Math.abs(paceAdjTotal - overUnder) * 0.1);
          allBets.push({
            id: `nba-${eventId}-ou`, game_id: eventId,
            pick: `${totDir} ${overUnder} (${awayTeam}@${homeTeam})`,
            edge_pct: parseFloat((Math.abs(paceAdjTotal - overUnder) * 0.5).toFixed(1)),
            confidence: parseFloat(totConf.toFixed(1)),
            rationale: totReason, bet_type: 'total', best_book: 'BetMGM', sport: 'NBA', data_confidence: 'MEDIUM',
            matchup_detail: `Pace: ${combinedPace.toFixed(1)} | O/U: ${overUnder}`,
            recommendation: totConf >= 7.5 ? 'LEAN' : 'NO BET'
          });
        }
      }
      // ===== 4. TEAM TOTAL PROPS =====
      if (awayDefR > 113 && homeStats) {
        allBets.push({
          id: `nba-${eventId}-hprop`, game_id: eventId,
          pick: `${homeTeam} OVER team total`,
          edge_pct: parseFloat(((awayDefR - 110) * 1.5).toFixed(1)),
          confidence: parseFloat(Math.min(8.8, 6.5 + (awayDefR - 110) * 0.5).toFixed(1)),
          rationale: `${awayTeam} allows ${awayDefR.toFixed(1)} PPG (bottom-tier defense). ${homeTeam} (${homeRecord}) exploits at home. Pace: ${combinedPace.toFixed(1)}.`,
          bet_type: 'player_prop', best_book: 'DraftKings', sport: 'NBA', data_confidence: 'MEDIUM',
          matchup_detail: `${awayTeam} DEF: ${awayDefR.toFixed(1)} PPG | ${homeTeam} OFF: ${homeStats.pointsPerGame.toFixed(1)} PPG`,
          recommendation: 'LEAN'
        });
      }
      if (homeDefR > 113 && awayStats) {
        allBets.push({
          id: `nba-${eventId}-aprop`, game_id: eventId,
          pick: `${awayTeam} OVER team total`,
          edge_pct: parseFloat(((homeDefR - 110) * 1.5).toFixed(1)),
          confidence: parseFloat(Math.min(8.8, 6.5 + (homeDefR - 110) * 0.5).toFixed(1)),
          rationale: `${homeTeam} allows ${homeDefR.toFixed(1)} PPG (bottom-tier defense). ${awayTeam} (${awayRecord}) in favorable scoring matchup. Pace: ${combinedPace.toFixed(1)}.`,
          bet_type: 'player_prop', best_book: 'DraftKings', sport: 'NBA', data_confidence: 'MEDIUM',
          matchup_detail: `${homeTeam} DEF: ${homeDefR.toFixed(1)} PPG | ${awayTeam} OFF: ${awayStats.pointsPerGame.toFixed(1)} PPG`,
          recommendation: 'LEAN'
        });
      }
    }
  } catch {}
  return allBets;
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

// ============ BEST BETS LOCAL CACHE ============
const BETS_CACHE_KEY = 'edgeboard_bets_cache';
const BETS_CACHE_TTL = 1000 * 60 * 30; // 30 min staleness limit

function cacheBestBetsLocal(bets: BestBet[]) {
  try {
    localStorage.setItem(BETS_CACHE_KEY, JSON.stringify({ ts: Date.now(), bets }));
  } catch {}
}

function getCachedBestBets(): BestBet[] {
  try {
    const raw = localStorage.getItem(BETS_CACHE_KEY);
    if (!raw) return [];
    const { ts, bets } = JSON.parse(raw);
    if (Date.now() - ts > BETS_CACHE_TTL) return [];
    return bets || [];
  } catch { return []; }
}

// ============ PUBLIC API ============
export const api = {
  games: async (): Promise<Game[]> => {
    const [mlb, nba, nhl] = await Promise.all([fetchEspnScoreboard('MLB'), fetchEspnScoreboard('NBA'), fetchEspnScoreboard('NHL')]);
    const all = [...mlb, ...nba, ...nhl];
    cacheGames(all);
    return all;
  },
  bestBets: async (): Promise<BestBet[]> => {
    const [mlbGames, nhlGames, nbaBets] = await Promise.all([
      fetchMLBScheduleWithPitchers(),
      fetchNHLGamesWithGoalies(),
      generateNBAFullCards(),
    ]);
    const mlbBets = await generateMLBFullCards(mlbGames);
    const nhlBets = generateNHLFullCards(nhlGames);
    const allBetsResult = [...mlbBets, ...nbaBets, ...nhlBets]; cacheBestBetsLocal(allBetsResult); return allBetsResult;
  },
  cachedBestBets: (): BestBet[] => getCachedBestBets(),     lines: async (gameId: string): Promise<LineMovement[]> => {
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
    streakData: async (): Promise<StreakData> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data } = await supabase.from('user_bets').select('*').gte('date', thirtyDaysAgo.toISOString().split('T')[0]).order('date', { ascending: false });
    if (!data || data.length === 0) return { wins: 0, losses: 0, pushes: 0, streak: '0-0', streakType: 'none', streakCount: 0, roi: 0, totalWagered: 0, totalProfit: 0, hasBets: false };
    const wins = data.filter(b => b.result === 'win').length;
    const losses = data.filter(b => b.result === 'loss').length;
    const pushes = data.filter(b => b.result === 'push').length;
    const totalWagered = data.reduce((s, b) => s + (Number(b.units) || 1) * 100, 0);
    const totalProfit = data.reduce((s, b) => s + (Number(b.profit) || 0), 0);
    const roi = totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0;
    let streakType: 'W' | 'L' | 'P' | 'none' = 'none';
    let streakCount = 0;
    const settled = data.filter(b => b.result === 'win' || b.result === 'loss');
    if (settled.length > 0) {
      const first = settled[0].result === 'win' ? 'W' : 'L';
      streakType = first as 'W' | 'L';
      for (const b of settled) {
        if ((b.result === 'win' && first === 'W') || (b.result === 'loss' && first === 'L')) streakCount++;
        else break;
      }
    }
    return { wins, losses, pushes, streak: `${wins}-${losses}${pushes > 0 ? `-${pushes}` : ''}`, streakType, streakCount, roi: parseFloat(roi.toFixed(1)), totalWagered, totalProfit, hasBets: true };
  },
    placeBet: async (legs: BetSlipLeg[], stake: number, totalOdds: number, payout: number): Promise<UserBet | null> => {
    const pick = legs.length === 1 ? legs[0].pick : legs.map(l => l.pick).join(' + ');
    const sport = legs[0].sport;
    const betType = legs.length === 1 ? legs[0].betType : 'parlay';
    const { data, error } = await supabase.from('user_bets').insert({
      date: new Date().toISOString().split('T')[0],
      pick,
      sport,
      bet_type: betType,
      result: null,
      units: stake / 100,
      odds: totalOdds,
      profit: 0,
      game_id: legs[0].gameId,
      legs: legs as any,
      total_odds: totalOdds,
      stake,
      potential_payout: payout,
      status: 'active',
    }).select().single();
    if (error) { console.error('placeBet error', error); return null; }
    return data as UserBet;
  },
  activeBets: async (): Promise<UserBet[]> => {
    const { data } = await supabase.from('user_bets').select('*').eq('status', 'active').order('created_at', { ascending: false });
    return (data || []) as UserBet[];
  },
  settleBet: async (betId: string, result: 'win' | 'loss' | 'push'): Promise<boolean> => {
    const { data: bet } = await supabase.from('user_bets').select('*').eq('id', betId).single();
    if (!bet) return false;
    let profit = 0;
    if (result === 'win') {
      profit = (bet.potential_payout || 0) - (bet.stake || 0);
    } else if (result === 'loss') {
      profit = -(bet.stake || 0);
    }
    const { error } = await supabase.from('user_bets').update({ result, profit, status: 'settled', settled_at: new Date().toISOString() }).eq('id', betId);
    return !error;
  },
};
