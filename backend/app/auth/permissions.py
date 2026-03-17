from typing import List, Dict, Any

from fastapi import Depends, HTTPException, status

from app.auth.middleware import get_current_user


def require_role(allowed_roles: List[str]):
    """
    Generic RBAC dependency factory.

    Usage in routers:
    - Admin-only endpoints (e.g. manage users, branches):
        @router.post(..., dependencies=[Depends(require_admin())])
    - Manager-level endpoints (e.g. approve orders, manage products):
        @router.post(..., dependencies=[Depends(require_manager())])
    - Any authenticated staff (branch-level operations, own data):
        @router.post(..., dependencies=[Depends(require_staff())])

    The dependency returns the authenticated user dict so handlers
    can perform additional branch-level checks where needed.
    """

    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this operation",
            )
        return user

    return role_checker


def require_admin():
    """Admin-only access."""

    return require_role(["admin"])


def require_manager():
    """Admin or Manager access."""

    return require_role(["admin", "manager"])


def require_staff():
    """Any authenticated role (Admin, Manager, Staff)."""

    return require_role(["admin", "manager", "staff"])
