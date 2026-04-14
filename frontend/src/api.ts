import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// -- Interfaces --
export interface Game {
  id: string;
  home_team: string;
  away_team: string;
  game_time: string;
  sport: string;
  home_score: number;
  away_score: number;
  status: string;
  stadium: string;
}
export interface BestBet {
  id: string;
  game_id: string;
  pick: string;
  edge_pct: number;
  confidence: number;
  rationale: string;
  bet_type: string;
  best_book: string;
}
export interface LineMovement {
  game_id: string;
  book: string;
  spread: number;
  recorded_at: string;
}
export interface NewsItem {
  id: string;
  headline: string;
  url: string;
  source: string;
  fetched_at: string;
  sport: string;
}
export interface WeatherData {
  id: number;
  game_id: string;
  temp_f: number;
  wind_mph: number;
  condition: string;
  impact_text: string;
}
export interface Parlay {
  id: string;
  legs: { game_id: string; pick: string; confidence: number }[];
  combined_odds: number;
  num_legs: number;
}

// -- ESPN helpers --
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const SPORT_MAP: Record<string, string> = {
  MLB: 'baseball/mlb',
  NBA: 'basketball/nba',
  NHL: 'hockey/nhl',
  NFL: 'football/nfl',
};

function parseEspnStatus(c: any): string {
  const st = c?.status?.type?.name;
  if (st === 'STATUS_FINAL') return 'final';
  if (st === 'STATUS_IN_PROGRESS') return c?.status?.type?.shortDetail || 'live';
  return 'scheduled';
}

async function fetchEspnScoreboard(sport: string): Promise<Game[]> {
  try {
    const res = await fetch(`${ESPN_BASE}/${SPORT_MAP[sport]}/scoreboard`);
    if (!res.ok) return [];
    const json = await res.json();
    const events = json?.events || [];
    return events.map((ev: any) => {
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((t: any) => t.homeAway === 'home');
      const away = comp?.competitors?.find((t: any) => t.homeAway === 'away');
      return {
        id: ev.id,
        home_team: home?.team?.displayName || 'TBD',
        away_team: away?.team?.displayName || 'TBD',
        game_time: ev.date,
        sport,
        home_score: Number(home?.score ?? 0),
        away_score: Number(away?.score ?? 0),
        status: parseEspnStatus(comp),
        stadium: comp?.venue?.fullName || '',
      };
    });
  } catch { return []; }
}

// -- ESPN News --
async function fetchEspnNews(): Promise<NewsItem[]> {
  const sports = ['baseball/mlb', 'basketball/nba', 'hockey/nhl'];
  const labels = ['MLB', 'NBA', 'NHL'];
  const all: NewsItem[] = [];
  for (let i = 0; i < sports.length; i++) {
    try {
      const res = await fetch(`${ESPN_BASE}/${sports[i]}/news?limit=3`);
      if (!res.ok) continue;
      const json = await res.json();
      const articles = json?.articles || [];
      articles.forEach((a: any) => {
        all.push({
          id: String(a.id || Math.random()),
          headline: a.headline || '',
          url: a.links?.web?.href || a.links?.api?.news?.href || '#',
          source: 'ESPN',
          fetched_at: a.published || new Date().toISOString(),
          sport: labels[i],
        });
      });
    } catch { /* skip */ }
  }
  return all.slice(0, 10);
}

// -- Open-Meteo weather --
interface VenueCoord { lat: number; lon: number; label: string; }
const VENUE_COORDS: VenueCoord[] = [
  { lat: 38.6226, lon: -90.1928, label: 'St. Louis' },
  { lat: 40.8296, lon: -73.9262, label: 'New York' },
  { lat: 41.8827, lon: -87.6233, label: 'Chicago' },
  { lat: 34.0739, lon: -118.2400, label: 'Los Angeles' },
  { lat: 42.3467, lon: -71.0972, label: 'Boston' },
];

function wmoToCondition(code: number): string {
  if (code <= 1) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Cloudy/Fog';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Heavy Rain';
  if (code <= 86) return 'Heavy Snow';
  return 'Thunderstorm';
}

async function fetchWeather(): Promise<WeatherData[]> {
  const out: WeatherData[] = [];
  try {
    const lats = VENUE_COORDS.map(v => v.lat).join(',');
    const lons = VENUE_COORDS.map(v => v.lon).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const res = await fetch(url);
    if (!res.ok) return out;
    const json = await res.json();
    const results = Array.isArray(json) ? json : [json];
    results.forEach((r: any, i: number) => {
      const cur = r?.current || r?.current_weather;
      if (!cur) return;
      const temp = Math.round(cur.temperature_2m ?? cur.temperature ?? 0);
      const wind = Math.round(cur.wind_speed_10m ?? cur.windspeed ?? 0);
      const code = cur.weather_code ?? cur.weathercode ?? 0;
      out.push({
        id: i,
        game_id: '',
        temp_f: temp,
        wind_mph: wind,
        condition: wmoToCondition(code),
        impact_text: VENUE_COORDS[i]?.label || '',
      });
    });
  } catch { /* skip */ }
  return out;
}

// -- Cache layer: write to Supabase in background --
async function cacheGames(games: Game[]) {
  if (!supabaseUrl || games.length === 0) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const rows = games.map(g => ({ ...g, date: today }));
    await supabase.from('games').upsert(rows, { onConflict: 'id' });
  } catch { /* silent */ }
}

async function cacheNews(news: NewsItem[]) {
  if (!supabaseUrl || news.length === 0) return;
  try {
    await supabase.from('news_items').upsert(
      news.map(n => ({ ...n })),
      { onConflict: 'id' }
    );
  } catch { /* silent */ }
}

// -- Public API object --
export const api = {
  games: async (): Promise<Game[]> => {
    const [mlb, nba, nhl] = await Promise.all([
      fetchEspnScoreboard('MLB'),
      fetchEspnScoreboard('NBA'),
      fetchEspnScoreboard('NHL'),
    ]);
    const all = [...mlb, ...nba, ...nhl];
    cacheGames(all);
    return all;
  },
  bestBets: async (): Promise<BestBet[]> => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('best_bets')
      .select('*')
      .eq('date', today)
      .order('confidence', { ascending: false });
    return data || [];
  },
  lines: async (gameId: string): Promise<LineMovement[]> => {
    const { data } = await supabase
      .from('lines')
      .select('*')
      .eq('game_id', gameId)
      .order('recorded_at');
    return data || [];
  },
  news: async (): Promise<NewsItem[]> => {
    const live = await fetchEspnNews();
    if (live.length > 0) { cacheNews(live); return live; }
    const { data } = await supabase
      .from('news_items')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(10);
    return data || [];
  },
  weather: async (): Promise<WeatherData[]> => {
    return fetchWeather();
  },
  history: async (): Promise<BestBet[]> => {
    const { data } = await supabase
      .from('best_bets')
      .select('*')
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  },
  parlays: async (): Promise<Parlay[]> => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('parlays')
      .select('*')
      .eq('date', today);
    return data || [];
  },
};
