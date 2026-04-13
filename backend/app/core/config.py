from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    odds_api_key: str = ""
    openweather_api_key: str = ""
    sportsradar_api_key: str = ""
    news_api_key: str = ""
    anthropic_api_key: str = ""

    supabase_url: str = "https://placeholder.supabase.co"
    supabase_anon_key: str = "placeholder"
    supabase_service_role_key: str = "placeholder"

    edgeboard_env: str = "development"
    edgeboard_timezone: str = "America/Chicago"
    edgeboard_base_url: str = "http://localhost:8000"

    class Config:
        env_file = "../../.env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
