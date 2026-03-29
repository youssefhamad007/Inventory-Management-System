from supabase import create_client, Client
from app.config import settings


def get_supabase_client() -> Client:
    """Standard Supabase client using Anon Key."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_admin_client() -> Client:
    """Admin Supabase client using Service Role Key to bypass RLS.
    ONLY use for:
    - Profile lookups during JWT verification (middleware.py)
    - Admin user management (users.py: create/delete/list)
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_user_client(jwt: str) -> Client:
    """Create a Supabase client scoped to the authenticated user's JWT.
    This ensures all queries go through RLS with the user's identity.
    Use this for all standard CRUD operations in services.
    """
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(access_token=jwt, refresh_token="")
    return client
