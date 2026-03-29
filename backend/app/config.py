import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Do NOT provide default strings like "MISSING_..."
    # Leave them as type hints so Pydantic FORCES the app to find them in Vercel
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    DATABASE_URL: str

    # This config tells Pydantic to check the system environment (Vercel) first,
    # and only look for a .env file if it's actually there.
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()