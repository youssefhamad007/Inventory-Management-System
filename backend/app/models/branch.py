from typing import Optional
from pydantic import BaseModel


class BranchCreate(BaseModel):
    """Request model for creating a new branch."""
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True


class BranchUpdate(BaseModel):
    """Request model for updating an existing branch."""
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class UserRoleUpdate(BaseModel):
    """Request model for updating a user's role."""
    role: str
