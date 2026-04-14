import { useState, useEffect, useCallback } from "react";
import { api, Game, BestBet, NewsItem, WeatherData, Parlay, PitcherStats, GoalieStats } from "./api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Cloud, Newspaper, BarChart3, Trophy, AlertTriangle, RefreshCw, MapPin, Shield, Target, Thermometer, Wind } from "lucide-react";

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
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[sport] || "bg-gray-800 text-gray-400"}`}>{sport}</span>;
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
    moneyline: 'MONEYLINE', spread: 'SPREAD', total: 'TOTAL', 'over/under': 'TOTAL',
    player_prop: 'PLAYER PROP', prop: 'PROP', run_line: 'RUN LINE', puck_line: 'PUCK LINE', first_5: 'FIRST 5',
  };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${colors[type] || "bg-gray-800 text-gray-400"}`}>{labels[type] || type}</span>;
}

function PitcherCard({ pitcher, label }: { pitcher: PitcherStats; label: string }) {
  if (!pitcher?.confirmed) return null;
  return (
    <div className="bg-edge-bg/50 rounded p-2 text-[10px]">
      <div className="text-edge-muted mb-1">{label}</div>
      <div className="text-white font-bold text-xs">{pitcher.name} <span className="text-edge-muted">({pitcher.hand})</span></div>
      <div className="flex gap-2 mt-1 text-edge-muted">
        <span>ERA <span className="text-white">{pitcher.era.toFixed(2)}</span></span>
        <span>WHIP <span className="text-white">{pitcher.whip.toFixed(2)}</span></span>
        <span>K/9 <span className="text-white">{pitcher.kPer9.toFixed(1)}</span></span>
        <span>IP <span className="text-white">{pitcher.ip.toFixed(0)}</span></span>
      </div>
      {pitcher.last3 && pitcher.last3.length > 0 && (
        <div className="mt-1 text-edge-muted">Last 3: {pitcher.last3.map(s => `${s.ip}IP/${s.er}ER/${s.k}K`).join(', ')}</div>
      )}
    </div>
  );
}

function GoalieCard({ goalie, label }: { goalie: GoalieStats; label: string }) {
  if (!goalie?.confirmed) return null;
  return (
    <div className="bg-edge-bg/50 rounded p-2 text-[10px]">
      <div className="text-edge-muted mb-1">{label}</div>
      <div className="text-white font-bold text-xs">{goalie.name}</div>
      <div className="flex gap-2 mt-1 text-edge-muted">
        <span>SV% <span className="text-white">{(goalie.savePct * 100).toFixed(1)}%</span></span>
        <span>GAA <span className="text-white">{goalie.gaa.toFixed(2)}</span></span>
        <span>W-L <span className="text-white">{goalie.wins}-{goalie.losses}</span></span>
      </div>
    </div>
  );
}

