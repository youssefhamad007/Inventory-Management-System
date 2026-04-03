from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, status, HTTPException
from app.services.stock_service import StockService, STAFF_NEGATIVE_ADJUSTMENT_THRESHOLD
from app.models.stock import StockAdjustmentRequest, StockTransferRequest
from app.services.valuation_service import ValuationService
from app.auth.permissions import require_role, require_manager, require_staff

router = APIRouter()


@router.get("/", response_model=List[dict])
async def list_stock_levels(
    branch_id: Optional[UUID] = None,
    product_id: Optional[UUID] = None,
    user=Depends(require_staff())
):
    return StockService.list_stock_levels(user["jwt"], branch_id, product_id)


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

    # BE-TASK-03: Intercept large negative adjustments by staff for approval workflow.
    # A unit_cost must be provided to evaluate the financial threshold.
    if (
        user["role"] == "staff"
        and adjustment.quantity_change < 0
        and adjustment.unit_cost is not None
    ):
        adjusted_value = abs(adjustment.quantity_change) * Decimal(str(adjustment.unit_cost))
        if adjusted_value > STAFF_NEGATIVE_ADJUSTMENT_THRESHOLD:
            # Block direct execution and queue for manager review
            approval = StockService.create_pending_approval(
                adj=adjustment,
                unit_cost=Decimal(str(adjustment.unit_cost)),
                requested_value=adjusted_value,
                requested_by=user["id"],
            )
            return {
                "pending_approval": True,
                "message": (
                    f"Adjustment value ${adjusted_value:.2f} exceeds the ${STAFF_NEGATIVE_ADJUSTMENT_THRESHOLD} "
                    "threshold. Submitted for manager approval."
                ),
                "approval_id": approval["id"],
            }

    return StockService.adjust_stock(user["jwt"], adjustment, user["id"])


@router.post("/transfer", response_model=dict)
async def transfer_stock(
    transfer: StockTransferRequest,
    user=Depends(require_manager())
):
    return StockService.transfer_stock(user["jwt"], transfer, user["id"])


# ------------------------------------------------------------------
# BE-TASK-04: Financial Valuation endpoints
# ------------------------------------------------------------------

@router.get(
    "/valuation",
    response_model=dict,
    summary="Current inventory valuation (WAC)",
    description=(
        "Returns the total inventory value and a per-product breakdown "
        "using the Weighted Average Cost (WAC) method.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def get_inventory_valuation(user=Depends(require_manager())):
    return ValuationService.calculate_inventory_value(user["jwt"])


@router.get(
    "/cogs",
    response_model=dict,
    summary="Cost of Goods Sold (COGS) over a date range",
    description=(
        "Calculates COGS for sales in the given date range using the "
        "Weighted Average Cost method.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def get_cogs(
    from_date: str = Query(..., description="Start date in ISO 8601 format (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date in ISO 8601 format (YYYY-MM-DD)"),
    user=Depends(require_manager()),
):
    return ValuationService.calculate_cogs(user["jwt"], from_date, to_date)
