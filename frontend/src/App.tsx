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
    <div className="min-h-screen bg-edge-bg text-white">
      <header className="border-b border-edge-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-edge-green" />
          <h1 className="text-xl font-black tracking-tight">EDGEBOARD</h1>
          <span className="text-xs text-edge-muted font-mono ml-2">SPORTS BETTING HUB</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-edge-muted font-mono">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-edge-green animate-pulse" /> LIVE</span>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="space-y-4">
          <Card title="Live Scores" icon={<Trophy className="w-4 h-4 text-edge-green" />}>
            {gamesLoading ? <div className="text-edge-muted text-sm animate-pulse">Loading...</div> : games.length === 0 ? <div className="text-edge-muted text-sm">No games today</div> : (
              <div className="space-y-2">{games.map((g) => (
                <div key={g.id} className="flex justify-between items-center bg-edge-bg rounded p-2 text-sm">
                  <div><div className="font-semibold">{g.away_team}</div><div className="font-semibold">{g.home_team}</div></div>
                  <div className="text-right font-mono"><div>{g.scores?.away ?? "-"}</div><div>{g.scores?.home ?? "-"}</div></div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${g.status === "live" ? "bg-edge-green/20 text-edge-green" : "bg-edge-border text-edge-muted"}`}>{g.status || "Sched"}</span>
                </div>
              ))}</div>
            )}
          </Card>
          <Card title="Weather" icon={<Cloud className="w-4 h-4 text-edge-blue" />}>
            {weather.length === 0 ? <div className="text-edge-muted text-sm">No data</div> : (
              <div className="space-y-2">{weather.map((w, i) => (
                <div key={i} className="flex justify-between text-sm bg-edge-bg rounded p-2">
                  <span>{w.venue}</span><span className="font-mono">{w.temp_f}F {w.wind_mph}mph</span>
                </div>
              ))}</div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex gap-1 bg-edge-card border border-edge-border rounded-lg p-1">
            {(["bets", "parlays", "history"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-semibold uppercase rounded ${tab === t ? "bg-edge-green/20 text-edge-green" : "text-edge-muted hover:text-white"}`}>{t}</button>
            ))}
          </div>
          {tab === "bets" && <Card title="Best Bets" icon={<TrendingUp className="w-4 h-4 text-edge-green" />}>
            {betsLoading ? <div className="text-edge-muted text-sm animate-pulse">Analyzing...</div> : bets.length === 0 ? <div className="text-edge-muted text-sm">No bets</div> : (
              <div className="space-y-3">{bets.map((b) => (
                <div key={b.id} className="bg-edge-bg rounded-lg p-3 border border-edge-border">
                  <div className="flex justify-between items-center mb-2"><span className="font-semibold text-sm">{b.pick}</span><Badge value={b.confidence} /></div>
                  <div className="flex gap-2 text-xs text-edge-muted">
                    <span>Edge: <span className="text-edge-green font-mono">+{b.edge}%</span></span>
                    <span className={`px-1.5 py-0.5 rounded ${b.recommendation === "STRONG BET" ? "bg-edge-green/20 text-edge-green" : "bg-edge-amber/20 text-edge-amber"}`}>{b.recommendation}</span>
                  </div>
                </div>
              ))}</div>
            )}
          </Card>}
          {tab === "parlays" && <Card title="AI Parlays" icon={<BarChart3 className="w-4 h-4 text-edge-amber" />}>
            {parlays.length === 0 ? <div className="text-edge-muted text-sm">No parlays</div> : (
              <div className="space-y-3">{parlays.map((p) => (
                <div key={p.id} className="bg-edge-bg rounded-lg p-3 border border-edge-border">
                  <div className="text-xs text-edge-muted mb-2">{p.legs.length}-Leg Parlay</div>
                  {p.legs.map((leg, i) => <div key={i} className="flex justify-between text-sm"><span>{leg.pick}</span><Badge value={leg.confidence} /></div>)}
                </div>
              ))}</div>
            )}
          </Card>}
          {tab === "history" && <Card title="History" icon={<BarChart3 className="w-4 h-4 text-edge-blue" />}><div className="text-edge-muted text-sm">Coming soon</div></Card>}
          <Card title="Line Movement" icon={<TrendingUp className="w-4 h-4 text-edge-amber" />}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={mockLineData}>
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="line" stroke="#00ff88" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="News Feed" icon={<Newspaper className="w-4 h-4 text-edge-blue" />}>
            {news.length === 0 ? <div className="text-edge-muted text-sm">No news</div> : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">{news.map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener" className="block bg-edge-bg rounded p-3 hover:border-edge-green border border-transparent transition-colors">
                  <div className="text-sm font-semibold mb-1 line-clamp-2">{n.title}</div>
                  <div className="flex justify-between text-xs text-edge-muted"><span>{n.source}</span><span>{new Date(n.publishedAt).toLocaleDateString()}</span></div>
                </a>
              ))}</div>
            )}
          </Card>
          <Card title="Alerts" icon={<AlertTriangle className="w-4 h-4 text-edge-amber" />}>
            <div className="text-xs text-edge-muted space-y-2">
              <div className="flex items-center gap-2 bg-edge-bg rounded p-2"><span className="w-2 h-2 rounded-full bg-edge-amber" /><span>Line moved 1.5pts on Lakers</span></div>
              <div className="flex items-center gap-2 bg-edge-bg rounded p-2"><span className="w-2 h-2 rounded-full bg-edge-green" /><span>High-value bet: Celtics ML</span></div>
            </div>
          </Card>
        </div>
      </main>

      <footer className="border-t border-edge-border px-6 py-3 text-xs text-edge-muted font-mono text-center">
        EdgeBoard v1.0 | Data refreshes every 60s | Not financial advice
      </footer>
    </div>
  );
}
