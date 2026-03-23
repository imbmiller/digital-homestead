from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = Field(..., alias="ANTHROPIC_API_KEY")
    gateway_url: str = Field("http://gateway:8000", alias="GATEWAY_URL")
    orchestrator_bearer_token: str = Field(..., alias="ORCHESTRATOR_BEARER_TOKEN")

    cycle_interval_minutes: int = Field(30, alias="CYCLE_INTERVAL_MINUTES")
    budget_daily_limit_usd: float = Field(5.0, alias="BUDGET_DAILY_LIMIT_USD")

    github_token: str = Field("", alias="GITHUB_TOKEN")
    github_repo: str = Field("", alias="GITHUB_REPO")

    log_level: str = "INFO"

    # Haiku pricing (per 1M tokens) for budget tracking
    haiku_input_price_per_1m: float = 0.25
    haiku_output_price_per_1m: float = 1.25


settings = Settings()
