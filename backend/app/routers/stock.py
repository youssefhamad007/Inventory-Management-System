from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.services.stock_service import StockService
from app.models.stock import StockAdjustmentRequest, StockTransferRequest
from app.auth.permissions import require_role, require_manager, require_staff

router = APIRouter()

@router.get("/", response_model=List[dict])
async def list_stock_levels(
    branch_id: Optional[UUID] = None,
    product_id: Optional[UUID] = None,
    user=Depends(require_staff())
):
    # RLS usually handles the branch filtering for Staff users, 
    # but we can also enforce it here if needed.
    return StockService.list_stock_levels(branch_id, product_id)

@router.post("/adjust", response_model=dict)
async def adjust_stock(
    adjustment: StockAdjustmentRequest,
    user=Depends(require_staff())
):
    # Staff can only adjust stock for their assigned branch
    if user["role"] == "staff" and str(adjustment.branch_id) != user["branch_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff can only adjust stock for their own branch"
        )
    
    return StockService.adjust_stock(adj, user["id"])

@router.post("/transfer", response_model=dict)
async def transfer_stock(
    transfer: StockTransferRequest,
    user=Depends(require_manager())
):
    return StockService.transfer_stock(transfer, user["id"])
