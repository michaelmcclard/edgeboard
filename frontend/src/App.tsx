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
  { time: "9am", line: -3.5 }, { time: "10am", line: -3.0 },
  { time: "11am", line: -3.5 }, { time: "12pm", line: -4.0 },
  { time: "1pm", line: -4.5 }, { time: "2pm", line: -4.0 },
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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGames();
      refreshNews();
      refreshWeather();
      setLastRefresh(new Date());
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
  if (bets.length > 0) alerts.push(`${bets.length} best bets identified`);

  return (
    <div className="min-h-screen bg-edge-bg text-white p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <header className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-black tracking-tight">EDGEBOARD</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded border border-edge-green text-edge-green font-semibold">SPORTS BETTING HUB</span>
          <span className="text-xs text-edge-muted">LIVE • {new Date().toLocaleDateString()}</span>
          <button onClick={() => { refreshGames(); refreshNews(); refreshWeather(); setLastRefresh(new Date()); }} className="text-edge-muted hover:text-white transition" title="Refresh data">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`LIVE SCORES (${games.length})`} icon={<Zap size={16} className="text-edge-amber" />} className="lg:col-span-2">
          {gamesLoading ? <p className="text-edge-muted text-sm animate-pulse">Loading...</p>
          : games.length === 0 ? <p className="text-edge-muted text-sm">No games today</p>
          : (
            <div className="space-y-1">
              {games.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2 px-2 rounded bg-edge-bg/50 hover:bg-edge-bg/80 transition">
                  <div className="flex items-center gap-2">
                    <SportBadge sport={g.sport} />
                    <span className="text-sm">
                      <span className="text-edge-muted">{g.away_team}</span>
                      {" "}<span className="text-edge-muted text-xs">@</span>{" "}
                      <span className="font-semibold">{g.home_team}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono">{g.away_score ?? "-"}</span>
                    <span className="text-edge-muted">-</span>
                    <span className="font-mono">{g.home_score ?? "-"}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${g.status === "final" ? "bg-red-900/30 text-red-400" : g.status === "scheduled" ? "text-edge-muted" : "bg-green-900/30 text-green-400 animate-pulse"}`}>
                      {g.status === "scheduled" ? new Date(g.game_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : g.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="WEATHER" icon={<Cloud size={16} className="text-edge-blue" />}>
          {weather.length === 0 ? <p className="text-edge-muted text-sm">No data</p> : (
            <div className="space-y-2">
              {weather.map((w, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-edge-muted" />
                    <span className="text-edge-muted">{w.impact_text || w.condition}</span>
                  </div>
                  <span>{w.condition} • {w.temp_f}°F • {w.wind_mph}mph</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex gap-1 bg-edge-card rounded-lg p-1">
        {(["bets", "parlays", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-semibold uppercase rounded ${tab === t ? "bg-edge-green/20 text-edge-green" : "text-edge-muted hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {tab === "bets" &&
        <Card title="BEST BETS" icon={<Trophy size={16} className="text-edge-green" />}>
          {betsLoading ? <p className="text-edge-muted text-sm animate-pulse">Analyzing...</p>
          : bets.length === 0 ? <p className="text-edge-muted text-sm">No bets today — connect The Odds API for live picks</p>
          : (
            <div className="space-y-3">
              {bets.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-edge-border/50 last:border-0">
                  <div>
                    <p className="font-semibold">{b.pick}</p>
                    <p className="text-xs text-edge-muted">Edge: <span className="text-edge-green">+{b.edge_pct}%</span> • {b.rationale || b.bet_type}</p>
                  </div>
                  <Badge value={b.confidence} />
                </div>
              ))}
            </div>
          )}
        </Card>
      }
      {tab === "parlays" &&
        <Card title="PARLAYS" icon={<BarChart3 size={16} className="text-edge-amber" />}>
          {parlays.length === 0 ? <p className="text-edge-muted text-sm">No parlays today</p> : (
            <div className="space-y-3">
              {parlays.map((p) => (
                <div key={p.id} className="border border-edge-border/50 rounded p-3">
                  <p className="font-semibold text-sm mb-1">{p.num_legs}-Leg Parlay</p>
                  {p.legs.map((leg, i) => (<span key={i} className="text-xs text-edge-muted mr-2">• {leg.pick} </span>))}
                </div>
              ))}
            </div>
          )}
        </Card>
      }
      {tab === "history" &&
        <Card title="HISTORY" icon={<BarChart3 size={16} className="text-edge-muted" />}>
          <p className="text-edge-muted text-sm">Coming soon</p>
        </Card>
      }

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="LINE MOVEMENT" icon={<TrendingUp size={16} className="text-edge-green" />}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={mockLineData}>
              <XAxis dataKey="time" tick={{ fill: "#6b7280", fontSize: 10 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #2d2d44", borderRadius: 8 }} />
              <Line type="monotone" dataKey="line" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="NEWS" icon={<Newspaper size={16} className="text-edge-amber" />} className="lg:col-span-2">
          {news.length === 0 ? <p className="text-edge-muted text-sm">No news</p> : (
            <div className="space-y-2">
              {news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-edge-bg/50 rounded p-1.5 transition">
                  <p className="text-sm font-medium">{n.headline}</p>
                  <p className="text-xs text-edge-muted">{n.source} • {n.sport} • {new Date(n.fetched_at).toLocaleDateString()}</p>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="ALERTS" icon={<AlertTriangle size={16} className="text-edge-amber" />}>
        {alerts.length === 0 ? <p className="text-edge-muted text-sm">No alerts</p> : (
          <div className="space-y-1">
            {alerts.map((a, i) => <p key={i} className="text-sm text-edge-muted">{a}</p>)}
          </div>
        )}
      </Card>

      <footer className="text-center text-xs text-edge-muted py-2">
        EdgeBoard v1.0 | Data refreshes every 60s | Last: {lastRefresh.toLocaleTimeString()} | Not financial advice
      </footer>
    </div>
  );
}
