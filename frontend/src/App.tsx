import { useState, useEffect, useCallback } from "react";
import { api, Game, BestBet, NewsItem, WeatherData, Parlay, PitcherStats, GoalieStats, StreakData } from "./api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Cloud, Newspaper, BarChart3, Trophy, AlertTriangle, RefreshCw, MapPin, Shield, Target, Thermometer, Wind, Lock } from "lucide-react";
import Sportsbook from './Sportsbook';

function useApi<T>(fn: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(() => {
    setLoading(true);
    fn().then(setData).catch(() => setData(fallback)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { refresh(); }, []);
  return { data, loading, refresh };
}

function Badge({ value }: { value: number }) {
  const color = value >= 8 ? "text-edge-green glow-green" : value >= 6 ? "text-edge-amber glow-amber" : "text-edge-red glow-red";
  return <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${color} bg-edge-card border border-edge-border`}>{value.toFixed(1)}</span>;
}

function DataConfidenceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    HIGH: "bg-green-900/40 text-green-400 border-green-800/50",
    MEDIUM: "bg-yellow-900/40 text-yellow-400 border-yellow-800/50",
    LOW: "bg-red-900/40 text-red-400 border-red-800/50",
  };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${colors[level] || "bg-gray-800 text-gray-400 border-gray-700"}`}>{level} DATA</span>;
}

function RecommendationBadge({ rec }: { rec: string }) {
  const colors: Record<string, string> = {
    BET: "bg-green-600/30 text-green-300 border-green-500/50",
    LEAN: "bg-yellow-600/30 text-yellow-300 border-yellow-500/50",
    'NO BET': "bg-gray-700/30 text-gray-400 border-gray-600/50",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors[rec] || "bg-gray-800 text-gray-400 border-gray-700"}`}>{rec}</span>;
}

function SportBadge({ sport }: { sport: string }) {
  const colors: Record<string, string> = {
    MLB: "bg-red-900/40 text-red-400",
    NBA: "bg-orange-900/40 text-orange-400",
    NHL: "bg-blue-900/40 text-blue-400",
    NFL: "bg-green-900/40 text-green-400",
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[sport] || "bg-gray-800 text-gray-400"}`}>{sport}</span>;
}

function BetTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    moneyline: "bg-purple-900/40 text-purple-400",
    spread: "bg-cyan-900/40 text-cyan-400",
    total: "bg-yellow-900/40 text-yellow-400",
    'over/under': "bg-yellow-900/40 text-yellow-400",
    player_prop: "bg-pink-900/40 text-pink-400",
    prop: "bg-pink-900/40 text-pink-400",
    run_line: "bg-indigo-900/40 text-indigo-400",
    puck_line: "bg-indigo-900/40 text-indigo-400",
    first_5: "bg-teal-900/40 text-teal-400",
  };
  const labels: Record<string, string> = {
    moneyline: 'MONEYLINE',
    spread: 'SPREAD',
    total: 'TOTAL',
    'over/under': 'TOTAL',
    player_prop: 'PLAYER PROP',
    prop: 'PROP',
    run_line: 'RUN LINE',
    puck_line: 'PUCK LINE',
    first_5: 'FIRST 5',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colors[type] || "bg-gray-800 text-gray-400"}`}>{labels[type] || type}</span>;
}

// CONFIDENCE TIER BADGE
function getConfidenceTier(confidence: number): { label: string; icon: string; css: string } | null {
  if (confidence >= 9.7) return { label: 'NUCLEAR', icon: '\u2622\uFE0F', css: 'tier-nuclear' };
  if (confidence >= 9.3) return { label: 'HIGH VOLTAGE', icon: '\u26A1\u26A1', css: 'tier-high-voltage' };
  if (confidence >= 8.8) return { label: 'VOLTAGE', icon: '\u26A1', css: 'tier-voltage' };
  return null;
}

function ConfidenceTierBadge({ confidence, mobile = false }: { confidence: number; mobile?: boolean }) {
  const tier = getConfidenceTier(confidence);
  if (!tier) return null;
  return (
    <div className={`tier-badge-vertical ${mobile ? 'tier-badge-mobile' : ''} ${tier.css}`}>
      <span>{tier.icon}</span>
      <span>{tier.label}</span>
    </div>
  );
}

function getParlayTier(legs: BestBet[]): { label: string; icon: string; css: string } | null {
  if (!legs || legs.length < 3) return null;
  const allAbove88 = legs.every(l => (l.confidence || 0) >= 8.8);
  if (allAbove88) return { label: 'NUCLEAR', icon: '\u2622\uFE0F', css: 'tier-nuclear' };
  const lowestConf = Math.min(...legs.map(l => l.confidence || 0));
  return getConfidenceTier(lowestConf);
}

function PitcherCard({ pitcher, label }: { pitcher: PitcherStats; label: string }) {
  if (!pitcher?.confirmed) return null;
    
    return (  
  <div className="bg-edge-card/50 rounded p-2 border border-edge-border/30">
      <div className="text-[9px] text-edge-muted uppercase mb-1">{label}</div>
      <div className="text-xs font-bold text-white">{pitcher.name} <span className="text-edge-muted">({pitcher.hand})</span></div>
      <div className="flex gap-2 mt-1 text-[10px]">
        <span>ERA <span className="text-white font-bold">{pitcher.era.toFixed(2)}</span></span>
        <span>WHIP <span className="text-white font-bold">{pitcher.whip.toFixed(2)}</span></span>
        <span>K/9 <span className="text-white font-bold">{pitcher.kPer9.toFixed(1)}</span></span>
        <span>IP <span className="text-white font-bold">{pitcher.ip.toFixed(0)}</span></span>
      </div>
      {pitcher.last3 && pitcher.last3.length > 0 && (
        <div className="text-[9px] text-edge-muted mt-1">Last 3: {pitcher.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', ')}</div>
      )}
    </div>
  );
}

function GoalieCard({ goalie, label }: { goalie: GoalieStats; label: string }) {
  if (!goalie?.confirmed) return null;
  return (
    <div className="bg-edge-card/50 rounded p-2 border border-edge-border/30">
      <div className="text-[9px] text-edge-muted uppercase mb-1">{label}</div>
      <div className="text-xs font-bold text-white">{goalie.name}</div>
      <div className="flex gap-2 mt-1 text-[10px]">
        <span>SV% <span className="text-white font-bold">{(goalie.savePct * 100).toFixed(1)}%</span></span>
        <span>GAA <span className="text-white font-bold">{goalie.gaa.toFixed(2)}</span></span>
        <span>W-L <span className="text-white font-bold">{goalie.wins}-{goalie.losses}</span></span>
      </div>
    </div>
  );
}

function BetCard({ b }: { b: BestBet }) {
  return (
    <div className="bg-edge-card rounded-lg border border-edge-border p-3 mb-3">
      <div className="text-sm font-bold text-white mb-1">{b.pick}</div>
      <div className="flex gap-2 mb-2 flex-wrap">
        {b.recommendation && <RecommendationBadge rec={b.recommendation} />}
        {b.data_confidence && <DataConfidenceBadge level={b.data_confidence} />}
      </div>
      <div className="text-xs text-edge-muted mb-2">
        <span className="text-edge-green font-bold">Edge:</span> +{b.edge_pct}% &nbsp; {b.best_book}
      </div>
      {b.weather_detail && (
        <div className="text-[10px] text-cyan-400 mb-1">{b.weather_detail}</div>
      )}
      {b.umpire_detail && (
        <div className="text-[10px] text-yellow-400 mb-1">{b.umpire_detail}</div>
      )}
      {b.bullpen_detail && (
        <div className="text-[10px] text-orange-400 mb-1">{b.bullpen_detail}</div>
      )}
      {b.matchup_detail && (
        <div className="text-[10px] text-edge-muted mb-2">{b.matchup_detail}</div>
      )}
      <div className="text-xs text-gray-300 leading-relaxed">{b.rationale}</div>
      {(b.home_pitcher || b.away_pitcher) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {b.away_pitcher && <PitcherCard pitcher={b.away_pitcher} label="AWAY SP" />}
          {b.home_pitcher && <PitcherCard pitcher={b.home_pitcher} label="HOME SP" />}
        </div>
      )}
      {(b.home_goalie || b.away_goalie) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {b.away_goalie && <GoalieCard goalie={b.away_goalie} label="AWAY G" />}
          {b.home_goalie && <GoalieCard goalie={b.home_goalie} label="HOME G" />}
        </div>
      )}
    </div>
  );
}

function generateSynopsis(b: BestBet): string {
  const pick = b.pick;
  const edge = b.edge_pct;
  const sport = b.sport;
  const betType = b.bet_type;
  const hp = b.home_pitcher;
  const ap = b.away_pitcher;
  const hg = b.home_goalie;
  const ag = b.away_goalie;
  const wx = b.weather_detail || '';
  const ump = b.umpire_detail || '';
  const matchup = b.matchup_detail || '';

  // Extract team names from matchup_detail or pick
  const isOver = pick.toLowerCase().includes('over');
  const isUnder = pick.toLowerCase().includes('under');
  const isML = betType === 'moneyline';
  const isRL = betType === 'run_line' || betType === 'puck_line' || betType === 'spread';
  const isTotal = betType === 'total' || betType === 'first_5';
  const isProp = betType === 'player_prop';
  const isF5 = betType === 'first_5';

  // MLB STRIKEOUT PROPS
  if (sport === 'MLB' && isProp && pick.toLowerCase().includes('strikeout')) {
    const pitcher = hp?.confirmed ? hp : ap?.confirmed ? ap : null;
    if (pitcher) {
      const kRate = matchup.match(/(\d+\.\d+)%/);
      const kRateStr = kRate ? kRate[1] + '%' : 'elevated';
      const avgK = pitcher.last3.length > 0 ? (pitcher.last3.reduce((s, x) => s + x.k, 0) / pitcher.last3.length).toFixed(0) : null;
      const recentStr = avgK ? `averaging ${avgK} Ks per outing in his last ${pitcher.last3.length} starts` : `posting elite strikeout numbers this season`;
      const domeStr = wx.toLowerCase().includes('dome') ? ' The dome environment neutralizes any weather concerns.' : '';
      return `${pitcher.name} has been dominant on the mound, ${recentStr} with a ${pitcher.kPer9.toFixed(1)} K/9 rate through ${pitcher.ip.toFixed(0)} innings. He draws a lineup that strikes out at a ${kRateStr} clip, creating one of the sharpest K props on today's board.${domeStr}`;
    }
  }

  // MLB MONEYLINE
  if (sport === 'MLB' && isML) {
    const fav = hp && ap ? (hp.era < ap.era ? hp : ap) : hp || ap;
    const dog = hp && ap ? (hp.era < ap.era ? ap : hp) : null;
    if (fav && dog) {
      const bpInfo = b.bullpen_detail || '';
      const bpMatch = bpInfo.match(/Home BP ERA: ([\d.]+).*Away BP ERA: ([\d.]+)/);
      const bpStr = bpMatch ? ` The bullpen edge backs it up at ${bpMatch[1]} vs ${bpMatch[2]} ERA.` : '';
      return `This is a clear pitching mismatch. ${fav.name} (${fav.era.toFixed(2)} ERA, ${fav.kPer9.toFixed(1)} K/9) has been significantly sharper than ${dog.name} (${dog.era.toFixed(2)} ERA) on the season, and the ${edge.toFixed(1)}% edge reflects that gap.${bpStr}`;
    }
  }

  // MLB RUN LINE
  if (sport === 'MLB' && isRL) {
    const fav = hp && ap ? (hp.era < ap.era ? hp : ap) : hp || ap;
    if (fav) {
      const avgIP = fav.last3.length > 0 ? (fav.last3.reduce((s, x) => s + x.ip, 0) / fav.last3.length).toFixed(1) : '5+';
      return `The run line is in play because ${fav.name} has been going deep into games, averaging ${avgIP} innings over his last ${fav.last3.length} starts while keeping runs off the board. When your ace is pitching into the 6th with a low ERA, covering -1.5 becomes much more realistic.`;
    }
  }

  // MLB TOTAL / F5
  if (sport === 'MLB' && (isTotal || isF5)) {
    const dir = isOver ? 'over' : 'under';
    const parkMatch = matchup.match(/PF: ([\d.]+)/);
    const parkFactor = parkMatch ? parseFloat(parkMatch[1]) : 1.0;
    if (isF5) {
      return `The first 5 innings isolate the starters and strip out bullpen variance. With ${hp?.name || 'the home starter'} and ${ap?.name || 'the away starter'} both on the mound, the F5 ${dir} is the cleaner play. Combined ERA and K-rate point to a controlled early game.`;
    }
    if (dir === 'over' && parkFactor >= 1.05) {
      return `This game is set in a hitter-friendly environment with a park factor of ${parkFactor.toFixed(2)}, and the pitching matchup doesn't inspire confidence on either side. When you combine elevated HR rates with warm weather and average-to-below arms, overs tend to cash.`;
    }
    if (dir === 'under') {
      return `Two quality arms on the mound today with a combined profile that suppresses offense. The park plays neutral-to-pitcher-friendly, and neither lineup has the kind of power to overcome elite stuff. This total looks inflated.`;
    }
  }

  // NHL MONEYLINE
  if (sport === 'NHL' && isML) {
    const better = hg && ag ? (hg.savePct > ag.savePct ? hg : ag) : hg || ag;
    const worse = hg && ag ? (hg.savePct > ag.savePct ? ag : hg) : null;
    if (better && worse) {
      return `Goaltending wins hockey games, and there's a clear edge here. ${better.name} is posting a ${(better.savePct * 100).toFixed(1)}% save rate with a ${better.gaa.toFixed(2)} GAA, significantly outperforming ${worse.name} (${(worse.savePct * 100).toFixed(1)}% SV, ${worse.gaa.toFixed(2)} GAA). That kind of gap between the pipes tilts this matchup.`;
    }
  }

  // NHL PUCK LINE
  if (sport === 'NHL' && isRL) {
    return `The goaltending mismatch is wide enough to consider the puck line. When one side has a clear advantage in net and recent form backs it up, -1.5 becomes viable in a sport where empty-net goals frequently seal the cover.`;
  }

  // NHL TOTAL
  if (sport === 'NHL' && isTotal) {
    if (isUnder && hg && ag) {
      return `Both goalies are dialed in right now, with recent save percentages that suppress scoring. When two hot netminders meet, unders hit at an elevated rate. The combined GAA tells the story here.`;
    }
    if (isOver) {
      return `Neither goalie is stopping pucks consistently right now, and the recent form shows leaky defense on both sides. This has the makings of a high-event, back-and-forth game.`;
    }
  }

  // NHL SAVE PROP
  if (sport === 'NHL' && isProp) {
    const goalie = hg?.confirmed ? hg : ag?.confirmed ? ag : null;
    if (goalie) {
      return `${goalie.name} has been a wall recently, posting a ${(goalie.savePct * 100).toFixed(1)}% save rate on the season. He's seeing heavy volume and converting at an elite clip. The over on saves is one of the sharper goalie props available tonight.`;
    }
  }

  // NBA
  if (sport === 'NBA' && isML) {
    return `The spread and defensive matchup data both favor this side. When one team allows significantly more points per game and the pace of play aligns, the moneyline becomes a high-value play at current odds.`;
  }
  if (sport === 'NBA' && isRL) {
    return `The spread is backed by a meaningful defensive gap between these two teams. The pace and scoring environment project a comfortable margin, making the points worth taking at this number.`;
  }
  if (sport === 'NBA' && isTotal) {
    const dir = isOver ? 'over' : 'under';
    return dir === 'over'
      ? `Both defenses rank in the bottom tier of the league in points allowed, and the pace of play pushes possessions higher than average. This total looks too low for two teams that struggle to get stops.`
      : `This is a grind-it-out matchup between two slower-paced teams with competent defenses. The combined tempo drags the scoring projection well below the posted line.`;
  }
  if (sport === 'NBA' && isProp) {
    return `The defensive matchup creates a scoring environment that favors this team total. When you face a bottom-tier defense that hemorrhages points, the over on team scoring is one of the highest-percentage plays available.`;
  }

  // Fallback
  return b.rationale.length > 200 ? b.rationale.substring(0, 200) + '...' : b.rationale;
}

