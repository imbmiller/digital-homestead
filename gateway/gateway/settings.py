from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./homestead.db"
    github_token: str = Field("", alias="GITHUB_TOKEN")
    github_repo: str = Field("", alias="GITHUB_REPO")
    github_webhook_secret: str = Field("changeme", alias="GITHUB_WEBHOOK_SECRET")
    orchestrator_token_hash: str = Field("", alias="ORCHESTRATOR_TOKEN_HASH")

    sse_keepalive_interval: int = 15
    rate_limit_per_minute: int = 30
    log_level: str = "INFO"


settings = Settings()
