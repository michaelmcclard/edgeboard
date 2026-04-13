"""
EdgeBoard Scheduler — APScheduler-based cron runner.
Fetches data from external APIs and upserts into Supabase.
Falls back gracefully if any source is unavailable.
"""
import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("scheduler")

# ── helpers ──────────────────────────────────────────────────────────────
async def fetch_and_store_games():
    """Pull today's games from The Odds API and upsert into Supabase."""
    logger.info("Fetching games...")
    try:
        from backend.app.core.http_client import http
        from backend.app.core.config import settings
        resp = await http.get(
            "https://api.the-odds-api.com/v4/sports/upcoming/odds",
            params={"apiKey": settings.ODDS_API_KEY, "regions": "us", "markets": "spreads,totals,h2h"},
        )
        data = resp.json() if resp.status_code == 200 else []
        logger.info("Fetched %d games", len(data))
        # TODO: upsert into supabase games table
    except Exception as e:
        logger.error("fetch_games failed: %s", e)


async def fetch_and_store_weather():
    """Pull weather for game venues."""
    logger.info("Fetching weather...")
    try:
        from backend.app.core.http_client import http
        from backend.app.core.config import settings
        # Example: fetch weather for a list of venue coords
        venues = [
            {"name": "Staples Center", "lat": 34.043, "lon": -118.267},
            {"name": "TD Garden", "lat": 42.366, "lon": -71.062},
        ]
        for v in venues:
            resp = await http.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"lat": v["lat"], "lon": v["lon"], "appid": settings.WEATHER_API_KEY, "units": "imperial"},
            )
            if resp.status_code == 200:
                logger.info("Weather for %s: %s", v["name"], resp.json().get("main", {}))
    except Exception as e:
        logger.error("fetch_weather failed: %s", e)


async def fetch_and_store_news():
    """Pull sports betting news from NewsAPI."""
    logger.info("Fetching news...")
    try:
        from backend.app.core.http_client import http
        from backend.app.core.config import settings
        resp = await http.get(
            "https://newsapi.org/v2/everything",
            params={"q": "sports betting OR NBA OR NFL", "apiKey": settings.NEWS_API_KEY, "pageSize": 20},
        )
        data = resp.json().get("articles", []) if resp.status_code == 200 else []
        logger.info("Fetched %d articles", len(data))
    except Exception as e:
        logger.error("fetch_news failed: %s", e)


async def run_all_jobs():
    """Execute all fetch jobs concurrently."""
    await asyncio.gather(
        fetch_and_store_games(),
        fetch_and_store_weather(),
        fetch_and_store_news(),
        return_exceptions=True,
    )
    logger.info("All jobs completed at %s", datetime.utcnow().isoformat())


# ── scheduler setup ──────────────────────────────────────────────────────
def start_scheduler():
    scheduler = AsyncIOScheduler()
    # Daily at 6 AM and noon UTC
    scheduler.add_job(run_all_jobs, "cron", hour="6,12", id="daily_fetch")
    # Live polling every 60s during peak hours (optional)
    scheduler.add_job(fetch_and_store_games, "interval", seconds=60, id="live_poll")
    scheduler.start()
    logger.info("Scheduler started")
    return scheduler


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    # Run once immediately
    loop.run_until_complete(run_all_jobs())
    # Then start the scheduler
    sched = start_scheduler()
    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        sched.shutdown()
        logger.info("Scheduler stopped")