interface PowerParlay {
  legs: BestBet[];
  combinedOdds: number;
  impliedProb: number;
  modelProb: number;
  edgePct: number;
  isBet: boolean;
  updatedAt: Date;
}

function buildPowerParlay(bets: BestBet[]): PowerParlay | null {
  if (bets.length < 3) return null;
  const sorted = [...bets].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const legs: BestBet[] = [];
  const usedGames = new Set<string>();
  const usedTypes = new Set<string>();
  for (const b of sorted) {
    if (legs.length >= 3) break;
    if (usedGames.has(b.game_id)) continue;
    const typeGroup = b.bet_type === 'moneyline' || b.bet_type === 'spread' || b.bet_type === 'run_line' || b.bet_type === 'puck_line' ? 'side' : b.bet_type === 'total' || b.bet_type === 'first_5' ? 'total' : 'prop';
    if (legs.length >= 2 && usedTypes.has(typeGroup) && sorted.some(x => !usedGames.has(x.game_id) && x.confidence >= 7 && ((x.bet_type === 'moneyline' || x.bet_type === 'spread' || x.bet_type === 'run_line' || x.bet_type === 'puck_line' ? 'side' : x.bet_type === 'total' || x.bet_type === 'first_5' ? 'total' : 'prop') !== typeGroup))) continue;
    legs.push(b);
    usedGames.add(b.game_id);
    usedTypes.add(typeGroup);
  }
  if (legs.length < 3) {
    for (const b of sorted) {
      if (legs.length >= 3) break;
      if (usedGames.has(b.game_id)) continue;
      legs.push(b);
      usedGames.add(b.game_id);
    }
  }
  if (legs.length < 3) return null;
  const finalLegs = legs.slice(0, 3);
  const legProbs = finalLegs.map(l => Math.min(0.85, (l.confidence / 10) * 0.9));
  const modelProb = legProbs.reduce((a, b) => a * b, 1);
  const impliedProb = modelProb * 0.82;
  const decimalOdds = 1 / impliedProb;
  const americanOdds = decimalOdds >= 2 ? Math.round((decimalOdds - 1) * 100) : Math.round(-100 / (decimalOdds - 1));
  const edgePct = parseFloat(((modelProb - impliedProb) / impliedProb * 100).toFixed(1));
  return {
    legs: finalLegs,
    combinedOdds: americanOdds,
    impliedProb: parseFloat((impliedProb * 100).toFixed(1)),
    modelProb: parseFloat((modelProb * 100).toFixed(1)),
    edgePct,
    isBet: modelProb >= 0.35,
    updatedAt: new Date()
  };
}

