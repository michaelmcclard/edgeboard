// ============ BATTER PROPS ENGINE ============
// Generates position player props: total bases, HR, hits, RBI, runs, SB, multi-hit
// Uses MLB Stats API for individual batter stats and The Odds API for prop lines

import type { BestBet, PitcherStats } from './api';

const MLB_API = 'https://statsapi.mlb.com/api/v1';
const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY || '';
const ODDS_API = 'https://api.the-odds-api.com/v4';

// ============ INTERFACES ============
export interface BatterStats {
  playerId: number;
  name: string;
  team: string;
  position: string;
  battingOrder: number;
  bats: string;
  pa: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  iso: number;
  hr: number;
  sb: number;
  hits: number;
  doubles: number;
  triples: number;
  rbi: number;
  runs: number;
  bb: number;
  so: number;
  babip: number;
  kRate: number;
  bbRate: number;
  contactRate: number;
  barrelRate: number;
  hardHitRate: number;
  flyBallRate: number;
  pullRate: number;
  sprintSpeed: number;
  last10: { avg: number; hr: number; tb: number; hits: number; rbi: number; runs: number; sb: number; pa: number };
  hitStreak: number;
  multiHitGames10: number;
}

export interface OddsPropLine {
  player: string;
  market: string;
  line: number;
  overPrice: number;
  underPrice: number;
  book: string;
}

// ============ DATA FETCHING ============
async function fetchLineupAndBatters(teamId: number, gamePk: number): Promise<BatterStats[]> {
  try {
    const res = await fetch(`${MLB_API}/game/${gamePk}/boxscore`);
    if (!res.ok) {
      // Game hasn't started, try lineup from schedule
      return await fetchRosterBatters(teamId);
    }
    const json = await res.json();
    const isHome = json?.teams?.home?.team?.id === teamId;
    const teamData = isHome ? json?.teams?.home : json?.teams?.away;
    const batters = teamData?.batters || [];
    const players = teamData?.players || {};
    const lineup: BatterStats[] = [];
    for (let i = 0; i < Math.min(batters.length, 9); i++) {
      const pid = batters[i];
      const p = players[`ID${pid}`] || {};
      const stats = p?.seasonStats?.batting || {};
      const pa = stats.plateAppearances || 0;
      if (pa < 50) continue;
      lineup.push(buildBatterFromStats(pid, p, stats, i + 1, pa));
    }
    return lineup;
  } catch {
    return await fetchRosterBatters(teamId);
  }
}

async function fetchRosterBatters(teamId: number): Promise<BatterStats[]> {
  try {
    const res = await fetch(`${MLB_API}/teams/${teamId}/roster?rosterType=active&season=2026&hydrate=person(stats(group=[hitting],type=[season],season=2026))`);
    if (!res.ok) return [];
    const json = await res.json();
    const roster = json?.roster || [];
    const batters: BatterStats[] = [];
    let order = 1;
    for (const p of roster) {
      if (p.position?.type === 'Pitcher') continue;
      const person = p.person || {};
      const stat = person.stats?.[0]?.splits?.[0]?.stat;
      if (!stat) continue;
      const pa = stat.plateAppearances || 0;
      if (pa < 50) continue;
      batters.push({
        playerId: person.id || 0,
        name: person.fullName || 'Unknown',
        team: '',
        position: p.position?.abbreviation || 'UT',
        battingOrder: order++,
        bats: person.batSide?.code || 'R',
        pa,
        avg: parseFloat(stat.avg) || .250,
        obp: parseFloat(stat.obp) || .320,
        slg: parseFloat(stat.slg) || .400,
        ops: parseFloat(stat.ops) || .720,
        iso: (parseFloat(stat.slg) || .400) - (parseFloat(stat.avg) || .250),
        hr: stat.homeRuns || 0,
        sb: stat.stolenBases || 0,
        hits: stat.hits || 0,
        doubles: stat.doubles || 0,
        triples: stat.triples || 0,
        rbi: stat.rbi || 0,
        runs: stat.runs || 0,
        bb: stat.baseOnBalls || 0,
        so: stat.strikeOuts || 0,
        babip: parseFloat(stat.babip) || .300,
        kRate: pa > 0 ? (stat.strikeOuts || 0) / pa : .22,
        bbRate: pa > 0 ? (stat.baseOnBalls || 0) / pa : .08,
        contactRate: pa > 0 ? 1 - ((stat.strikeOuts || 0) / pa) : .78,
        barrelRate: 7.5,
        hardHitRate: 36.0,
        flyBallRate: 34.0,
        pullRate: 40.0,
        sprintSpeed: 27.0,
        last10: { avg: parseFloat(stat.avg) || .250, hr: 0, tb: 0, hits: 0, rbi: 0, runs: 0, sb: 0, pa: 0 },
        hitStreak: 0,
        multiHitGames10: 0,
      });
    }
    // Fetch game logs for last 10 for each batter
    await Promise.all(batters.slice(0, 9).map(b => enrichBatterLast10(b)));
    return batters.slice(0, 9);
  } catch {
    return [];
  }
}

