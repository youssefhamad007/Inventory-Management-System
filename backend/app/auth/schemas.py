from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class UserContext(BaseModel):
    """
    Authenticated user context as exposed to route handlers.

    Matches the shape returned by `get_current_user` in `auth.middleware`.
    """

    id: UUID
    email: str
    role: str
    branch_id: Optional[UUID] = None
    jwt: str