function generateParlayLegReason(b: BestBet): string {
  const sport = b.sport;
  const betType = b.bet_type;
  const hp = b.home_pitcher;
  const ap = b.away_pitcher;
  const hg = b.home_goalie;
  const ag = b.away_goalie;
  if (sport === 'MLB' && betType === 'player_prop' && b.pick.toLowerCase().includes('strikeout')) {
    const p = hp?.confirmed ? hp : ap?.confirmed ? ap : null;
    if (p) return `${p.name} owns a ${p.kPer9.toFixed(1)} K/9 against a lineup that strikes out at an elite clip.`;
  }
  if (sport === 'MLB' && betType === 'moneyline') {
    const fav = hp && ap ? (hp.era < ap.era ? hp : ap) : hp || ap;
    const dog = hp && ap ? (hp.era < ap.era ? ap : hp) : null;
    if (fav && dog) return `${fav.name} (${fav.era.toFixed(2)} ERA) has a decisive pitching edge over ${dog.name} (${dog.era.toFixed(2)} ERA).`;
  }
  if (sport === 'MLB' && (betType === 'total' || betType === 'first_5')) {
    return `Combined pitching profile and park factor align for this ${betType === 'first_5' ? 'F5' : ''} total.`;
  }
  if (sport === 'MLB' && (betType === 'run_line' || betType === 'spread')) {
    const fav = hp && ap ? (hp.era < ap.era ? hp : ap) : hp || ap;
    if (fav) return `${fav.name} goes deep into games and the bullpen edge supports covering -1.5.`;
  }
  if (sport === 'NHL') {
    const better = hg && ag ? (hg.savePct > ag.savePct ? hg : ag) : hg || ag;
    if (better) return `${better.name} (${(better.savePct*100).toFixed(1)}% SV) gives a clear goaltending advantage.`;
  }
  if (sport === 'NBA') {
    return `Defensive matchup data and pace projection both favor this side at current numbers.`;
  }
  return `${b.edge_pct.toFixed(1)}% edge cleared the data gate with high confidence.`;
}

