const BASE = "/api";

async function fetcher<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  sport: string;
  scores?: { home: number; away: number };
  status?: string;
  bookmakers?: any[];
}

export interface BestBet {
  id: string;
  game_id: string;
  pick: string;
  edge: number;
  confidence: number;
  factors: Record<string, number>;
  recommendation: string;
}

export interface LineMovement {
  game_id: string;
  book: string;
  timestamps: string[];
  lines: number[];
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
}

export interface WeatherData {
  venue: string;
  temp_f: number;
  wind_mph: number;
  condition: string;
  icon: string;
}

export interface Parlay {
  id: string;
  legs: { game_id: string; pick: string; confidence: number }[];
  combined_odds: number;
  ev: number;
}

export const api = {
  games: () => fetcher<Game[]>("/games/today"),
  bestBets: () => fetcher<BestBet[]>("/best-bets/today"),
  lines: (gameId: string) => fetcher<LineMovement[]>(`/lines/${gameId}`),
  news: () => fetcher<NewsItem[]>("/news/latest"),
  weather: () => fetcher<WeatherData[]>("/weather/venues"),
  history: () => fetcher<any[]>("/history/recent"),
  parlays: () => fetcher<Parlay[]>("/parlays/today"),
};
