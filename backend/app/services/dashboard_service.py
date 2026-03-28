from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional

from fastapi import HTTPException, status

from app.db.supabase import get_supabase_client


class DashboardService:
    @staticmethod
    def get_summary() -> Dict[str, Any]:
        supabase = get_supabase_client()

        # Total inventory value: manual aggregation since RPC doesn't exist
        stock_result = supabase.table("stock_levels").select("quantity, product_id, product:products(unit_price)").execute()
        total_value = sum(
            Decimal(str(item.get("quantity", 0))) * Decimal(str(item.get("product", {}).get("unit_price", 0)))
            for item in (stock_result.data or [])
        )

        low_stock_result = (
            supabase.table("stock_levels")
            .select("id, quantity, product:products(id, name, sku, min_stock_level)")
            .lte("quantity", 10)
            .execute()
        )
        low_stock_items = low_stock_result.data or []

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

        recent_txns_result = (
            supabase.table("stock_transactions")
            .select("*, stock_levels(product_id, branch_id)")
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        return {
            "total_inventory_value": total_value,
            "low_stock_alerts": low_stock_items,
            "order_summary": {
                "pending": pending,
                "delivered": delivered,
            },
            "recent_transactions": recent_txns_result.data or [],
        }

    @staticmethod
    def get_analytics() -> Dict[str, Any]:
        """
        Generate a 30-day daily valuation trend by taking the current total value
        and walking backwards through stock transactions.
        """
        supabase = get_supabase_client()
        
        # Current Value
        stock_result = supabase.table("stock_levels").select("quantity, product_id, product:products(unit_price)").execute()
        current_value = sum(
            (item.get("quantity", 0)) * float(item.get("product", {}).get("unit_price", 0))
            for item in (stock_result.data or [])
        )
        
        # 30 day historical transactions
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        
        # Group deltas by day & Aggregate movement by category
        deltas_by_day = {}
        category_movement = {} # { "category_name": { "in": 0, "out": 0 } }
        
        # Combined query to get all needed info for analytics
        all_txns = supabase.table("stock_transactions").select(
            "quantity_change, txn_type, created_at, stock_levels(product:products(unit_price, category:categories(name)))"
        ).gte("created_at", thirty_days_ago.isoformat()).execute()

        for txn in (all_txns.data or []):
            # Category movement for bar chart
            stock_level = txn.get("stock_levels", {}) or {}
            product = stock_level.get("product", {}) or {}
            category = product.get("category", {}) or {}
            cat_name = category.get("name") or "Uncategorized"
            
            if cat_name not in category_movement:
                category_movement[cat_name] = {"in": 0, "out": 0}
            
            change = txn.get("quantity_change", 0)
            if change > 0:
                category_movement[cat_name]["in"] += change
            else:
                category_movement[cat_name]["out"] += abs(change)

            # Daily valuation delta for area chart
            dt = datetime.fromisoformat(txn["created_at"].replace("Z", "+00:00")).date()
            day_str = dt.strftime("%Y-%m-%d")
            price = float(product.get("unit_price", 0))
            val_change = change * price
            
            deltas_by_day[day_str] = deltas_by_day.get(day_str, 0) + val_change
            
        valuation_data = []
        running_value = current_value
        
        # Walk forwards from day 29 to 0
        for i in range(29, -1, -1):
            target_day = today - timedelta(days=i)
            day_key = target_day.strftime("%Y-%m-%d")
            
            if i < 29:
                # Add yesterday's delta to get today's rolling value
                running_value += deltas_by_day.get(day_key, 0)
                
            label = (target_day.strftime("%d %b").lstrip("0")) if i > 0 else "Today"
            valuation_data.append({
                "month": label,
                "value": round(running_value, 2),
                "cost": round(running_value * 0.6, 2) # mock cost margin
            })
            
        return {
            "valuation_trend": valuation_data,
            "stock_movement": [
                {"name": name, "in": data["in"], "out": data["out"]}
                for name, data in category_movement.items()
            ]
        }