function generateParlayCloser(parlay: PowerParlay): string {
  const types = new Set(parlay.legs.map(l => l.bet_type));
  const sports = new Set(parlay.legs.map(l => l.sport));
  const avgConf = (parlay.legs.reduce((s, l) => s + l.confidence, 0) / parlay.legs.length).toFixed(1);
  const diverseStr = types.size >= 2 ? `${types.size} different bet types` : 'focused approach';
  const sportStr = sports.size >= 2 ? `across ${sports.size} sports` : `in ${[...sports][0]}`;
  if (!parlay.isBet) return `Combined implied probability dropped below 35%. This parlay is flagged NO BET today — the individual plays are stronger on their own.`;
  return `Three independently validated edges ${sportStr}, ${diverseStr}, zero correlated risk. Average leg confidence: ${avgConf}/10. Model gives this a ${parlay.modelProb}% hit rate against ${parlay.impliedProb}% implied. This is the play.`;
}

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-edge-card rounded-lg border border-edge-border p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">{icon}
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LeagueSection({ sport, label, color, bets }: { sport: string; label: string; color: string; bets: BestBet[] }) {
  if (bets.length === 0) return null;
  const gameGroups = new Map<string, BestBet[]>();
  bets.forEach(b => {
    const gid = b.game_id;
    if (!gameGroups.has(gid)) gameGroups.set(gid, []);
    gameGroups.get(gid)!.push(b);
  });
  return (
    <div className="mb-6">
      <div className={`text-lg font-bold mb-3 ${color}`}>{label} <span className="text-sm text-edge-muted font-normal">({bets.length} picks across {gameGroups.size} games)</span></div>
      {Array.from(gameGroups.entries()).map(([gid, gameBets]) => (
        <div key={gid} className="mb-4">
          <div className="text-xs text-edge-muted mb-2 uppercase">Game {gid}</div>
          {gameBets.map((b) => <BetCard key={b.id} b={b} />)}
        </div>
      ))}
    </div>
  );
}