function BetCard({ b }: { b: BestBet }) {
  return (
    <div className="bg-edge-card border border-edge-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge value={b.confidence} />
          <span className="text-white font-bold text-sm">{b.pick}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {b.recommendation && <RecommendationBadge rec={b.recommendation} />}
          <BetTypeBadge type={b.bet_type} />
          {b.data_confidence && <DataConfidenceBadge level={b.data_confidence} />}
        </div>
      </div>
      <div className="text-[11px] text-edge-muted flex gap-3 flex-wrap">
        <span>Edge: <span className="text-edge-green">+{b.edge_pct}%</span></span>
        <span>{b.best_book}</span>
      </div>
      {b.weather_detail && (
        <div className="text-[10px] text-blue-400 bg-blue-900/20 rounded px-2 py-1 flex items-center gap-1">
          <Cloud size={10} /> {b.weather_detail}
        </div>
      )}
      {b.umpire_detail && (
        <div className="text-[10px] text-amber-400 bg-amber-900/20 rounded px-2 py-1 flex items-center gap-1">
          <Shield size={10} /> {b.umpire_detail}
        </div>
      )}
      {b.bullpen_detail && (
        <div className="text-[10px] text-purple-400 bg-purple-900/20 rounded px-2 py-1 flex items-center gap-1">
          <Target size={10} /> {b.bullpen_detail}
        </div>
      )}
      {b.matchup_detail && (
        <div className="text-[10px] text-edge-muted bg-edge-bg/50 rounded px-2 py-1">
          {b.matchup_detail}
        </div>
      )}
      <div className="text-xs text-gray-400 leading-relaxed">{b.rationale}</div>
      {(b.home_pitcher || b.away_pitcher) && (
        <div className="grid grid-cols-2 gap-2">
          {b.away_pitcher && <PitcherCard pitcher={b.away_pitcher} label="AWAY SP" />}
          {b.home_pitcher && <PitcherCard pitcher={b.home_pitcher} label="HOME SP" />}
        </div>
      )}
      {(b.home_goalie || b.away_goalie) && (
        <div className="grid grid-cols-2 gap-2">
          {b.away_goalie && <GoalieCard goalie={b.away_goalie} label="AWAY G" />}
          {b.home_goalie && <GoalieCard goalie={b.home_goalie} label="HOME G" />}
        </div>
      )}
    </div>
  );
}

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-edge-card border border-edge-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-white font-bold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LeagueSection({ sport, label, color, bets }: { sport: string; label: string; color: string; bets: BestBet[] }) {
  if (bets.length === 0) return null;
  // Group by game_id
  const gameGroups = new Map<string, BestBet[]>();
  bets.forEach(b => {
    const gid = b.game_id;
    if (!gameGroups.has(gid)) gameGroups.set(gid, []);
    gameGroups.get(gid)!.push(b);
  });
  return (
    <div className="mb-6">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-edge-border`}>
        <SportBadge sport={sport} />
        <span className={`text-sm font-bold ${color}`}>{label}</span>
        <span className="text-xs text-edge-muted">({bets.length} picks across {gameGroups.size} games)</span>
      </div>
      {Array.from(gameGroups.entries()).map(([gid, gameBets]) => (
        <div key={gid} className="mb-4">
          <div className="text-[10px] text-edge-muted uppercase tracking-wider mb-2 px-1">Game {gid}</div>
          <div className="space-y-2">
            {gameBets.map((b) => <BetCard key={b.id} b={b} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { data: games, loading: gamesLoading, refresh: refreshGames } = useApi(api.games, []);
  const { data: bets, loading: betsLoading } = useApi(api.bestBets, []);
  const { data: news, refresh: refreshNews } = useApi(api.news, []);
  const { data: weather, refresh: refreshWeather } = useApi(api.weather, []);
  const { data: parlays } = useApi(api.parlays, []);
  const [tab, setTab] = useState<"bets" | "parlays" | "history">("bets");
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

  const mlbBets = bets.filter(b => b.sport === 'MLB');
  const nbaBets = bets.filter(b => b.sport === 'NBA');
  const nhlBets = bets.filter(b => b.sport === 'NHL');
    const top5 = [...bets].sort((a, b) => (b.composite_score || 0) - (a.composite_score || 0)).slice(0, 5);
  const betCount = { ml: bets.filter(b => b.bet_type === 'moneyline').length, rl: bets.filter(b => b.bet_type === 'run_line' || b.bet_type === 'puck_line' || b.bet_type === 'spread').length, tot: bets.filter(b => b.bet_type === 'total' || b.bet_type === 'first_5').length, prop: bets.filter(b => b.bet_type === 'player_prop').length };

  return (
    <div className="min-h-screen bg-edge-bg text-white p-3 space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-edge-green">EDGEBOARD</h1>
          <p className="text-[10px] text-edge-muted">FULL GAME CARDS | ML • RUN LINE • TOTAL • F5 • PROPS • {new Date().toLocaleDateString()}</p>
        </div>
        <button onClick={() => { refreshGames(); refreshNews(); refreshWeather(); setLastRefresh(new Date()); }} className="text-edge-muted hover:text-white transition" title="Refresh data">
          <RefreshCw size={16} />
        </button>
      </header>

        {/* TOP 5 BETS OF THE DAY */}
        {top5.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={18} className="text-yellow-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-yellow-400">Top 5 Bets of the Day</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {top5.map((b, i) => (
                <div key={b.id} className="bg-edge-card border border-yellow-800/40 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-yellow-500/20 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-bl">#{i + 1}</div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <SportBadge sport={b.sport} />
                    <BetTypeBadge type={b.bet_type} />
                  </div>
                  <div className="text-white font-bold text-sm mb-1">{b.pick}</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge value={b.composite_score || 0} />
                    <span className="text-edge-green text-xs font-semibold">+{b.edge_pct}%</span>
                  </div>
                  <p className="text-edge-muted text-[11px] leading-snug mb-1.5">{b.rationale}</p>
                  <div className="text-[10px] text-edge-muted">{b.matchup_detail}</div>
                  {b.weather_detail && <div className="text-[10px] text-blue-400 mt-1">{b.weather_detail}</div>}
                  {b.umpire_detail && <div className="text-[10px] text-purple-400 mt-0.5">{b.umpire_detail}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="TODAY'S GAMES" icon={<BarChart3 size={14} className="text-edge-green" />} className="lg:col-span-2">
          {gamesLoading ? <p className="text-edge-muted text-xs">Loading...</p> : games.length === 0 ? <p className="text-edge-muted text-xs">No games today</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {games.map((g) => (
                <div key={g.id} className="bg-edge-bg rounded p-2 text-[11px]">
                  <div className="flex justify-between"><span className="text-white font-bold">{g.away_team}</span> <span className="text-edge-muted">@</span> <span className="text-white font-bold">{g.home_team}</span></div>
                  <div className="flex justify-between text-edge-muted mt-1">
                    <span>{g.away_score ?? "-"} – {g.home_score ?? "-"}</span>
                    <span><SportBadge sport={g.sport} /> {g.status === "scheduled" ? new Date(g.game_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : g.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="WEATHER" icon={<Cloud size={14} className="text-blue-400" />}>
          {weather.length === 0 ? <p className="text-edge-muted text-xs">No data</p> : (
            <div className="space-y-2">
              {weather.map((w, i) => (
                <div key={i} className="bg-edge-bg rounded p-2 text-[11px]">
                  <div className="text-white font-bold">{w.impact_text || w.condition}</div>
                  <div className="text-edge-muted">{w.condition} • {w.temp_f}°F • {w.wind_mph}mph</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* BET TYPE SUMMARY BAR */}
      {bets.length > 0 && (
        <div className="bg-edge-card border border-edge-border rounded-lg p-2 flex gap-4 text-[10px] justify-center flex-wrap">
          <span className="text-purple-400">ML: {betCount.ml}</span>
          <span className="text-indigo-400">Run/Puck/Spread: {betCount.rl}</span>
          <span className="text-yellow-400">Totals/F5: {betCount.tot}</span>
          <span className="text-pink-400">Props: {betCount.prop}</span>
          <span className="text-white font-bold">Total: {bets.length} picks</span>
        </div>
      )}

      <div className="flex gap-1 bg-edge-card border border-edge-border rounded-lg p-1">
        {(["bets", "parlays", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-semibold uppercase rounded ${tab === t ? "bg-edge-green/20 text-edge-green" : "text-edge-muted hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {tab === "bets" && (
        <Card title="FULL GAME CARDS — ALL BET TYPES" icon={<Zap size={14} className="text-edge-green" />} className="">
          {betsLoading ? <p className="text-edge-muted text-xs">Analyzing pitcher stats, goalie matchups, bullpens, weather, and park factors...</p> : bets.length === 0 ? <p className="text-edge-muted text-xs">No bets today</p> : (
            <div>
              <LeagueSection sport="MLB" label="MAJOR LEAGUE BASEBALL" color="text-red-400" bets={mlbBets} />
              <LeagueSection sport="NBA" label="NATIONAL BASKETBALL ASSOCIATION" color="text-orange-400" bets={nbaBets} />
              <LeagueSection sport="NHL" label="NATIONAL HOCKEY LEAGUE" color="text-blue-400" bets={nhlBets} />
            </div>
          )}
        </Card>
      )}

      {tab === "parlays" && (
        <Card title="PARLAYS" icon={<Trophy size={14} className="text-edge-amber" />}>
          {parlays.length === 0 ? <p className="text-edge-muted text-xs">No parlays today</p> : (
            <div className="space-y-2">
              {parlays.map((p) => (
                <div key={p.id} className="bg-edge-bg rounded p-2 text-xs">
                  <div className="text-white font-bold">{p.num_legs}-Leg Parlay</div>
                  {p.legs.map((leg, i) => (<div key={i} className="text-edge-muted">• {leg.pick}</div>))}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "history" && (
        <Card title="BET HISTORY" icon={<Target size={14} className="text-edge-green" />}>
          <p className="text-edge-muted text-xs">No graded bets yet — picks will appear here once settled</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card title="NEWS" icon={<Newspaper size={14} className="text-edge-green" />} className="lg:col-span-2">
          {news.length === 0 ? <p className="text-edge-muted text-xs">No news</p> : (
            <div className="space-y-2">
              {news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block bg-edge-bg rounded p-2 text-[11px] hover:bg-edge-border/30 transition">
                  <div className="text-white font-bold">{n.headline}</div>
                  <div className="text-edge-muted">{n.source} • {n.sport} • {new Date(n.fetched_at).toLocaleDateString()}</div>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="ALERTS" icon={<AlertTriangle size={14} className="text-edge-amber" />}>
          {alerts.length === 0 ? <p className="text-edge-muted text-xs">No alerts</p> : (
            <div className="space-y-1">
              {alerts.map((a, i) => <div key={i} className="text-[11px] text-edge-muted">{a}</div>)}
            </div>
          )}
        </Card>
      </div>

      <footer className="text-center text-[10px] text-edge-muted py-2">
        EdgeBoard v3.0 | Full Game Cards: ML • Run Line • Total • F5 • Props | Weather • Umpire • Bullpen • Park Factor | Data refreshes every 60s | Last: {lastRefresh.toLocaleTimeString()} | Not financial advice
      </footer>
    </div>
  );
}