function buildBatterFromStats(pid: number, p: any, stats: any, order: number, pa: number): BatterStats {
  return {
    playerId: pid,
    name: p?.person?.fullName || 'Unknown',
    team: '',
    position: p?.position?.abbreviation || 'UT',
    battingOrder: order,
    bats: p?.person?.batSide?.code || 'R',
    pa,
    avg: parseFloat(stats.avg) || .250,
    obp: parseFloat(stats.obp) || .320,
    slg: parseFloat(stats.slg) || .400,
    ops: parseFloat(stats.ops) || .720,
    iso: (parseFloat(stats.slg) || .400) - (parseFloat(stats.avg) || .250),
    hr: stats.homeRuns || 0,
    sb: stats.stolenBases || 0,
    hits: stats.hits || 0,
    doubles: stats.doubles || 0,
    triples: stats.triples || 0,
    rbi: stats.rbi || 0,
    runs: stats.runs || 0,
    bb: stats.baseOnBalls || 0,
    so: stats.strikeOuts || 0,
    babip: parseFloat(stats.babip) || .300,
    kRate: pa > 0 ? (stats.strikeOuts || 0) / pa : .22,
    bbRate: pa > 0 ? (stats.baseOnBalls || 0) / pa : .08,
    contactRate: pa > 0 ? 1 - ((stats.strikeOuts || 0) / pa) : .78,
    barrelRate: 7.5,
    hardHitRate: 36.0,
    flyBallRate: 34.0,
    pullRate: 40.0,
    sprintSpeed: 27.0,
    last10: { avg: .250, hr: 0, tb: 0, hits: 0, rbi: 0, runs: 0, sb: 0, pa: 0 },
    hitStreak: 0,
    multiHitGames10: 0,
  };
}

async function enrichBatterLast10(b: BatterStats): Promise<void> {
  try {
    const res = await fetch(`${MLB_API}/people/${b.playerId}/stats?stats=gameLog&group=hitting&season=2026`);
    if (!res.ok) return;
    const json = await res.json();
    const splits = json?.stats?.[0]?.splits || [];
    const last10 = splits.slice(-10);
    if (last10.length === 0) return;
    let totalH = 0, totalHR = 0, totalTB = 0, totalRBI = 0, totalR = 0, totalSB = 0, totalPA = 0, multiHit = 0, streak = 0, streakBroken = false;
    for (let i = last10.length - 1; i >= 0; i--) {
      const s = last10[i]?.stat || {};
      const h = s.hits || 0;
      const hr = s.homeRuns || 0;
      const d = s.doubles || 0;
      const t = s.triples || 0;
      totalH += h;
      totalHR += hr;
      totalTB += h + d + t * 2 + hr * 3;
      totalRBI += s.rbi || 0;
      totalR += s.runs || 0;
      totalSB += s.stolenBases || 0;
      totalPA += s.plateAppearances || 0;
      if (h >= 2) multiHit++;
      if (!streakBroken && h > 0) streak++;
      else streakBroken = true;
    }
    const gp = last10.length;
    b.last10 = {
      avg: totalPA > 0 ? totalH / (totalPA * 0.9) : b.avg,
      hr: totalHR,
      tb: totalTB / gp,
      hits: totalH / gp,
      rbi: totalRBI / gp,
      runs: totalR / gp,
      sb: totalSB / gp,
      pa: totalPA / gp,
    };
    b.hitStreak = streak;
    b.multiHitGames10 = multiHit;
  } catch {}
}

