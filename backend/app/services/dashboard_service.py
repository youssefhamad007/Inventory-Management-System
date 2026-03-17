from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Any, Optional

from fastapi import HTTPException, status

from app.db.supabase import get_supabase_client


class DashboardService:
    @staticmethod
    def get_summary() -> Dict[str, Any]:
        """
        Aggregate key KPIs for the dashboard:
        - total_inventory_value
        - low_stock_alerts
        - order_summary (pending vs delivered this month)
        - recent_transactions (last 10 stock_transactions)
        """
        supabase = get_supabase_client()

        # Total inventory value via RPC (preferred) or fallback aggregation
        inv_result = supabase.rpc("get_total_inventory_value", {}).execute()
        if inv_result.data is None:
            total_inventory_value = Decimal("0.00")
        else:
            total_inventory_value = Decimal(str(inv_result.data.get("total_value", "0.00")))

        # Low stock alerts: products where quantity <= min_stock_level
        # We rely on a view or join capable endpoint in Supabase; otherwise fetch and filter.
        low_stock_result = (
            supabase.table("stock_levels")
            .select("id, quantity, products(id, name, sku, min_stock_level)")
            .lte("quantity", 10)
            .execute()
        )
        low_stock_items = low_stock_result.data or []

        # Order summary for current month
        today = date.today()
        month_start = today.replace(day=1)
        orders_result = (
            supabase.table("orders")
            .select("id, status, created_at")
            .gte("created_at", month_start.isoformat())
            .execute()
        )
        pending = 0
        delivered = 0
        for o in orders_result.data or []:
            if o.get("status") in ("draft", "confirmed", "shipped"):
                pending += 1
            elif o.get("status") == "delivered":
                delivered += 1

        # Recent stock transactions (activity feed)
        recent_txns_result = (
            supabase.table("stock_transactions")
            .select("*, stock_levels(product_id, branch_id)")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        return {
            "total_inventory_value": total_inventory_value,
            "low_stock_alerts": low_stock_items,
            "order_summary": {
                "pending": pending,
                "delivered": delivered,
            },
            "recent_transactions": recent_txns_result.data or [],
        }

    @staticmethod
    def get_stock_movement(
        start_date: date,
        end_date: date,
    ) -> List[Dict[str, Any]]:
        """
        Return stock movement data grouped by date for reporting charts.

        Uses a database-side view / RPC `get_stock_movement_series` that
        returns rows of the form:
        - movement_date: date
        - total_in: int
        - total_out: int
        """
        if start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="start_date must be on or before end_date",
            )

        supabase = get_supabase_client()
        result = supabase.rpc(
            "get_stock_movement_series",
            {"p_start_date": start_date.isoformat(), "p_end_date": end_date.isoformat()},
        ).execute()

        return result.data or []

