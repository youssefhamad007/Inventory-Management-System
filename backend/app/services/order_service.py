from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from fastapi import HTTPException, status

from app.db.supabase import get_user_client, get_admin_client
from app.models.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderItemResponse,
    OrderType,
    OrderStatus,
    ReceiveShipmentRequest,
)
from app.models.stock import StockAdjustmentRequest, TransactionType
from app.services.stock_service import StockService


class OrderService:
    @staticmethod
    def _map_order_record(record: dict) -> OrderResponse:
        """
        Convert a raw Supabase order record (with nested order_items)
        into a strongly-typed OrderResponse model.
        """
        items_raw = record.get("items", record.get("order_items", [])) or []
        items: List[OrderItemResponse] = [OrderItemResponse(**item) for item in items_raw]

        payload = {**record, "items": items}
        return OrderResponse(**payload)

    @staticmethod
    def list_orders(
        jwt: str,
        order_type: Optional[OrderType] = None,
        status: Optional[OrderStatus] = None,
        branch_id: Optional[UUID] = None,
    ) -> List[OrderResponse]:
        supabase = get_user_client(jwt)
        query = supabase.table("orders").select("*, items:order_items(*, product:products(name, sku)), branch:branches(name), supplier:suppliers(name)")

        if order_type is not None:
            query = query.eq("order_type", order_type.value)
        if status is not None:
            query = query.eq("status", status.value)
        if branch_id is not None:
            query = query.eq("branch_id", str(branch_id))

        result = query.execute()
        records = result.data or []
        return [OrderService._map_order_record(rec) for rec in records]

    @staticmethod
    def get_order(jwt: str, order_id: UUID) -> OrderResponse:
        supabase = get_user_client(jwt)
        result = (
            supabase.table("orders")
            .select("*, items:order_items(*, product:products(name, sku)), branch:branches(name), supplier:suppliers(name)")
            .eq("id", str(order_id))
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found",
            )
        return OrderService._map_order_record(result.data[0])

    @staticmethod
    def create_order(jwt: str, order: OrderCreate, created_by: UUID) -> OrderResponse:
        supabase = get_user_client(jwt)

        # 1. Create order header
        order_data = order.model_dump(mode="json", exclude={"items"})

        # Auto-generate order number if not provided (ORD-YYYYMMDD-XXXX)
        if not order_data.get("order_number"):
            from datetime import datetime
            import random
            timestamp = datetime.now().strftime("%Y%m%d%H%M")
            order_data["order_number"] = f"ORD-{timestamp}-{random.randint(1000, 9999)}"

        order_data["created_by"] = str(created_by)

        order_res = supabase.table("orders").insert(order_data).execute()
        if not order_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create order",
            )
        new_order = order_res.data[0]

        # 2. Create order items
        items_data = []
        total_amount = Decimal("0.00")
        for item in order.items:
            item_dict = item.model_dump(mode="json")
            item_dict["order_id"] = new_order["id"]
            items_data.append(item_dict)
            total_amount += item.unit_price * item.quantity

        if items_data:
            supabase.table("order_items").insert(items_data).execute()

        # 3. Update total amount on order header
        supabase.table("orders").update(
            {"total_amount": str(total_amount)}
        ).eq("id", new_order["id"]).execute()

        return OrderService.get_order(jwt, UUID(new_order["id"]))

    # ------------------------------------------------------------------
    # Internal helpers for stock allocation
    # ------------------------------------------------------------------

    @staticmethod
    def _adjust_allocated(admin_client, product_id: UUID, branch_id: UUID, delta: int, performed_by: UUID, notes: str):
        """
        Calls the adjust_allocated_quantity RPC to atomically change
        allocated_quantity in stock_levels.
        A positive delta = allocate (reserve); negative = release.
        """
        result = admin_client.rpc("adjust_allocated_quantity", {
            "p_product_id": str(product_id),
            "p_branch_id": str(branch_id),
            "p_delta": delta,
            "p_performed_by": str(performed_by),
            "p_notes": notes,
        }).execute()

        if result.data and result.data.get("success") is False:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=result.data.get("error", "Stock allocation update failed"),
            )

    @staticmethod
    def _allocate_for_order(jwt: str, order: OrderResponse, performed_by: UUID):
        """Increment allocated_quantity for every item on a PURCHASE order."""
        if order.order_type != OrderType.PURCHASE:
            return  # Allocation only relevant for inbound purchase orders

        admin = get_admin_client()
        for item in order.items:
            OrderService._adjust_allocated(
                admin,
                item.product_id,
                order.branch_id,
                delta=item.quantity,   # +ve = allocate
                performed_by=performed_by,
                notes=f"Allocated for order {order.order_number} (confirmed)",
            )

    @staticmethod
    def _release_allocation_for_order(jwt: str, order: OrderResponse, performed_by: UUID):
        """
        Release (decrement) allocated_quantity and deduct physical quantity
        when a PURCHASE order is marked as DELIVERED.
        """
        if order.order_type != OrderType.PURCHASE:
            return

        admin = get_admin_client()
        for item in order.items:
            # Deduct allocation
            OrderService._adjust_allocated(
                admin,
                item.product_id,
                order.branch_id,
                delta=-item.quantity,  # release the reservation
                performed_by=performed_by,
                notes=f"Released allocation on delivery of order {order.order_number}",
            )
            # Add to physical stock via existing RPC
            adj_req = StockAdjustmentRequest(
                product_id=item.product_id,
                branch_id=order.branch_id,
                quantity_change=item.quantity,
                txn_type=TransactionType.PURCHASE_IN,
                notes=f"Received from order {order.order_number} (delivered)",
            )
            StockService.adjust_stock(jwt, adj_req, performed_by)

    # ------------------------------------------------------------------
    # Public status transition
    # ------------------------------------------------------------------

    @staticmethod
    def update_order_status(
        jwt: str,
        order_id: UUID,
        new_status: OrderStatus,
        performed_by: UUID,
    ) -> OrderResponse:
        """
        Update the order status and trigger the appropriate stock side-effects:
          - CONFIRMED  → allocate_quantity incremented (purchase orders only)
          - DELIVERED  → allocated_quantity decremented + physical quantity incremented
          - SALE orders: on DELIVERED deduct physical stock as before
        """
        order = OrderService.get_order(jwt, order_id)
        current_status = order.status

        if current_status == new_status:
            return order

        # --- CONFIRMED: allocate stock (purchase orders) ----------------
        if new_status == OrderStatus.CONFIRMED and current_status == OrderStatus.DRAFT:
            OrderService._allocate_for_order(jwt, order, performed_by)

        # --- DELIVERED: release allocation + adjust physical stock -------
        elif new_status == OrderStatus.DELIVERED and current_status not in (
            OrderStatus.DELIVERED, OrderStatus.CANCELLED
        ):
            if order.order_type == OrderType.PURCHASE:
                # Release allocation and add physical stock
                OrderService._release_allocation_for_order(jwt, order, performed_by)
            else:
                # SALE order: just deduct physical stock (no allocation used)
                for item in order.items:
                    adj_req = StockAdjustmentRequest(
                        product_id=item.product_id,
                        branch_id=order.branch_id,
                        quantity_change=-item.quantity,
                        txn_type=TransactionType.SALE_OUT,
                        notes=f"Sold via order {order.order_number} (delivered)",
                    )
                    StockService.adjust_stock(jwt, adj_req, performed_by)

        # 3. Persist the new status
        supabase = get_user_client(jwt)
        supabase.table("orders").update(
            {"status": new_status.value}
        ).eq("id", str(order_id)).execute()

        return OrderService.get_order(jwt, order_id)

    # ------------------------------------------------------------------
    # BE-TASK-02: Partial / Full Shipment Receive
    # ------------------------------------------------------------------

    @staticmethod
    def receive_shipment(
        jwt: str,
        order_id: UUID,
        payload: ReceiveShipmentRequest,
        performed_by: UUID,
    ) -> OrderResponse:
        """
        Process physical receipt of goods for a purchase order.

        - Adjusts physical stock for each received item.
        - Releases the corresponding allocated_quantity.
        - If received < ordered for any item → status becomes PARTIALLY_DELIVERED.
        - If all items are fully received → status becomes DELIVERED.
        """
        order = OrderService.get_order(jwt, order_id)

        # Validate transition
        if order.status not in (OrderStatus.CONFIRMED, OrderStatus.PARTIALLY_DELIVERED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot receive shipment for order in '{order.status.value}' status. "
                    "Order must be 'confirmed' or 'partially_delivered'."
                ),
            )

        if order.order_type != OrderType.PURCHASE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Shipment receive is only supported for purchase orders.",
            )

        # Build a lookup: product_id → ordered_quantity
        ordered_map = {str(item.product_id): item.quantity for item in order.items}

        # Build a lookup: product_id → previously received (for partial orders)
        # We'll track what we receive this time vs what was ordered
        received_map = {str(ri.product_id): ri.received_quantity for ri in payload.items}

        admin = get_admin_client()
        all_fulfilled = True

        for item in order.items:
            pid = str(item.product_id)
            ordered_qty = ordered_map.get(pid, 0)
            received_qty = received_map.get(pid, 0)

            if received_qty <= 0:
                all_fulfilled = False
                continue  # Nothing received for this item yet

            if received_qty > ordered_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Received quantity ({received_qty}) exceeds ordered quantity ({ordered_qty}) for product {pid}.",
                )

            if received_qty < ordered_qty:
                all_fulfilled = False

            # Add to physical stock
            adj_req = StockAdjustmentRequest(
                product_id=item.product_id,
                branch_id=order.branch_id,
                quantity_change=received_qty,
                txn_type=TransactionType.PURCHASE_IN,
                notes=f"Partial/full receipt for order {order.order_number}",
            )
            StockService.adjust_stock(jwt, adj_req, performed_by)

            # Release corresponding allocation
            OrderService._adjust_allocated(
                admin,
                item.product_id,
                order.branch_id,
                delta=-received_qty,
                performed_by=performed_by,
                notes=f"Allocation released on receipt for order {order.order_number}",
            )

        new_status = OrderStatus.DELIVERED if all_fulfilled else OrderStatus.PARTIALLY_DELIVERED

        supabase = get_user_client(jwt)
        supabase.table("orders").update(
            {"status": new_status.value}
        ).eq("id", str(order_id)).execute()

        return OrderService.get_order(jwt, order_id)