// ============ ODDS API — BATTER PROP LINES ============
async function fetchBatterPropLines(gamePk: number): Promise<OddsPropLine[]> {
  if (!ODDS_API_KEY) return [];
  try {
    const markets = 'batter_home_runs,batter_hits_over_under,batter_total_bases,batter_rbis,batter_runs_scored,batter_stolen_bases,batter_singles,batter_doubles,batter_extra_base_hits';
    const res = await fetch(`${ODDS_API}/sports/baseball_mlb/events/${gamePk}/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american`);
    if (!res.ok) return [];
    const json = await res.json();
    const lines: OddsPropLine[] = [];
    for (const bk of (json?.bookmakers || [])) {
      for (const mkt of (bk?.markets || [])) {
        for (const outcome of (mkt?.outcomes || [])) {
          if (outcome.description && outcome.point !== undefined) {
            lines.push({
              player: outcome.description,
              market: mkt.key,
              line: outcome.point,
              overPrice: outcome.name === 'Over' ? outcome.price : 0,
              underPrice: outcome.name === 'Under' ? outcome.price : 0,
              book: bk.key,
            });
          }
        }
      }
    }
    return lines;
  } catch {
    return [];
  }
}

// ============ PROP SCORING & GENERATION ============
interface PropCandidate {
  batter: BatterStats;
  propType: string;
  line: number;
  modelProb: number;
  bookImplied: number;
  edge: number;
  confidence: number;
  synopsis: string;
  matchupDetail: string;
  book: string;
}

function impliedProbFromAmerican(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function scoreTotalBases(b: BatterStats, opp: PitcherStats, parkHR: number, wind: string): PropCandidate | null {
  const seasonTBperPA = (b.hits + b.doubles + b.triples * 2 + b.hr * 3) / Math.max(b.pa, 1);
  const l10TB = b.last10.tb;
  const projPA = b.battingOrder <= 3 ? 4.3 : b.battingOrder <= 6 ? 4.0 : 3.7;
  const projTB = (seasonTBperPA * 0.5 + (l10TB / Math.max(b.last10.pa, 1)) * 0.5) * projPA * parkHR;
  if (b.iso < 0.130) return null;
  const line = 1.5;
  const modelProb = Math.min(0.85, 0.35 + (projTB - 1.5) * 0.2 + (b.hardHitRate > 40 ? 0.05 : 0) + (parkHR > 1.05 ? 0.05 : 0));
  if (modelProb < 0.45) return null;
  const hrRate = opp.hrPer9 || 1.2;
  const synopsis = `${b.name} brings a ${b.iso.toFixed(3)} ISO and ${b.hardHitRate.toFixed(1)}% hard hit rate into today's matchup against ${opp.name} (${hrRate.toFixed(2)} HR/9). Over his last 10 games he is averaging ${l10TB.toFixed(1)} total bases per game, and the park factor of ${parkHR.toFixed(2)} tilts the projection further.`;
  return { batter: b, propType: 'total_bases', line, modelProb, bookImplied: 0.50, edge: (modelProb - 0.50) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} (${b.team}) ${b.position} #${b.battingOrder} | ISO ${b.iso.toFixed(3)} | L10 TB/G: ${l10TB.toFixed(1)}`, book: 'DraftKings' };
}

function scoreHR(b: BatterStats, opp: PitcherStats, parkHR: number, windOut: boolean): PropCandidate | null {
  if (b.hr < 2 || b.pa < 80) return null;
  const hrRate = b.hr / Math.max(b.pa, 1);
  const oppHRRate = (opp.hrPer9 || 1.2) / 9;
  const modelProb = Math.min(0.40, hrRate * 4 * parkHR * (1 + oppHRRate) * (windOut ? 1.15 : 1.0));
  if (modelProb < 0.12) return null;
  const synopsis = `${b.name} has ${b.hr} home runs this season with a ${b.iso.toFixed(3)} ISO and ${b.flyBallRate.toFixed(1)}% fly ball rate. ${opp.name} allows ${opp.hrPer9.toFixed(2)} HR/9 and the park HR factor is ${parkHR.toFixed(2)}${windOut ? ' with wind blowing out' : ''}.`;
  return { batter: b, propType: 'home_run', line: 0.5, modelProb, bookImplied: 0.15, edge: (modelProb - 0.15) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} | ${b.hr} HR | ISO ${b.iso.toFixed(3)} | vs ${opp.name} (${opp.hrPer9.toFixed(2)} HR/9)`, book: 'FanDuel' };
}

function scoreHits(b: BatterStats, opp: PitcherStats, parkHits: number): PropCandidate | null {
  if (b.contactRate < 0.70) return null;
  const hitsPerGame = b.hits / Math.max(b.pa / 4, 1);
  const l10Hits = b.last10.hits;
  const oppWHIP = opp.whip || 1.30;
  const modelProb = Math.min(0.80, 0.30 + (hitsPerGame - 0.8) * 0.3 + (b.babip > 0.310 ? 0.05 : 0) + (oppWHIP > 1.35 ? 0.05 : 0));
  if (modelProb < 0.50) return null;
  const synopsis = `${b.name} is hitting ${b.avg.toFixed(3)} on the season with a ${b.contactRate.toFixed(0)}% contact rate and ${b.babip.toFixed(3)} BABIP. Over his last 10 he is averaging ${l10Hits.toFixed(1)} hits per game against a pitcher with a ${oppWHIP.toFixed(2)} WHIP.`;
  return { batter: b, propType: 'hits', line: 0.5, modelProb, bookImplied: 0.55, edge: (modelProb - 0.55) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} | AVG ${b.avg.toFixed(3)} | Contact ${b.contactRate.toFixed(0)}% | vs ${opp.name} (${oppWHIP.toFixed(2)} WHIP)`, book: 'BetMGM' };
}

