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
    ReceiveShipmentRequest,
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
    user: UserContext = Depends(require_staff()),
) -> List[OrderResponse]:
    return OrderService.list_orders(user["jwt"])


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
    user: UserContext = Depends(require_manager()),
) -> OrderResponse:
    return OrderService.get_order(user["jwt"], id)


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description=(
        "Create a new purchase or sales order with one or more line items.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def create_order(
    order: OrderCreate,
    user: UserContext = Depends(require_manager()),
) -> OrderResponse:
    return OrderService.create_order(user["jwt"], order, user["id"])


@router.put(
    "/{id}/status",
    response_model=OrderResponse,
    summary="Update order status",
    description=(
        "Update the status of an order (e.g., draft → confirmed → shipped → delivered).\n\n"
        "When an order is marked as **confirmed**, allocated_quantity is incremented for purchase orders.\n"
        "When an order is marked as **delivered**, stock levels are automatically adjusted "
        "for each line item:\n"
        "- Purchase orders: release allocation and increase physical stock (inbound)\n"
        "- Sales orders: decrease physical stock (outbound)\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def update_order_status(
    id: UUID,
    status_update: OrderUpdate,
    user: UserContext = Depends(require_manager()),
) -> OrderResponse:
    if not status_update.status:
        raise HTTPException(status_code=400, detail="Status is required")
    return OrderService.update_order_status(user["jwt"], id, status_update.status, user["id"])


@router.post(
    "/{id}/receive",
    response_model=OrderResponse,
    summary="Receive shipment (full or partial)",
    description=(
        "Record the physical receipt of goods for a purchase order.\n\n"
        "Accepts actual quantities received per SKU. If any item is short-shipped, "
        "the order transitions to **partially_delivered** automatically. "
        "If all items are fully received, the order moves to **delivered**.\n\n"
        "Stock `quantity` (physical) is incremented and `allocated_quantity` is released accordingly.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def receive_shipment(
    id: UUID,
    payload: ReceiveShipmentRequest,
    user: UserContext = Depends(require_manager()),
) -> OrderResponse:
    return OrderService.receive_shipment(user["jwt"], id, payload, user["id"])
