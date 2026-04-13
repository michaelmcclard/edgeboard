# EdgeBoard

Sports Betting Intelligence Hub — Bloomberg Terminal meets ESPN.

Dark, data-dense dashboard with live scores, best bets engine, line movement tracking, weather impact analysis, and news feed.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Python FastAPI
- **Database:** Supabase (PostgreSQL)
- **Scheduler:** APScheduler (6 AM + noon daily refresh)
- **External APIs:** The Odds API, OpenWeatherMap, NewsAPI, Anthropic Claude, SportsRadar/ESPN

## Project Structure

```
edgeboard/
  backend/           # FastAPI server
    app/
      core/          # Config, Supabase client, HTTP helpers
      routes/        # API endpoints
      services/      # External API integrations + betting model
  frontend/          # React + Tailwind dashboard
    src/
      components/    # UI components
      lib/           # API client helpers
  scheduler/         # APScheduler cron jobs
  supabase/          # Migration SQL files
  .env.example
  requirements.txt
```

## API Sources & Pricing

| API | Purpose | Pricing |
|-----|---------|--------|
| The Odds API | Sportsbook odds, lines, spreads | Free tier (500 req/mo), paid beyond |
| OpenWeatherMap | Stadium weather data | Free tier (1000 req/day) |
| NewsAPI | Sports news headlines | Free tier (100 req/day) |
| SportsRadar / ESPN | Live scores, stats, injuries | Paid / semi-public |
| Anthropic Claude | AI bet rationales | Paid per token |
| Tank01 / SportsDB | Historical team stats, ATS records | Free / limited |

## Setup

### 1. Supabase
- Create a Supabase project at https://supabase.com
- Run `supabase/migrations/0001_init_schema.sql` in the SQL editor
- Copy project URL and keys into `.env`

### 2. Environment Variables
```bash
cp .env.example .env
# Fill in your API keys
```

### 3. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r ../requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Scheduler (optional)
```bash
python scheduler/runner.py
```

## Features

1. **Live Scores Panel** — All sports, auto-refresh 60s, color-coded by sport
2. **Best Bets Engine** — Composite model: ATS, efficiency, weather, injuries, line value, EV%
3. **Line Movement Tracker** — Opening vs current, steam move alerts
4. **Book Comparison** — Side-by-side odds from DraftKings, FanDuel, BetMGM, Caesars
5. **Parlays of the Day** — Auto-generated 2-4 leg parlays from top picks
6. **Historical Tracker** — Rolling record, ROI%, units won/lost charts
7. **Weather Dashboard** — Wind, temp, precip impact on outdoor games
8. **News Feed** — Filterable by sport, tagged by type

## Color System

- Background: `#0a0a0f`
- Cards: `#12121a`
- Borders: `#1e1e2e`
- Value/positive: `#00ff88` (electric green)
- Caution: `#f5a623` (amber)
- Fade/negative: `#ff4444` (red)
- Accent: `#4f8ef7` (blue)

## License

MIT
