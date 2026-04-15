import { useState, useEffect, useCallback } from 'react';
import { api, BestBet, UserBet, BetSlipLeg } from './api';
import { DollarSign, Plus, Trash2, CheckCircle, XCircle, Clock, TrendingUp, BarChart3, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface BetSlipEntry {
  id: string;
  pick: string;
  sport: string;
  betType: 'moneyline' | 'spread' | 'total';
  odds: number;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  gameTime: string;
}

function oddsToDecimal(american: number): number {
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

function calcPayout(stake: number, odds: number): number {
  return parseFloat((stake * oddsToDecimal(odds)).toFixed(2));
}

function calcParlaySingleOdds(legs: BetSlipEntry[]): number {
  const decimal = legs.reduce((acc, l) => acc * oddsToDecimal(l.odds), 1);
  const american = decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
  return american;
}

function SportBadge({ sport }: { sport: string }) {
  const colors: Record<string, string> = {
    MLB: 'bg-red-900/40 text-red-400',
    NBA: 'bg-orange-900/40 text-orange-400',
    NHL: 'bg-blue-900/40 text-blue-400',
    NFL: 'bg-green-900/40 text-green-400',
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${colors[sport] || 'bg-gray-800 text-gray-400'}`}>{sport}</span>;
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/40 text-yellow-400 border border-yellow-800/50">PENDING</span>;
  if (result === 'win') return <span className="text-xs px-2 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800/50">WIN</span>;
  if (result === 'loss') return <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-800/50">LOSS</span>;
  return <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">PUSH</span>;
}

// BET SLIP PANEL
function BetSlip({
  entries,
  onRemove,
  onClear,
  onBetPlaced,
}: {
  entries: BetSlipEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onBetPlaced: () => void;
}) {
  const [mode, setMode] = useState<'single' | 'parlay'>('single');
  const [stake, setStake] = useState(100);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState('');

  const parlayOdds = entries.length >= 2 ? calcParlaySingleOdds(entries) : 0;
  const parlayPayout = entries.length >= 2 ? calcPayout(stake, parlayOdds) : 0;

  async function handlePlace() {
    setPlacing(true);
    setError('');
    try {
      const legs: BetSlipLeg[] = entries.map(e => ({
        id: e.id,
        gameId: e.gameId,
        sport: e.sport,
        homeTeam: e.homeTeam,
        awayTeam: e.awayTeam,
        gameTime: e.gameTime,
        betType: e.betType,
        pick: e.pick,
        odds: e.odds,
      }));
      const totalOdds = mode === 'parlay' ? parlayOdds : legs[0]?.odds || -110;
      const payout = mode === 'parlay' ? parlayPayout : calcPayout(stake, totalOdds);
      const result = await api.placeBet(legs, stake, totalOdds, payout);
      if (result) {
        setPlaced(true);
        setTimeout(() => {
          setPlaced(false);
          onBetPlaced();
          onClear();
        }, 2000);
      } else {
        setError('Failed to place bet. Check Supabase connection.');
      }
    } catch (e) {
      setError('Error placing bet.');
    }
    setPlacing(false);
  }

  if (entries.length === 0) {
    return (
      <div className="border border-edge-green/20 rounded-lg p-4 bg-edge-dark/50">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-edge-green" />
          <span className="text-sm font-bold text-edge-green uppercase tracking-wider">Bet Slip</span>
        </div>
        <p className="text-edge-muted text-xs text-center py-4">No picks added. Click + on any bet to add to slip.</p>
      </div>
    );
  }

  return (
    <div className="border border-edge-green/30 rounded-lg bg-edge-dark/80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge-green/20">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-edge-green" />
          <span className="text-sm font-bold text-edge-green uppercase tracking-wider">Bet Slip</span>
          <span className="text-xs bg-edge-green/20 text-edge-green px-1.5 py-0.5 rounded">{entries.length}</span>
        </div>
        <button onClick={onClear} className="text-edge-muted hover:text-red-400 text-xs transition">Clear All</button>
      </div>

      {entries.length >= 2 && (
        <div className="flex border-b border-edge-green/10">
          {(['single', 'parlay'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-xs font-bold uppercase transition ${
                mode === m ? 'bg-edge-green/20 text-edge-green' : 'text-edge-muted hover:text-white'
              }`}
            >
              {m === 'parlay' ? `Parlay (+${parlayOdds})` : 'Singles'}
            </button>
          ))}
        </div>
      )}

      <div className="divide-y divide-edge-green/10">
        {(mode === 'parlay' ? entries : entries.slice(0, 1)).map(e => (
          <div key={e.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <SportBadge sport={e.sport} />
                <span className="text-xs text-edge-muted">{e.betType.toUpperCase()}</span>
              </div>
              <p className="text-sm font-semibold text-white truncate">{e.pick}</p>
              <p className="text-xs text-edge-muted">{e.homeTeam} vs {e.awayTeam}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-bold text-edge-green">{e.odds > 0 ? '+' : ''}{e.odds}</span>
              {mode === 'single' && (
                <span className="text-xs text-edge-muted">Pays ${calcPayout(stake, e.odds).toFixed(0)}</span>
              )}
              <button onClick={() => onRemove(e.id)} className="text-edge-muted hover:text-red-400 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {mode === 'single' && entries.length > 1 && (
          <div className="px-4 py-2 text-xs text-edge-muted italic">+{entries.length - 1} more in slip (switch to Parlay to combine)</div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-edge-green/20 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-edge-muted">Stake ($)</label>
          <div className="flex items-center gap-1">
            {[25, 50, 100, 200].map(v => (
              <button
                key={v}
                onClick={() => setStake(v)}
                className={`text-xs px-2 py-0.5 rounded transition ${
                  stake === v ? 'bg-edge-green/30 text-edge-green' : 'bg-gray-800 text-edge-muted hover:text-white'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>
        <input
          type="number"
          value={stake}
          onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:border-edge-green outline-none"
        />
        <div className="flex justify-between text-xs">
          <span className="text-edge-muted">To Win</span>
          <span className="text-edge-green font-bold">
            ${mode === 'parlay' ? (parlayPayout - stake).toFixed(2) : (calcPayout(stake, entries[0]?.odds || -110) - stake).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-edge-muted">Total Payout</span>
          <span className="text-white font-bold">
            ${mode === 'parlay' ? parlayPayout.toFixed(2) : calcPayout(stake, entries[0]?.odds || -110).toFixed(2)}
          </span>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {placed ? (
          <div className="flex items-center justify-center gap-2 py-2 text-edge-green">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-bold">Bet Placed!</span>
          </div>
        ) : (
          <button
            onClick={handlePlace}
            disabled={placing}
            className="w-full py-2.5 bg-edge-green text-black font-bold text-sm rounded hover:bg-green-400 transition disabled:opacity-50"
          >
            {placing ? 'Placing...' : `Place ${mode === 'parlay' ? 'Parlay' : 'Bet'} — $${stake}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ACTIVE BETS
function ActiveBets({
  bets,
  onSettle,
  onRefresh,
}: {
  bets: UserBet[];
  onSettle: (id: string, result: 'win' | 'loss' | 'push') => void;
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);

  const pending = bets.filter(b => b.status === 'active' || !b.result);

  if (pending.length === 0) {
    return (
      <div className="border border-gray-800 rounded-lg p-4 bg-edge-dark/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-edge-amber" />
            <span className="text-sm font-bold text-edge-amber uppercase tracking-wider">Active Bets</span>
          </div>
          <button onClick={onRefresh} className="text-edge-muted hover:text-white transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-edge-muted text-xs text-center py-4">No active bets. Place a bet to track it here.</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded-lg bg-edge-dark/80">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-edge-amber" />
          <span className="text-sm font-bold text-edge-amber uppercase tracking-wider">Active Bets</span>
          <span className="text-xs bg-yellow-900/40 text-yellow-400 px-1.5 py-0.5 rounded">{pending.length}</span>
        </div>
        <button onClick={onRefresh} className="text-edge-muted hover:text-white transition">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="divide-y divide-gray-800">
        {pending.map(bet => {
          const isExpanded = expandedId === bet.id;
          const isParlay = bet.legs && bet.legs.length > 1;
          return (
            <div key={bet.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <SportBadge sport={bet.sport} />
                    <span className="text-xs text-edge-muted uppercase">{bet.bet_type}</span>
                    {isParlay && <span className="text-xs bg-purple-900/40 text-purple-400 px-1 py-0.5 rounded">PARLAY</span>}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{bet.pick}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-edge-muted">Stake: <span className="text-white">${bet.stake}</span></span>
                    <span className="text-xs text-edge-muted">Odds: <span className="text-edge-green">{bet.odds > 0 ? '+' : ''}{bet.odds}</span></span>
                    <span className="text-xs text-edge-muted">To Win: <span className="text-edge-green">${((bet.potential_payout || 0) - (bet.stake || 0)).toFixed(0)}</span></span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <ResultBadge result={bet.result} />
                  {isParlay && (
                    <button onClick={() => setExpandedId(isExpanded ? null : bet.id)} className="text-edge-muted hover:text-white transition">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              {isParlay && isExpanded && bet.legs && (
                <div className="mt-2 pl-2 border-l-2 border-purple-800/50 space-y-1">
                  {bet.legs.map((leg, i) => (
                    <p key={i} className="text-xs text-edge-muted">
                      <span className="text-white">{leg.pick}</span> <span className="text-edge-green">{leg.odds > 0 ? '+' : ''}{leg.odds}</span>
                    </p>
                  ))}
                </div>
              )}
              {!bet.result && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-edge-muted">Settle:</span>
                  {(['win', 'loss', 'push'] as const).map(r => (
                    <button
                      key={r}
                      disabled={settling === bet.id}
                      onClick={async () => {
                        setSettling(bet.id);
                        await onSettle(bet.id, r);
                        setSettling(null);
                      }}
                      className={`text-xs px-2 py-0.5 rounded font-bold transition ${
                        r === 'win' ? 'bg-green-900/40 text-green-400 hover:bg-green-800/60 border border-green-800/50' :
                        r === 'loss' ? 'bg-red-900/40 text-red-400 hover:bg-red-800/60 border border-red-800/50' :
                        'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                      } disabled:opacity-40`}
                    >
                      {r === 'win' ? 'W' : r === 'loss' ? 'L' : 'P'}
                    </button>
                  ))}
                  {settling === bet.id && <span className="text-xs text-edge-muted">Saving...</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// BET HISTORY
function BetHistory({ bets }: { bets: UserBet[] }) {
  const settled = bets.filter(b => b.result !== null && b.result !== undefined);

  const wins = settled.filter(b => b.result === 'win').length;
  const losses = settled.filter(b => b.result === 'loss').length;
  const pushes = settled.filter(b => b.result === 'push').length;
  const totalStaked = settled.reduce((s, b) => s + (b.stake || 0), 0);
  const totalProfit = settled.reduce((s, b) => s + (b.profit || 0), 0);
  const roi = totalStaked > 0 ? (totalProfit / totalStaked * 100) : 0;

  return (
    <div className="border border-gray-800 rounded-lg bg-edge-dark/80">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <BarChart3 className="w-4 h-4 text-edge-muted" />
        <span className="text-sm font-bold text-white uppercase tracking-wider">Bet History</span>
      </div>

      {settled.length > 0 && (
        <div className="grid grid-cols-4 gap-px bg-gray-800 border-b border-gray-800">
          {[
            { label: 'Record', value: `${wins}-${losses}${pushes > 0 ? `-${pushes}` : ''}`, color: 'text-white' },
            { label: 'Profit', value: `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(0)}`, color: totalProfit >= 0 ? 'text-edge-green' : 'text-red-400' },
            { label: 'ROI', value: `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`, color: roi >= 0 ? 'text-edge-green' : 'text-red-400' },
            { label: 'Bets', value: String(settled.length), color: 'text-white' },
          ].map(stat => (
            <div key={stat.label} className="bg-edge-dark px-3 py-2 text-center">
              <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-edge-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {settled.length === 0 ? (
        <p className="text-edge-muted text-xs text-center py-6">No settled bets yet. Results will appear here once you settle your active bets.</p>
      ) : (
        <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
          {settled.slice().reverse().map(bet => (
            <div key={bet.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <SportBadge sport={bet.sport} />
                  <span className="text-xs text-edge-muted uppercase">{bet.bet_type}</span>
                </div>
                <p className="text-sm text-white truncate">{bet.pick}</p>
                <p className="text-xs text-edge-muted">{bet.date}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ResultBadge result={bet.result} />
                <span className={`text-xs font-bold ${
                  (bet.profit || 0) >= 0 ? 'text-edge-green' : 'text-red-400'
                }`}>
                  {(bet.profit || 0) >= 0 ? '+' : ''}${(bet.profit || 0).toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

// SYNOPSIS GENERATOR — same logic as Top 5 cards
function generatePickSynopsis(b: BestBet): string {
  const pick = b.pick;
  const edge = b.edge_pct;
  const sport = b.sport;
  const betType = b.bet_type;
  const hp = b.home_pitcher;
  const ap = b.away_pitcher;
  const hg = b.home_goalie;
  const ag = b.away_goalie;
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
      const avgK = pitcher.last3.length > 0 ? (pitcher.last3.reduce((s, x) => s + x.k, 0) / pitcher.last3.length).toFixed(0) : null;
      const recentStr = avgK ? `averaging ${avgK} Ks per outing in his last ${pitcher.last3.length} starts` : `posting elite strikeout numbers this season`;
      return `${pitcher.name} has been dominant on the mound, ${recentStr} with a ${pitcher.kPer9.toFixed(1)} K/9 rate through ${pitcher.ip.toFixed(0)} innings. He draws a lineup that strikes out at an elevated clip, creating one of the sharpest K props on today's board.`;
    }
  }

  // MLB MONEYLINE
  if (sport === 'MLB' && isML) {
    const fav = hp && ap ? (hp.era < ap.era ? hp : ap) : hp || ap;
    const dog = hp && ap ? (hp.era < ap.era ? ap : hp) : null;
    if (fav && dog) {
      return `This is a clear pitching mismatch. ${fav.name} (${fav.era.toFixed(2)} ERA, ${fav.kPer9.toFixed(1)} K/9) has been significantly sharper than ${dog.name} (${dog.era.toFixed(2)} ERA) on the season, and the ${edge.toFixed(1)}% edge reflects that gap.`;
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
    if (isF5) {
      return `The first 5 innings isolate the starters and strip out bullpen variance. With ${hp?.name || 'the home starter'} and ${ap?.name || 'the away starter'} both on the mound, the F5 ${isOver ? 'over' : 'under'} is the cleaner play. Combined ERA and K-rate point to a controlled early game.`;
    }
    if (isOver) {
      return `This game is set in a hitter-friendly environment and the pitching matchup does not inspire confidence on either side. When you combine elevated HR rates with average-to-below arms, overs tend to cash.`;
    }
    return `Two quality arms on the mound today with a combined profile that suppresses offense. The park plays neutral-to-pitcher-friendly, and neither lineup has the kind of power to overcome elite stuff. This total looks inflated.`;
  }

  // NHL MONEYLINE
  if (sport === 'NHL' && isML) {
    const better = hg && ag ? (hg.savePct > ag.savePct ? hg : ag) : hg || ag;
    const worse = hg && ag ? (hg.savePct > ag.savePct ? ag : hg) : null;
    if (better && worse) {
      return `Goaltending wins hockey games, and there is a clear edge here. ${better.name} is posting a ${(better.savePct * 100).toFixed(1)}% save rate with a ${better.gaa.toFixed(2)} GAA, significantly outperforming ${worse.name} (${(worse.savePct * 100).toFixed(1)}% SV, ${worse.gaa.toFixed(2)} GAA). That kind of gap between the pipes tilts this matchup.`;
    }
  }

  // NHL PUCK LINE
  if (sport === 'NHL' && isRL) {
    return `The goaltending mismatch is wide enough to consider the puck line. When one side has a clear advantage in net and recent form backs it up, -1.5 becomes viable in a sport where empty-net goals frequently seal the cover.`;
  }

  // NHL TOTAL
  if (sport === 'NHL' && isTotal) {
    if (isUnder) return `Both goalies are dialed in right now, with recent save percentages that suppress scoring. When two hot netminders meet, unders hit at an elevated rate.`;
    return `Neither goalie is stopping pucks consistently right now, and the recent form shows leaky defense on both sides. This has the makings of a high-event, back-and-forth game.`;
  }

  // NHL SAVE PROP
  if (sport === 'NHL' && isProp) {
    const goalie = hg?.confirmed ? hg : ag?.confirmed ? ag : null;
    if (goalie) {
      return `${goalie.name} has been a wall recently, posting a ${(goalie.savePct * 100).toFixed(1)}% save rate on the season. He is seeing heavy volume and converting at an elite clip. The over on saves is one of the sharper goalie props available tonight.`;
    }
  }

  // NBA
  if (sport === 'NBA' && isML) return `The spread and defensive matchup data both favor this side. When one team allows significantly more points per game and the pace of play aligns, the moneyline becomes a high-value play at current odds.`;
  if (sport === 'NBA' && isRL) return `The spread is backed by a meaningful defensive gap between these two teams. The pace and scoring environment project a comfortable margin, making the points worth taking at this number.`;
  if (sport === 'NBA' && isTotal) {
    return isOver
      ? `Both defenses rank in the bottom tier of the league in points allowed, and the pace of play pushes possessions higher than average. This total looks too low for two teams that struggle to get stops.`
      : `This is a grind-it-out matchup between two slower-paced teams with competent defenses. The combined tempo drags the scoring projection well below the posted line.`;
  }
  if (sport === 'NBA' && isProp) return `The defensive matchup creates a scoring environment that favors this team total. When you face a bottom-tier defense that hemorrhages points, the over on team scoring is one of the highest-percentage plays available.`;

  // Fallback
  return b.rationale.length > 200 ? b.rationale.substring(0, 200) + '...' : b.rationale;
}

// PICK CARD WITH ADD TO SLIP BUTTON
function PickCard({
  bet,
  onAddToSlip,
  inSlip,
}: {
  bet: BestBet;
  onAddToSlip: (entry: BetSlipEntry) => void;
  inSlip: boolean;
}) {
  const detectedOdds = -110;

  function handleAdd() {
    const betType: 'moneyline' | 'spread' | 'total' =
      bet.bet_type === 'moneyline' ? 'moneyline' :
      bet.bet_type === 'spread' || bet.bet_type === 'run_line' || bet.bet_type === 'puck_line' ? 'spread' : 'total';
    onAddToSlip({
      id: bet.id,
      pick: bet.pick,
      sport: bet.sport,
      betType,
      odds: detectedOdds,
      gameId: bet.game_id,
      homeTeam: bet.home_pitcher?.name || bet.home_goalie?.name || 'Home',
      awayTeam: bet.away_pitcher?.name || bet.away_goalie?.name || 'Away',
      gameTime: new Date().toISOString(),
    });
  }

  const confColor = (bet.confidence || 0) >= 8 ? 'text-edge-green glow-green' : (bet.confidence || 0) >= 6 ? 'text-edge-amber glow-amber' : 'text-edge-red glow-red';

  return (
          <div className="relative border border-gray-800 rounded-lg p-3 pl-10 bg-edge-dark/60 hover:border-gray-700 transition overflow-hidden">
                    <ConfidenceTierBadge confidence={bet.confidence || 0} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase">{bet.bet_type.replace('_', ' ')}</span>
            {bet.best_book && <span className="text-xs text-edge-muted">{bet.best_book}</span>}
          </div>
          <p className="text-sm font-semibold text-white mb-1">{bet.pick}</p>
          {bet.matchup_detail && <p className="text-xs text-edge-muted truncate">{bet.matchup_detail}</p>}
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{generatePickSynopsis(bet)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-base font-bold tabular-nums ${confColor}`}>{(bet.confidence || 0).toFixed(1)}</span>
          <span className="text-xs text-edge-muted">+{bet.edge_pct}% edge</span>
          <button
            onClick={handleAdd}
            disabled={inSlip}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded font-bold transition ${
              inSlip
                ? 'bg-edge-green/20 text-edge-green border border-edge-green/40 cursor-default'
                : 'bg-gray-800 text-gray-300 hover:bg-edge-green/20 hover:text-edge-green border border-gray-700 hover:border-edge-green/40'
            }`}
          >
            {inSlip ? <CheckCircle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {inSlip ? 'Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// MAIN SPORTSBOOK COMPONENT
export default function Sportsbook({ bets }: { bets: BestBet[] }) {
  const [slipEntries, setSlipEntries] = useState<BetSlipEntry[]>([]);
  const [activeBets, setActiveBets] = useState<UserBet[]>([]);
  const [tab, setTab] = useState<'picks' | 'active' | 'history'>('picks');
  const [loadingBets, setLoadingBets] = useState(false);
  const [sportFilter, setSportFilter] = useState<string>('ALL');

  const loadActiveBets = useCallback(async () => {
    setLoadingBets(true);
    try {
      const all = await api.activeBets();
      setActiveBets(all);
    } catch {}
    setLoadingBets(false);
  }, []);

  useEffect(() => {
    loadActiveBets();
  }, []);

  function addToSlip(entry: BetSlipEntry) {
    setSlipEntries(prev => prev.some(e => e.id === entry.id) ? prev : [...prev, entry]);
  }

  function removeFromSlip(id: string) {
    setSlipEntries(prev => prev.filter(e => e.id !== id));
  }

  async function handleSettle(betId: string, result: 'win' | 'loss' | 'push') {
    const ok = await api.settleBet(betId, result);
    if (ok) await loadActiveBets();
  }

  const slipIds = new Set(slipEntries.map(e => e.id));
  const sports = ['ALL', ...Array.from(new Set(bets.map(b => b.sport)))];
  const filteredBets = sportFilter === 'ALL' ? bets : bets.filter(b => b.sport === sportFilter);
  const sortedBets = [...filteredBets].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

  const activePending = activeBets.filter(b => b.status === 'active' || !b.result);
  const settledBets = activeBets.filter(b => b.result !== null && b.result !== undefined);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT: PICKS + CONTROLS */}
      <div className="lg:col-span-2 space-y-4">
        {/* SECTION HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-edge-green" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Sportsbook</h2>
            <span className="text-xs bg-edge-green/20 text-edge-green px-2 py-0.5 rounded">{sortedBets.length} picks</span>
          </div>
          <div className="flex items-center gap-1">
            {sports.map(s => (
              <button
                key={s}
                onClick={() => setSportFilter(s)}
                className={`text-xs px-2 py-1 rounded font-bold transition ${
                  sportFilter === s ? 'bg-edge-green/20 text-edge-green' : 'text-edge-muted hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* TAB BAR */}
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          {([
            { id: 'picks', label: `Picks (${sortedBets.length})` },
            { id: 'active', label: `Active (${activePending.length})` },
            { id: 'history', label: `History (${settledBets.length})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'active' || t.id === 'history') loadActiveBets(); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded transition ${
                tab === t.id ? 'bg-edge-green/20 text-edge-green' : 'text-edge-muted hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* PICKS TAB */}
        {tab === 'picks' && (
          <div className="space-y-2">
            {sortedBets.length === 0 ? (
              <div className="text-center py-8 text-edge-muted text-sm">Analyzing matchups... picks will appear shortly.</div>
            ) : (
              sortedBets.map(bet => (
                <PickCard
                  key={bet.id}
                  bet={bet}
                  onAddToSlip={addToSlip}
                  inSlip={slipIds.has(bet.id)}
                />
              ))
            )}
          </div>
        )}

        {/* ACTIVE BETS TAB */}
        {tab === 'active' && (
          <ActiveBets
            bets={activeBets}
            onSettle={handleSettle}
            onRefresh={loadActiveBets}
          />
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <BetHistory bets={activeBets} />
        )}
      </div>

      {/* RIGHT: BET SLIP */}
      <div className="space-y-4">
        <BetSlip
          entries={slipEntries}
          onRemove={removeFromSlip}
          onClear={() => setSlipEntries([])}
          onBetPlaced={loadActiveBets}
        />

        {/* QUICK STATS */}
        {activePending.length > 0 && (
          <div className="border border-gray-800 rounded-lg p-3 bg-edge-dark/50">
            <p className="text-xs font-bold text-edge-muted uppercase tracking-wider mb-2">Open Action</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-edge-muted">Active Bets</span>
                <span className="text-white font-bold">{activePending.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-edge-muted">Total At Risk</span>
                <span className="text-edge-amber font-bold">
                  ${activePending.reduce((s, b) => s + (b.stake || 0), 0).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-edge-muted">Total To Win</span>
                <span className="text-edge-green font-bold">
                  ${activePending.reduce((s, b) => s + Math.max(0, (b.potential_payout || 0) - (b.stake || 0)), 0).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
