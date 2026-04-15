import { useState, useMemo } from "react";
import { BestBet } from "./api";
import { Filter, ArrowUpDown, ChevronDown, ChevronUp, Target, Zap } from "lucide-react";

// === Types ===
export interface NavState {
  sport: string;
  betTypes: string[];
  sort: string;
  expandedGames: Set<string>;
}

// === Constants ===
const sportOptions = [
  { key: 'ALL', label: 'All Sports' },
  { key: 'MLB', label: 'MLB' },
  { key: 'NBA', label: 'NBA' },
  { key: 'NHL', label: 'NHL' },
  { key: 'NFL', label: 'NFL' },
];

const betTypeOptions = [
  { key: 'all', label: 'All' },
  { key: 'moneyline', label: 'ML' },
  { key: 'spread', label: 'Spread' },
  { key: 'run_line', label: 'Run Line' },
  { key: 'puck_line', label: 'Puck Line' },
  { key: 'total', label: 'Total' },
  { key: 'first_5', label: 'F5' },
  { key: 'player_prop', label: 'Props' },
];

const sortOptions = [
  { key: 'confidence', label: 'Confidence' },
  { key: 'edge', label: 'Edge %' },
  { key: 'game', label: 'Game' },
];

// === Hook ===
export function useNavState(): [NavState, React.Dispatch<React.SetStateAction<NavState>>, (key: string) => void] {
  const [navState, setNavState] = useState<NavState>({
    sport: 'ALL',
    betTypes: ['all'],
    sort: 'confidence',
    expandedGames: new Set<string>(),
  });

  const toggleBetType = (key: string) => {
    if (key === 'all') {
      setNavState({ ...navState, betTypes: ['all'] });
      return;
    }
    const next = navState.betTypes.filter(t => t !== 'all');
    if (next.includes(key)) {
      const filtered = next.filter(t => t !== key);
      if (filtered.length === 0) {
        setNavState({ ...navState, betTypes: ['all'] });
      } else {
        setNavState({ ...navState, betTypes: filtered });
      }
    } else {
      setNavState({ ...navState, betTypes: [...next, key] });
    }
  };

  return [navState, setNavState, toggleBetType];
}

// === Filter + Sort Logic ===
export function useFilteredBets(bets: BestBet[], navState: NavState) {
  return useMemo(() => {
    let filtered = [...bets];

    // Sport filter
    if (navState.sport !== 'ALL') {
      filtered = filtered.filter(b => b.sport === navState.sport);
    }

    // Bet type filter
    if (!navState.betTypes.includes('all')) {
      filtered = filtered.filter(b => navState.betTypes.includes(b.bet_type));
    }

    // Sort
    if (navState.sort === 'confidence') {
      filtered.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    } else if (navState.sort === 'edge') {
      filtered.sort((a, b) => (b.edge_pct || 0) - (a.edge_pct || 0));
    }

    // Group by game
    const gameGroups = new Map<string, BestBet[]>();
    filtered.forEach(b => {
      const gid = String(b.game_id);
      if (!gameGroups.has(gid)) gameGroups.set(gid, []);
      gameGroups.get(gid)!.push(b);
    });

    return { filtered, gameGroups };
  }, [bets, navState.sport, navState.betTypes, navState.sort]);
}

// === Sport Counts ===
function getSportCounts(bets: BestBet[]): Record<string, number> {
  const counts: Record<string, number> = { ALL: bets.length };
  bets.forEach(b => {
    counts[b.sport] = (counts[b.sport] || 0) + 1;
  });
  return counts;
}

