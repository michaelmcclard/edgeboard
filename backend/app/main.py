import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import games, best_bets, lines, news, weather, history, parlays, rationale

app = FastAPI(title="EdgeBoard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(games.router, prefix="/games", tags=["games"])
app.include_router(best_bets.router, prefix="/best-bets", tags=["best_bets"])
app.include_router(lines.router, prefix="/lines", tags=["lines"])
app.include_router(news.router, prefix="/news", tags=["news"])
app.include_router(weather.router, prefix="/weather", tags=["weather"])
app.include_router(history.router, prefix="/history", tags=["history"])
app.include_router(parlays.router, prefix="/parlays", tags=["parlays"])
app.include_router(rationale.router, prefix="/api/rationale", tags=["rationale"])

@app.get("/")
def root():
    return {"status": "ok", "app": "EdgeBoard API", "version": "1.0.0"}
