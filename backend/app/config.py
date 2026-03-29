import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the directory where this file resides (backend/app)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    SUPABASE_URL: str = "MISSING_SUPABASE_URL"
    SUPABASE_ANON_KEY: str = "MISSING_SUPABASE_ANON_KEY"
    SUPABASE_SERVICE_ROLE_KEY: str = "MISSING_SUPABASE_SERVICE_ROLE_KEY"
    DATABASE_URL: str = "MISSING_DATABASE_URL"

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

settings = Settings()