// === Nav Bar Component ===
export function NavBar({
  bets,
  navState,
  setNavState,
  toggleBetType,
}: {
  bets: BestBet[];
  navState: NavState;
  setNavState: React.Dispatch<React.SetStateAction<NavState>>;
  toggleBetType: (key: string) => void;
}) {
  const sportCounts = getSportCounts(bets);

  return (
    <div className="sticky top-0 z-40 bg-edge-bg/95 backdrop-blur-md border-b border-edge-border pb-2 pt-2 px-4">
      {/* Sport tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide mb-2">
        {sportOptions.map(s => {
          const count = sportCounts[s.key] || 0;
          const active = navState.sport === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setNavState({ ...navState, sport: s.key })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm whitespace-nowrap transition-all border-b-2
              ${active
                ? 'text-edge-cyan border-edge-cyan bg-edge-cyan/10'
                : 'text-edge-muted border-transparent hover:text-white hover:border-white/30'
              }`}
            >
              {s.key}
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${active ? 'bg-edge-cyan/20 text-edge-cyan' : 'bg-edge-card text-edge-muted'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown size={12} className="text-edge-muted" />
          <select
            value={navState.sort}
            onChange={e => setNavState({ ...navState, sort: e.target.value })}
            className="text-xs bg-edge-card border border-edge-border text-edge-text rounded px-2 py-1 outline-none cursor-pointer"
          >
            {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Bet type pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        <Filter size={11} className="text-edge-muted shrink-0" />
        {betTypeOptions.map(o => {
          const active = navState.betTypes.includes(o.key);
          return (
            <button
              key={o.key}
              onClick={() => toggleBetType(o.key)}
              className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border whitespace-nowrap transition-all
              ${active
                ? 'bg-edge-green/15 text-edge-green border-edge-green/40'
                : 'bg-transparent text-edge-muted border-edge-border hover:border-white/30 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// === Game Accordion ===
export function GameAccordion({
  gameId,
  gameBets,
  expanded,
  onToggle,
  renderBet,
}: {
  gameId: string;
  gameBets: BestBet[];
  expanded: boolean;
  onToggle: () => void;
  renderBet: (b: BestBet) => React.ReactNode;
}) {
  const first = gameBets[0];
  const topConf = Math.max(...gameBets.map(b => b.confidence || 0));
  const topEdge = Math.max(...gameBets.map(b => b.edge_pct || 0));
  const hasBetRec = gameBets.some(b => b.recommendation === 'BET');

  // Extract matchup from pick or matchup_detail
  const matchupText = first.matchup_detail?.split('|')[0]?.trim() || first.pick;

  return (
    <div className="border border-edge-border rounded-lg overflow-hidden mb-2 transition-all">
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-edge-card hover:bg-edge-card/80 transition-all text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase
            ${first.sport === 'MLB' ? 'bg-red-900/40 text-red-400'
            : first.sport === 'NBA' ? 'bg-orange-900/40 text-orange-400'
            : first.sport === 'NHL' ? 'bg-blue-900/40 text-blue-400'
            : 'bg-green-900/40 text-green-400'}`}>
            {first.sport}
          </span>
          <span className="text-sm font-semibold text-white truncate">{matchupText}</span>
          <span className="text-[10px] text-edge-muted">{gameBets.length} pick{gameBets.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {hasBetRec && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-600/30 text-green-300 border border-green-500/50 flex items-center gap-1">
              <Zap size={9} /> BET
            </span>
          )}
          <span className="text-edge-green text-xs font-bold">+{topEdge.toFixed(1)}%</span>
          <span className={`text-xs font-bold ${topConf >= 8 ? 'text-edge-green' : topConf >= 6 ? 'text-edge-amber' : 'text-edge-red'}`}>
            {topConf.toFixed(1)}
          </span>
          {expanded ? <ChevronUp size={14} className="text-edge-muted" /> : <ChevronDown size={14} className="text-edge-muted" />}
        </div>
      </button>

      {/* Expanded picks */}
      {expanded && (
        <div className="border-t border-edge-border bg-edge-bg/50 p-3 space-y-3">
          {gameBets.map(b => (
            <div key={`${b.game_id}-${b.bet_type}-${b.pick}`}>
              {renderBet(b)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === Picks Summary Bar ===
export function PicksSummary({ filtered, gameGroups }: { filtered: BestBet[]; gameGroups: Map<string, BestBet[]> }) {
  const betRecs = filtered.filter(b => b.recommendation === 'BET').length;
  const avgConf = filtered.length > 0 ? (filtered.reduce((s, b) => s + (b.confidence || 0), 0) / filtered.length) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 text-[11px] text-edge-muted border-b border-edge-border bg-edge-card/30">
      <div className="flex items-center gap-4">
        <span><Target size={11} className="inline mr-1" />{filtered.length} picks</span>
        <span>{gameGroups.size} games</span>
        {betRecs > 0 && <span className="text-edge-green"><Zap size={11} className="inline mr-1" />{betRecs} BET rated</span>}
      </div>
      <span>Avg confidence: <span className={`font-bold ${avgConf >= 8 ? 'text-edge-green' : avgConf >= 6 ? 'text-edge-amber' : 'text-edge-red'}`}>{avgConf.toFixed(1)}</span></span>
    </div>
  );
}
