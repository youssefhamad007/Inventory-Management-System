from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.services.order_service import OrderService
from app.models.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderType,
    OrderStatus,
)
from app.auth.permissions import require_role, require_staff, require_manager
from app.auth.schemas import UserContext

router = APIRouter()


@router.get(
    "/",
    response_model=List[OrderResponse],
    summary="List all orders",
    description=(
        "Retrieve a list of orders. Managers and admins see all orders by default, "
        "while staff members may be restricted by branch assignment in the service layer.\n\n"
        "- **Roles**: Admin, Manager, and Staff"
    ),
)
async def list_orders(
    user: UserContext = Depends(require_staff),
) -> List[OrderResponse]:
    return OrderService.list_orders()


@router.get(
    "/{id}",
    response_model=OrderResponse,
    summary="Get order details",
    description=(
        "Retrieve a single order with all line items.\n\n"
        "- **Roles**: Manager and Admin"
    ),
)
async def get_order(
    id: UUID,
    user: UserContext = Depends(require_manager),
) -> OrderResponse:
    return OrderService.get_order(id)


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description=(
        "Create a new purchase or sales order with one or more line items.\n\n"
        "- **Roles**: Admin, Manager, and Staff"
    ),
)
async def create_order(
    order: OrderCreate,
    user: UserContext = Depends(require_staff),
) -> OrderResponse:
    return OrderService.create_order(order, user["id"])


@router.put(
    "/{id}/status",
    response_model=OrderResponse,
    summary="Update order status",
    description=(
        "Update the status of an order (e.g., draft → confirmed → shipped → delivered).\n\n"
        "When an order is marked as **delivered**, stock levels are automatically adjusted "
        "for each line item using the StockService:\n"
        "- Purchase orders increase stock (inbound)\n"
        "- Sales orders decrease stock (outbound)\n\n"
        "- **Roles**: Admin, Manager, and Staff"
    ),
)
async def update_order_status(
    id: UUID,
    status_update: OrderUpdate,
    user: UserContext = Depends(require_staff),
) -> OrderResponse:
    if not status_update.status:
        raise HTTPException(status_code=400, detail="Status is required")
    return OrderService.update_order_status(id, status_update.status, user["id"])