function scoreStolenBase(b: BatterStats, catcherPopTime: number): PropCandidate | null {
  if (b.sb < 3 || b.sprintSpeed < 28.0) return null;
  const sbRate = b.sb / Math.max(b.pa / 4, 1);
  const slowCatcher = catcherPopTime >= 2.05;
  const modelProb = Math.min(0.55, sbRate * 3 + (slowCatcher ? 0.10 : 0) + (b.sprintSpeed > 29.5 ? 0.08 : 0));
  if (modelProb < 0.25) return null;
  const synopsis = `${b.name} has ${b.sb} stolen bases with elite sprint speed (${b.sprintSpeed.toFixed(1)} ft/s). The opposing catcher has a ${catcherPopTime.toFixed(2)}s pop time${slowCatcher ? ', well above the 2.05s threshold that creates steal opportunities' : ''}.`;
  return { batter: b, propType: 'stolen_base', line: 0.5, modelProb, bookImplied: 0.30, edge: (modelProb - 0.30) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} | ${b.sb} SB | Speed ${b.sprintSpeed.toFixed(1)} | Catcher pop: ${catcherPopTime.toFixed(2)}s`, book: 'DraftKings' };
}

function scoreMultiHit(b: BatterStats, opp: PitcherStats): PropCandidate | null {
  if (b.battingOrder > 6) return null;
  if (b.contactRate < 0.72) return null;
  const projPA = b.battingOrder <= 3 ? 4.3 : 4.0;
  const multiHitRate = b.multiHitGames10 / 10;
  const oppContact = 1 - ((opp.kPer9 || 8) / 36);
  const modelProb = Math.min(0.60, multiHitRate * 0.4 + (b.avg > 0.280 ? 0.10 : 0) + (b.contactRate > 0.80 ? 0.08 : 0) + (oppContact > 0.80 ? 0.05 : 0));
  if (modelProb < 0.30) return null;
  const synopsis = `${b.name} has recorded ${b.multiHitGames10} multi-hit games in his last 10 starts, hitting ${b.avg.toFixed(3)} with a ${b.contactRate.toFixed(0)}% contact rate. He projects for ${projPA.toFixed(1)} PA today from the #${b.battingOrder} spot against ${opp.name} who allows a ${opp.whip.toFixed(2)} WHIP.`;
  return { batter: b, propType: '2plus_hits', line: 1.5, modelProb, bookImplied: 0.35, edge: (modelProb - 0.35) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} | AVG ${b.avg.toFixed(3)} | ${b.multiHitGames10}/10 multi-hit | #${b.battingOrder} spot`, book: 'FanDuel' };
}