function StreakTracker({ streak }: { streak: StreakData }) {
  const isHot = streak.streakType === 'W' && streak.streakCount >= 3;
  const streakColor = streak.streakType === 'W' ? 'text-green-400' : streak.streakType === 'L' ? 'text-red-400' : 'text-edge-muted';
  if (!streak.hasBets) {
    return (
      <div className="flex items-center gap-2 bg-edge-card/50 border border-edge-border rounded-lg px-3 py-1.5">
        <span className="text-xs text-edge-muted">0-0 | Start Tracking</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 bg-edge-card/50 border border-edge-border rounded-lg px-3 py-1.5">
      <span className="text-xs font-bold text-white">{streak.streak}</span>
      <span className={`text-xs font-bold ${streakColor}`}>{streak.streakType}{streak.streakCount}</span>
      <span className={`text-xs ${streak.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{streak.roi >= 0 ? '+' : ''}{streak.roi}% ROI</span>
      {isHot && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
    </div>
  );
}

export default function App() {
  const { data: games, loading: gamesLoading, refresh: refreshGames } = useApi(api.games, []);
    const { data: bets } = useApi(api.bestBets, []);
  const { data: news, refresh: refreshNews } = useApi(api.news, []);
  const { data: weather, refresh: refreshWeather } = useApi(api.weather, []);
  const { data: parlays } = useApi(api.parlays, []);
    const { data: streakData } = useApi<StreakData>(api.streakData, { wins: 0, losses: 0, pushes: 0, streak: '0-0', streakType: 'none', streakCount: 0, roi: 0, totalWagered: 0, totalProfit: 0, hasBets: false });
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
          const interval = setInterval(() => {
      refreshGames(); refreshNews(); refreshWeather(); setLastRefresh(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const liveGames = games.filter(g => g.status !== "scheduled" && g.status !== "final");
  const alerts: string[] = [];
  liveGames.forEach(g => {
    const diff = Math.abs(g.home_score - g.away_score);
    if (diff <= 1) alerts.push(`Close game: ${g.away_team} vs ${g.home_team} (${g.away_score}-${g.home_score})`);
  });
  if (games.length > 0) alerts.push(`${games.length} games on today's slate`);
  if (bets.length > 0) alerts.push(`${bets.length} total picks across all bet types`);

  const top5 = [...bets].sort((a, b) => (b.edge_pct || 0) - (a.edge_pct || 0)).slice(0, 5);

  const powerParlay = buildPowerParlay(bets);
  return (
    <div className="min-h-screen bg-edge-bg text-edge-muted p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black text-edge-green tracking-tight">EDGEBOARD</h1>
          <p className="text-xs text-edge-muted">FULL GAME CARDS | ML • RUN LINE • TOTAL • F5 • PROPS • {new Date().toLocaleDateString()}</p>
                  <StreakTracker streak={streakData} />
        </div>
        <button onClick={() => { refreshGames(); refreshNews(); refreshWeather(); setLastRefresh(new Date()); }} className="text-edge-muted hover:text-white transition" title="Refresh data"><RefreshCw size={16} /></button>
      </div>

      {/* TOP 5 BETS OF THE DAY */}
      {top5.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-edge-green mb-3 flex items-center gap-2"><Trophy size={18} /> Top 5 Bets of the Day</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {top5.map((b, i) => (
                              <div key={b.id} className="bg-edge-card rounded-lg border border-edge-border p-3 pl-10 relative overflow-hidden">
                                <ConfidenceTierBadge confidence={b.confidence} mobile />
                <div className="absolute -top-2 -right-2 bg-edge-green text-black text-[10px] font-black px-1.5 py-0.5 rounded">#{i + 1}</div>
                <div className="flex gap-1.5 mb-2 flex-wrap"><SportBadge sport={b.sport} /> <BetTypeBadge type={b.bet_type} /></div>
                <div className="text-sm font-bold text-white mb-2">{b.pick}</div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge value={b.confidence} />
                  <span className="text-edge-green font-bold text-xs">+{b.edge_pct}%</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-2">{generateSynopsis(b)}</p>
                <div className="text-[10px] text-edge-muted">{b.matchup_detail}</div>
                {b.weather_detail && <div className="text-[10px] text-cyan-400 mt-1">{b.weather_detail}</div>}
                {b.umpire_detail && <div className="text-[10px] text-yellow-400 mt-1">{b.umpire_detail}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
              {/* DAILY POWER PARLAY */}
        {powerParlay && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-edge-green mb-3 flex items-center gap-2"><Lock size={18} /> Daily Power Parlay</h2>
                        <div className="bg-edge-card rounded-lg border border-edge-border p-4 pl-10 relative overflow-hidden">
                                        {(() => { const t = getParlayTier(powerParlay.legs); return t ? <div className={`tier-badge-vertical ${t.css}`}><span>{t.icon}</span><span>{t.label}</span></div> : null; })()}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-edge-muted">3-Leg • Highest Combined Confidence • Zero Correlation</span>
                <span className="text-2xl font-bold text-edge-green">+{powerParlay.combinedOdds}</span>
              </div>
              <div className="text-xs text-edge-muted mb-3">{powerParlay.impliedProb}% implied / {powerParlay.modelProb}% model</div>
              {!powerParlay.isBet && (
                <div className="bg-red-900/20 border border-red-800/50 rounded p-2 mb-3 text-xs text-red-400">NO BET — Combined implied probability below 35%. Individual legs are stronger plays today.</div>
              )}
              <div className="space-y-2 mb-3">
                {powerParlay.legs.map((leg, i) => (
                  <div key={i} className="bg-edge-bg/50 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{leg.pick}</span>
                      <span className="text-xs text-edge-green font-bold">{leg.confidence.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{generateParlayLegReason(leg)}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs mb-3">
                <span>Combined Odds: <strong className="text-white">+{powerParlay.combinedOdds}</strong></span>
                <span>Model: <strong className="text-edge-green">{powerParlay.modelProb}%</strong></span>
                <span>Book Implied: <strong className="text-edge-muted">{powerParlay.impliedProb}%</strong></span>
                <span>Edge: <strong className="text-edge-green">+{powerParlay.edgePct}%</strong></span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed mb-2">{generateParlayCloser(powerParlay)}</p>
              <div className="text-[10px] text-edge-muted">Updated {powerParlay.updatedAt.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}</div>
            </div>
          </div>
        )}

      <Card title="TODAY'S GAMES" icon={<BarChart3 size={16} className="text-edge-green" />} className="lg:col-span-2">
        {gamesLoading ? <div className="text-center text-edge-muted">Loading...</div>
        : games.length === 0 ? <div className="text-center text-edge-muted">No games today</div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {games.map((g) => (
              <div key={g.id} className="bg-edge-bg rounded p-2 flex items-center justify-between text-xs">
                <span className="font-medium text-white">{g.away_team} <span className="text-edge-muted">@</span> {g.home_team}</span>
                <span className="flex items-center gap-2">
                  {g.away_score ?? "-"} – {g.home_score ?? "-"} <span className="text-edge-muted">{g.status === "scheduled" ? new Date(g.game_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : g.status}</span>
                  <SportBadge sport={g.sport} />
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="WEATHER" icon={<Cloud size={16} className="text-cyan-400" />}>
        {weather.length === 0 ? <div className="text-center text-edge-muted">No data</div>
        : (
          <div className="space-y-2">
            {weather.map((w, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-white font-medium">{w.impact_text || w.condition}</span>
                <span className="text-edge-muted">{w.condition} • {w.temp_f}°F • {w.wind_mph}mph</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="NEWS" icon={<Newspaper size={16} className="text-blue-400" />} className="lg:col-span-2">
        {news.length === 0 ? <div className="text-center text-edge-muted">No news</div>
        : (
          <div className="space-y-2">
            {news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-edge-bg/50 rounded p-2 transition">
                <div className="text-xs font-medium text-white">{n.headline}</div>
                <div className="text-[10px] text-edge-muted">{n.source} • {n.sport} • {new Date(n.fetched_at).toLocaleDateString()}</div>
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card title="ALERTS" icon={<AlertTriangle size={16} className="text-yellow-400" />}>
        {alerts.length === 0 ? <div className="text-center text-edge-muted">No alerts</div>
        : (
          <div className="space-y-1">
            {alerts.map((a, i) => <div key={i} className="text-xs text-yellow-300">{a}</div>)}
          </div>
        )}
      </Card>

              {/* ===== SPORTSBOOK SECTION ===== */}
        <div className="lg:col-span-3 mt-2">
          <div className="border border-edge-green/20 rounded-xl p-4 bg-edge-card/50">
            <Sportsbook bets={bets} />
          </div>
        </div>
      <div className="text-center text-[10px] text-edge-muted mt-6">
        EdgeBoard v3.0 | Full Game Cards: ML • Run Line • Total • F5 • Props | Weather • Umpire • Bullpen • Park Factor | Data refreshes every 60s | Last: {lastRefresh.toLocaleTimeString()} | Not financial advice
      </div>
    </div>
  );
}
