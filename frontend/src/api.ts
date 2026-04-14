import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

const today = new Date().toISOString().split('T')[0];

export const api = {
  games: async (): Promise<Game[]> => {
    const { data } = await supabase.from('games').select('*').eq('date', today).order('game_time');
    return data || [];
  },
  bestBets: async (): Promise<BestBet[]> => {
    const { data } = await supabase.from('best_bets').select('*').eq('date', today).order('confidence', { ascending: false });
    return data || [];
  },
  lines: async (gameId: string): Promise<LineMovement[]> => {
    const { data } = await supabase.from('lines').select('*').eq('game_id', gameId).order('recorded_at');
    return data || [];
  },
  news: async (): Promise<NewsItem[]> => {
    const { data } = await supabase.from('news_items').select('*').order('fetched_at', { ascending: false }).limit(10);
    return data || [];
  },
  weather: async (): Promise<WeatherData[]> => {
    const { data } = await supabase.from('weather').select('*');
    return data || [];
  },
  history: async (): Promise<any[]> => {
    const { data } = await supabase.from('best_bets').select('*').not('result', 'is', null).order('created_at', { ascending: false }).limit(20);
    return data || [];
  },
  parlays: async (): Promise<Parlay[]> => {
    const { data } = await supabase.from('parlays').select('*').eq('date', today);
    return data || [];
  },
};