function scoreRBI(b: BatterStats, opp: PitcherStats): PropCandidate | null {
  if (b.battingOrder < 3 || b.battingOrder > 6) return null;
  const rbiPerGame = b.rbi / Math.max(b.pa / 4, 1);
  const l10RBI = b.last10.rbi;
  if (rbiPerGame < 0.5) return null;
  const modelProb = Math.min(0.65, 0.30 + (rbiPerGame - 0.5) * 0.4 + (l10RBI > 1.0 ? 0.08 : 0));
  if (modelProb < 0.40) return null;
  const synopsis = `${b.name} bats #${b.battingOrder} in the order with ${b.rbi} RBI on the season, averaging ${l10RBI.toFixed(1)} RBI per game over his last 10. He faces ${opp.name} (${opp.whip.toFixed(2)} WHIP) with runners expected on base ahead of him.`;
  return { batter: b, propType: 'rbi', line: 0.5, modelProb, bookImplied: 0.45, edge: (modelProb - 0.45) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} | ${b.rbi} RBI | L10 RBI/G: ${l10RBI.toFixed(1)} | #${b.battingOrder} spot`, book: 'BetMGM' };
}

function scoreRunsScored(b: BatterStats, opp: PitcherStats): PropCandidate | null {
  if (b.battingOrder > 3) return null;
  const runsPerGame = b.runs / Math.max(b.pa / 4, 1);
  const l10Runs = b.last10.runs;
  if (runsPerGame < 0.5 || b.obp < 0.340) return null;
  const modelProb = Math.min(0.65, 0.30 + (b.obp - 0.320) * 2 + (l10Runs > 0.8 ? 0.08 : 0) + (b.sb > 5 ? 0.05 : 0));
  if (modelProb < 0.40) return null;
  const synopsis = `${b.name} leads off or bats near the top with a ${b.obp.toFixed(3)} OBP and ${b.runs} runs scored. Over his last 10 games he is scoring ${l10Runs.toFixed(1)} runs per game. ${opp.name} walks ${opp.bbPer9.toFixed(1)} per 9, creating extra base traffic.`;
  return { batter: b, propType: 'runs_scored', line: 0.5, modelProb, bookImplied: 0.45, edge: (modelProb - 0.45) * 100, confidence: 0, synopsis, matchupDetail: `${b.name} | OBP ${b.obp.toFixed(3)} | ${b.runs} R | L10 R/G: ${l10Runs.toFixed(1)}`, book: 'DraftKings' };
}

