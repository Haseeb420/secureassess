from supabase import Client, create_client

from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Return the shared service-role client for database queries.
    IMPORTANT: never call supabase.auth.* on this client — auth operations
    (sign_in, sign_up, get_user) mutate its internal session, causing all
    subsequent table queries to run under the user's JWT instead of the
    service role, which breaks RLS bypass.
    """
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client


def get_auth_client() -> Client:
    """Return a fresh, short-lived client for auth operations only.
    A new instance is created each call so auth state mutations are isolated
    and never bleed into the shared DB client.
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
