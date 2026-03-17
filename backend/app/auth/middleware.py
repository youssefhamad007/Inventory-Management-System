from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.supabase import get_supabase_client

security = HTTPBearer()

async def get_current_user(auth: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates the Supabase Auth JWT and returns the current user context.

    - Verifies the access token with Supabase Auth.
    - Loads the corresponding profile to obtain role and branch assignment.
    - Ensures the Supabase client session is set for downstream RLS-aware queries.

    Returns a dict with: id, email, role, branch_id, jwt.
    """
    token = auth.credentials
    supabase = get_supabase_client()

    try:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            )

        # Attach the user session to the Supabase client so that any
        # subsequent queries from this request can benefit from RLS.
        supabase.auth.set_session(access_token=token, refresh_token="")

        # We use getting the user from Supabase Auth to verify the token
        # This also ensures the token is valid and not blacklisted/revoked
        # It's an extra network call but safer for Supabase RLS integration
        auth_response = supabase.auth.get_user(token)
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        # Fetch the user's profile to get the role and branch assignment
        profile_response = supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()

        profile = profile_response.data or {}

        # Basic profile and activation checks
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Profile not found for authenticated user",
            )

        if profile.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        role = profile.get("role") or "staff"
        if role not in {"admin", "manager", "staff"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role is not authorized for this system",
            )

        user_data = {
            "id": auth_response.user.id,
            "email": auth_response.user.email,
            "role": role,
            "branch_id": profile.get("branch_id"),
            "jwt": token,
        }

        return user_data

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
        )