// ============ MAIN EXPORT: GENERATE BATTER PROPS ============
export interface GameContext {
  gamePk: number;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homePitcher: PitcherStats | null;
  awayPitcher: PitcherStats | null;
  venue: string;
  parkHR?: number;
  parkHits?: number;
  wxStr?: string;
  windOut?: boolean;
  umpStr?: string;
  dataConf?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export async function generateBatterProps(games: GameContext[]): Promise<BestBet[]> {
  const allProps: BestBet[] = [];

  for (const g of games) {
    if (!g.homePitcher?.confirmed || !g.awayPitcher?.confirmed) continue;

    // Fetch batters for both teams in parallel
    const [homeBatters, awayBatters, propLines] = await Promise.all([
      fetchRosterBatters(g.homeTeamId),
      fetchRosterBatters(g.awayTeamId),
      fetchBatterPropLines(g.gamePk),
    ]);

    // Set team names
    homeBatters.forEach(b => b.team = g.homeTeam);
    awayBatters.forEach(b => b.team = g.awayTeam);

    const catcherPopTime = 2.00; // Default, would fetch from Statcast if available

    // Generate props: home batters face away pitcher, away batters face home pitcher
    const sides: { batters: BatterStats[]; opp: PitcherStats; oppTeam: string; team: string }[] = [
      { batters: homeBatters, opp: g.awayPitcher!, oppTeam: g.awayTeam, team: g.homeTeam },
      { batters: awayBatters, opp: g.homePitcher!, oppTeam: g.homeTeam, team: g.awayTeam },
    ];

    // Track prop counts per type per game (max 3 per type per game)
    const propCounts: Record<string, number> = {};

    for (const side of sides) {
      const candidates: PropCandidate[] = [];

      for (const batter of side.batters) {
        // Total Bases
        const tb = scoreTotalBases(batter, side.opp, (g.parkHR ?? 1.0), (g.wxStr ?? 'Unknown'));
        if (tb) candidates.push(tb);

        // Home Run
        const hr = scoreHR(batter, side.opp, (g.parkHR ?? 1.0), (g.windOut ?? false));
        if (hr) candidates.push(hr);

        // Hits
        const hits = scoreHits(batter, side.opp, (g.parkHits ?? 1.0));
        if (hits) candidates.push(hits);

        // Stolen Base
        const sb = scoreStolenBase(batter, catcherPopTime);
        if (sb) candidates.push(sb);

        // Multi-Hit (2+)
        const mh = scoreMultiHit(batter, side.opp);
        if (mh) candidates.push(mh);

        // RBI
        const rbi = scoreRBI(batter, side.opp);
        if (rbi) candidates.push(rbi);

        // Runs Scored
        const rs = scoreRunsScored(batter, side.opp);
        if (rs) candidates.push(rs);
      }

      // Match with Odds API lines if available
      for (const c of candidates) {
        const match = propLines.find(l => l.player.toLowerCase().includes(c.batter.name.split(' ').pop()?.toLowerCase() || ''));
        if (match) {
          c.line = match.line;
          c.bookImplied = match.overPrice ? impliedProbFromAmerican(match.overPrice) : c.bookImplied;
          c.edge = (c.modelProb - c.bookImplied) * 100;
          c.book = match.book;
        }
      }

      // Filter: min 8% edge (Priority 3 rule)
      const qualified = candidates.filter(c => c.edge >= 8.0);

      // Sort by edge descending
      qualified.sort((a, b) => b.edge - a.edge);

      // Enforce max 3 per prop type per game
      for (const c of qualified) {
        const key = c.propType;
        propCounts[key] = (propCounts[key] || 0);
        if (propCounts[key] >= 3) continue;
        propCounts[key]++;

        // Calculate confidence score
        const conf = Math.min(9.5, 6.5 + c.edge * 0.15 + (c.batter.last10.pa > 30 ? 0.5 : 0) + (c.batter.hitStreak >= 5 ? 0.5 : 0));

        const propLabels: Record<string, string> = {
          total_bases: 'OVER',
          home_run: 'YES',
          hits: 'OVER',
          stolen_base: 'YES',
          '2plus_hits': 'YES',
          rbi: 'OVER',
          runs_scored: 'OVER',
        };

        const propNames: Record<string, string> = {
          total_bases: 'total bases',
          home_run: 'home run',
          hits: 'hits',
          stolen_base: 'stolen base',
          '2plus_hits': '2+ hits',
          rbi: 'RBI',
          runs_scored: 'runs scored',
        };

        const dir = propLabels[c.propType] || 'OVER';
        const propName = propNames[c.propType] || c.propType;
        const pickStr = `${c.batter.name} ${dir} ${c.line} ${propName}`;

        allProps.push({
          id: `mlb-${g.gamePk}-bp-${c.batter.playerId}-${c.propType}`,
          game_id: String(g.gamePk),
          pick: pickStr,
          edge_pct: parseFloat(c.edge.toFixed(1)),
          confidence: parseFloat(conf.toFixed(1)),
          rationale: c.synopsis,
          bet_type: 'player_prop',
          best_book: c.book,
          sport: 'MLB',
          data_confidence: (g.dataConf ?? 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          home_pitcher: g.homePitcher || undefined,
          away_pitcher: g.awayPitcher || undefined,
          matchup_detail: c.matchupDetail,
          weather_detail: g.wxStr ?? 'Unknown',
          umpire_detail: g.umpStr ?? 'Umpire: TBD',
          recommendation: conf >= 8.0 ? 'BET' : conf >= 7.0 ? 'LEAN' : 'NO BET',
        });
      }
    }
  }

  return allProps;
}
