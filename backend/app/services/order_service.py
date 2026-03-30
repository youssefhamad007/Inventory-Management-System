from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from fastapi import HTTPException, status

from app.db.supabase import get_user_client
from app.models.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderItemResponse,
    OrderType,
    OrderStatus,
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
        items_raw = record.get("order_items", []) or []
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

    @staticmethod
    def update_order_status(
        jwt: str,
        order_id: UUID,
        new_status: OrderStatus,
        performed_by: UUID,
    ) -> OrderResponse:
        """
        Update the order status and, when transitioning to DELIVERED,
        adjust stock levels for each line item via StockService.
        """
        # 1. Get current order as a typed model
        order = OrderService.get_order(jwt, order_id)
        current_status = order.status

        if current_status == new_status:
            return order

        # 2. On transition to DELIVERED, adjust stock for all items
        if new_status == OrderStatus.DELIVERED and current_status != OrderStatus.DELIVERED:
            branch_id = order.branch_id
            order_type = order.order_type

            for item in order.items:
                if order_type == OrderType.PURCHASE:
                    qty_change = item.quantity
                    txn_type = TransactionType.PURCHASE_IN
                else:
                    qty_change = -item.quantity
                    txn_type = TransactionType.SALE_OUT

                adj_req = StockAdjustmentRequest(
                    product_id=item.product_id,
                    branch_id=branch_id,
                    quantity_change=qty_change,
                    txn_type=txn_type,
                    notes=f"Processed from order {order.order_number} ({new_status.value})",
                )
                StockService.adjust_stock(jwt, adj_req, performed_by)

        # 3. Update status after successful stock adjustments
        supabase = get_user_client(jwt)
        supabase.table("orders").update(
            {"status": new_status.value}
        ).eq("id", str(order_id)).execute()

        return OrderService.get_order(jwt, order_id)
