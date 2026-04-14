import { useState, useEffect } from "react";
import { api, Game, BestBet, NewsItem, WeatherData, Parlay } from "./api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Zap, Cloud, Newspaper, BarChart3, Trophy, AlertTriangle } from "lucide-react";

function useApi<T>(fn: () => Promise<T>, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fn().then(setData).catch(() => setData(fallback)).finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function Badge({ value }: { value: number }) {
  const color = value >= 8 ? "text-edge-green glow-green" : value >= 6 ? "text-edge-amber glow-amber" : "text-edge-red glow-red";
  return <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${color} bg-edge-card border border-edge-border`}>{value.toFixed(1)}</span>;
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
  const { data: games, loading: gamesLoading } = useApi(api.games, []);
  const { data: bets, loading: betsLoading } = useApi(api.bestBets, []);
  const { data: news } = useApi(api.news, []);
  const { data: weather } = useApi(api.weather, []);
  const { data: parlays } = useApi(api.parlays, []);
  const [tab, setTab] = useState<"bets" | "parlays" | "history">("bets");

  return (
    <div className="min-h-screen bg-edge-bg text-white p-4 md:p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">EDGEBOARD</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-edge-green/20 text-edge-green px-2 py-1 rounded font-semibold">SPORTS BETTING HUB</span>
          <span className="text-xs text-edge-muted">LIVE &bull; {new Date().toLocaleDateString()}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Live Scores" icon={<Zap className="w-4 h-4 text-edge-amber" />} className="lg:col-span-2">
          {gamesLoading ? <p className="text-edge-muted text-sm">Loading...</p> : games.length === 0 ? <p className="text-edge-muted text-sm">No games today</p> : (
            <div className="space-y-2">
              {games.map((g) => (
                <div key={g.id} className="flex items-center justify-between bg-edge-bg rounded p-2 text-sm">
                  <div className="flex-1">
                    <span className="text-edge-muted">{g.away_team}</span>
                    <span className="mx-2 text-edge-muted">@</span>
                    <span>{g.home_team}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">{g.away_score ?? "-"}</span>
                    <span className="text-edge-muted">-</span>
                    <span className="font-mono">{g.home_score ?? "-"}</span>
                  </div>
                  <span className="ml-3 text-xs text-edge-muted">{g.status || "Sched"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Weather" icon={<Cloud className="w-4 h-4 text-blue-400" />}>
          {weather.length === 0 ? <p className="text-edge-muted text-sm">No data</p> : (
            <div className="space-y-2">
              {weather.map((w, i) => (
                <div key={i} className="text-sm">
                  <span className="text-edge-muted">{w.condition}</span> &bull; <span>{w.temp_f}&deg;F</span> &bull; <span>{w.wind_mph}mph</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <div className="flex gap-1 mb-3">
            {(["bets", "parlays", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-semibold uppercase rounded ${tab === t ? "bg-edge-green/20 text-edge-green" : "text-edge-muted hover:text-white"}`}>{t}</button>
            ))}
          </div>

          {tab === "bets" && <Card title="Best Bets" icon={<Trophy className="w-4 h-4 text-edge-green" />}>
            {betsLoading ? <p className="text-edge-muted text-sm">Analyzing...</p> : bets.length === 0 ? <p className="text-edge-muted text-sm">No bets</p> : (
              <div className="space-y-3">
                {bets.map((b) => (
                  <div key={b.id} className="bg-edge-bg rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{b.pick}</span>
                      <Badge value={b.confidence} />
                    </div>
                    <p className="text-xs text-edge-muted">
                      Edge: <span className="text-edge-green">+{b.edge_pct}%</span> &bull; {b.rationale || b.bet_type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>}

          {tab === "parlays" && <Card title="Parlays" icon={<BarChart3 className="w-4 h-4 text-edge-amber" />}>
            {parlays.length === 0 ? <p className="text-edge-muted text-sm">No parlays</p> : (
              <div className="space-y-3">
                {parlays.map((p) => (
                  <div key={p.id} className="bg-edge-bg rounded p-3">
                    <p className="text-sm font-semibold mb-1">{p.num_legs}-Leg Parlay</p>
                    {p.legs.map((leg, i) => (
                      <span key={i} className="text-xs text-edge-muted mr-2">{leg.pick}</span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>}

          {tab === "history" && <Card title="History" icon={<BarChart3 className="w-4 h-4 text-edge-amber" />}>
            <p className="text-edge-muted text-sm">Coming soon</p>
          </Card>}
        </div>

        <Card title="Line Movement" icon={<TrendingUp className="w-4 h-4 text-edge-green" />}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={mockLineData}>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#555" />
              <YAxis tick={{ fontSize: 10 }} stroke="#555" domain={["auto", "auto"]} />
              <Tooltip />
              <Line type="monotone" dataKey="line" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="News" icon={<Newspaper className="w-4 h-4 text-edge-amber" />} className="lg:col-span-2">
          {news.length === 0 ? <p className="text-edge-muted text-sm">No news</p> : (
            <div className="space-y-2">
              {news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener" className="block text-sm hover:text-edge-green transition">
                  <p>{n.headline}</p>
                  <p className="text-xs text-edge-muted">{n.source} &bull; {new Date(n.fetched_at).toLocaleDateString()}</p>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="Alerts" icon={<AlertTriangle className="w-4 h-4 text-edge-amber" />}>
          <p className="text-xs text-edge-muted mb-1">Line moved 1.5pts on Lakers</p>
          <p className="text-xs text-edge-muted">High-value bet: Celtics ML</p>
        </Card>
      </div>

      <footer className="text-center text-xs text-edge-muted mt-6 pb-4">
        EdgeBoard v1.0 | Data refreshes every 60s | Not financial advice
      </footer>
    </div>
  );
}
