from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.stock_service import StockService
from app.models.approval import PendingApprovalResponse
from app.auth.permissions import require_manager

router = APIRouter()


@router.get(
    "/",
    response_model=List[dict],
    summary="List pending stock adjustment approvals",
    description=(
        "Returns all stock adjustment requests submitted by staff that exceeded "
        "the financial threshold and are awaiting manager review.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def list_approvals(
    approval_status: str = "pending",
    user=Depends(require_manager()),
):
    return StockService.list_pending_approvals(user["jwt"], approval_status)


@router.post(
    "/{id}/approve",
    response_model=dict,
    summary="Approve a pending stock adjustment",
    description=(
        "Approve a staff stock adjustment request. The original stock adjustment "
        "RPC is executed immediately upon approval.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def approve_adjustment(
    id: UUID,
    user=Depends(require_manager()),
):
    return StockService.resolve_approval(user["jwt"], id, "approve", user["id"])


@router.post(
    "/{id}/reject",
    response_model=dict,
    summary="Reject a pending stock adjustment",
    description=(
        "Reject a staff stock adjustment request. No stock changes are made.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def reject_adjustment(
    id: UUID,
    user=Depends(require_manager()),
):
    return StockService.resolve_approval(user["jwt"], id, "reject", user["id"])
