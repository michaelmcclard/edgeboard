import { useState, useEffect, useCallback } from "react";
import { api, Game, BestBet, NewsItem, WeatherData, Parlay } from "./api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Cloud, Newspaper, BarChart3, Trophy, AlertTriangle, RefreshCw, MapPin } from "lucide-react";

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
    'over/under': "bg-yellow-900/40 text-yellow-400",
    prop: "bg-pink-900/40 text-pink-400",
  };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${colors[type] || "bg-gray-800 text-gray-400"}`}>{type}</span>;
}

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-edge-card border border-edge-border rounded-lg p-4 card-hover ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-edge-muted">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const mockLineData = [
  { time: "9am", line: -3.5 }, { time: "10am", line: -3.0 }, { time: "11am", line: -3.5 },
  { time: "12pm", line: -4.0 }, { time: "1pm", line: -4.5 }, { time: "2pm", line: -4.0 },
  { time: "3pm", line: -3.5 }, { time: "4pm", line: -3.0 },
];

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
  if (bets.length > 0) alerts.push(`${bets.length} best bets identified across MLB, NBA, NHL`);

  // Group bets by sport
  const mlbBets = bets.filter(b => b.sport === 'MLB');
  const nbaBets = bets.filter(b => b.sport === 'NBA');
  const nhlBets = bets.filter(b => b.sport === 'NHL');

  return (
    <div className="min-h-screen bg-edge-bg text-white p-4 md:p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">EDGEBOARD</h1>
          <p className="text-xs text-edge-muted">SPORTS BETTING HUB &nbsp; LIVE &bull; {new Date().toLocaleDateString()}</p>
        </div>
        <button onClick={() => { refreshGames(); refreshNews(); refreshWeather(); setLastRefresh(new Date()); }} className="text-edge-muted hover:text-white transition" title="Refresh data">
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Card title="Live Scoreboard" icon={<Zap size={16} className="text-edge-green" />} className="lg:col-span-2">
          {gamesLoading ? <p className="text-edge-muted text-sm">Loading...</p> : games.length === 0 ? <p className="text-edge-muted text-sm">No games today</p> : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {games.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-edge-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <SportBadge sport={g.sport} />
                    <span className="text-sm"><span className="font-semibold">{g.away_team}</span> @ <span className="font-semibold">{g.home_team}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-edge-muted">
                    <span>{g.away_score ?? "-"} &ndash; {g.home_score ?? "-"}</span>
                    <span className="text-edge-green">{g.status === "scheduled" ? new Date(g.game_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : g.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Weather" icon={<Cloud size={16} className="text-edge-amber" />}>
          {weather.length === 0 ? <p className="text-edge-muted text-sm">No data</p> : (
            <div className="space-y-2">
              {weather.map((w, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-edge-border/50 last:border-0">
                  <span className="text-sm font-medium flex items-center gap-1"><MapPin size={12} /> {w.impact_text || w.condition}</span>
                  <span className="text-xs text-edge-muted">{w.condition} &bull; {w.temp_f}&deg;F &bull; {w.wind_mph}mph</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <div className="flex gap-1 mb-3 bg-edge-card border border-edge-border rounded-lg p-1">
            {(["bets", "parlays", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-semibold uppercase rounded ${tab === t ? "bg-edge-green/20 text-edge-green" : "text-edge-muted hover:text-white"}`}>{t}</button>
            ))}
          </div>

          {tab === "bets" && <Card title="Best Bets" icon={<TrendingUp size={16} className="text-edge-green" />}>
            {betsLoading ? <p className="text-edge-muted text-sm animate-pulse">Analyzing odds across all leagues...</p> : bets.length === 0 ? <p className="text-edge-muted text-sm">No bets today</p> : (
              <div className="space-y-6">
                {/* MLB Section */}
                {mlbBets.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-900/30">
                      <SportBadge sport="MLB" />
                      <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Major League Baseball ({mlbBets.length} picks)</span>
                    </div>
                    <div className="space-y-3">
                      {mlbBets.map((b) => (
                        <div key={b.id} className="bg-edge-bg/50 rounded-lg p-3 border border-edge-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{b.pick}</span>
                              <BetTypeBadge type={b.bet_type} />
                            </div>
                            <Badge value={b.confidence} />
                          </div>
                          <p className="text-xs text-edge-muted leading-relaxed">Edge: <span className="text-edge-green font-semibold">+{b.edge_pct}%</span> &bull; {b.best_book}</p>
                          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed italic">{b.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NBA Section */}
                {nbaBets.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-900/30">
                      <SportBadge sport="NBA" />
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">National Basketball Association ({nbaBets.length} picks)</span>
                    </div>
                    <div className="space-y-3">
                      {nbaBets.map((b) => (
                        <div key={b.id} className="bg-edge-bg/50 rounded-lg p-3 border border-edge-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{b.pick}</span>
                              <BetTypeBadge type={b.bet_type} />
                            </div>
                            <Badge value={b.confidence} />
                          </div>
                          <p className="text-xs text-edge-muted leading-relaxed">Edge: <span className="text-edge-green font-semibold">+{b.edge_pct}%</span> &bull; {b.best_book}</p>
                          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed italic">{b.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NHL Section */}
                {nhlBets.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-900/30">
                      <SportBadge sport="NHL" />
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">National Hockey League ({nhlBets.length} picks)</span>
                    </div>
                    <div className="space-y-3">
                      {nhlBets.map((b) => (
                        <div key={b.id} className="bg-edge-bg/50 rounded-lg p-3 border border-edge-border/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{b.pick}</span>
                              <BetTypeBadge type={b.bet_type} />
                            </div>
                            <Badge value={b.confidence} />
                          </div>
                          <p className="text-xs text-edge-muted leading-relaxed">Edge: <span className="text-edge-green font-semibold">+{b.edge_pct}%</span> &bull; {b.best_book}</p>
                          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed italic">{b.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>}

          {tab === "parlays" && <Card title="Parlays" icon={<Trophy size={16} className="text-edge-amber" />}>
            {parlays.length === 0 ? <p className="text-edge-muted text-sm">No parlays today</p> : (
              <div className="space-y-3">
                {parlays.map((p) => (
                  <div key={p.id} className="bg-edge-bg/50 rounded p-3 border border-edge-border/30">
                    <p className="font-bold text-sm mb-1">{p.num_legs}-Leg Parlay</p>
                    {p.legs.map((leg, i) => (
                      <p key={i} className="text-xs text-edge-muted">&bull; {leg.pick}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>}

          {tab === "history" && <Card title="Bet History" icon={<BarChart3 size={16} className="text-edge-amber" />}>
            <p className="text-edge-muted text-sm">No graded bets yet — picks will appear here once settled</p>
          </Card>}
        </div>

        <Card title="Line Movement" icon={<TrendingUp size={16} className="text-edge-green" />}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={mockLineData}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="line" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="News" icon={<Newspaper size={16} className="text-edge-amber" />} className="lg:col-span-2">
          {news.length === 0 ? <p className="text-edge-muted text-sm">No news</p> : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noreferrer" className="block py-1.5 border-b border-edge-border/50 last:border-0 hover:bg-edge-border/20 rounded px-1 -mx-1 transition">
                  <p className="text-sm font-medium">{n.headline}</p>
                  <p className="text-xs text-edge-muted">{n.source} &bull; {n.sport} &bull; {new Date(n.fetched_at).toLocaleDateString()}</p>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="Alerts" icon={<AlertTriangle size={16} className="text-edge-amber" />}>
          {alerts.length === 0 ? <p className="text-edge-muted text-sm">No alerts</p> : (
            <div className="space-y-1">
              {alerts.map((a, i) => <p key={i} className="text-xs text-edge-muted">{a}</p>)}
            </div>
          )}
        </Card>
      </div>

      <footer className="mt-6 text-center text-xs text-edge-muted">
        EdgeBoard v1.0 | Data refreshes every 60s | Last: {lastRefresh.toLocaleTimeString()} | Not financial advice
      </footer>
    </div>
  );
}
