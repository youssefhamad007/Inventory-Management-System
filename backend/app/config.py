import os
from dotenv import load_dotenv
load_dotenv()
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # In production (Vercel), these are pulled from the Project Settings env vars.
    # Locally, they come from the .env file.
    # We use empty defaults to prevent Pydantic from crashing on boot if a key is temp missing.
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Safety logging for deployment verification
def mask_key(k: str): return f"{k[:4]}...{k[-4:]}" if len(k) > 10 else "EMPTY"
print(f"Config loaded. URL: {os.getenv('SUPABASE_URL')}, ANON: {mask_key(os.getenv('SUPABASE_ANON_KEY', ''))}, SERVICE: {mask_key(os.getenv('SUPABASE_SERVICE_ROLE_KEY', ''))}")


settings = Settings()