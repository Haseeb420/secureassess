from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_JWT_SECRET: str
    JUDGE0_URL: str = ""
    JUDGE0_API_KEY: str = ""
    DATABASE_URL: str = ""
    ENCRYPTION_SECRET: str = ""
    JWT_SECRET: str = ""
    LOG_LEVEL: str = "INFO"

    @model_validator(mode="after")
    def _check_required(self) -> "Settings":
        missing = [
            name
            for name, val in [
                ("SUPABASE_URL", self.SUPABASE_URL),
                ("SUPABASE_SERVICE_KEY", self.SUPABASE_SERVICE_KEY),
                ("SUPABASE_JWT_SECRET", self.SUPABASE_JWT_SECRET),
            ]
            if not val
        ]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
        return self


settings = Settings()
