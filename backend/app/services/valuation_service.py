from typing import List, Optional
from decimal import Decimal
from collections import defaultdict

from fastapi import HTTPException, status

from app.db.supabase import get_user_client


class ValuationService:
    """
    Calculates inventory financial metrics using the Weighted Average Cost (WAC) method.

    WAC per product = Total cost of goods purchased / Total units purchased
    Inventory Value = WAC × current on-hand quantity
    COGS            = WAC × units sold in period
    """

    @staticmethod
    def _compute_wac(jwt: str) -> dict:
        """
        Build a WAC (Weighted Average Cost) map per product from historical
        purchase_in transactions that include a unit_cost.

        Returns: { product_id: Decimal wac_unit_cost }
        """
        supabase = get_user_client(jwt)

        # Fetch all purchase_in transactions with a unit_cost recorded
        result = supabase.table("stock_transactions").select(
            "product_id, quantity_change, unit_cost"
        ).eq("txn_type", "purchase_in").execute()

        transactions = result.data or []

        # Accumulate total cost and total units per product
        total_units: dict = defaultdict(Decimal)
        total_cost: dict = defaultdict(Decimal)

        for txn in transactions:
            pid = txn["product_id"]
            qty = Decimal(str(txn.get("quantity_change", 0)))
            unit_cost = txn.get("unit_cost")

            if unit_cost is None or qty <= 0:
                continue

            total_units[pid] += qty
            total_cost[pid] += qty * Decimal(str(unit_cost))

        # WAC = total_cost / total_units (avoid division by zero)
        wac_map: dict = {}
        for pid, units in total_units.items():
            if units > 0:
                wac_map[pid] = total_cost[pid] / units

        return wac_map

    @staticmethod
    def calculate_inventory_value(jwt: str) -> dict:
        """
        Returns the total inventory value using WAC, plus a per-product breakdown
        with: product_id, wac_unit_cost, on_hand_quantity, total_value.
        """
        supabase = get_user_client(jwt)

        # 1. Get current on-hand quantities per product
        stock_result = supabase.table("stock_levels").select(
            "product_id, quantity, product:products!product_id(name, sku)"
        ).execute()
        stock_records = stock_result.data or []

        # 2. Get WAC per product
        wac_map = ValuationService._compute_wac(jwt)

        # 3. Build per-product breakdown
        per_product = []
        total_inventory_value = Decimal("0.00")

        # Aggregate on-hand across branches
        on_hand_totals: dict = defaultdict(Decimal)
        product_meta: dict = {}
        for row in stock_records:
            pid = row["product_id"]
            on_hand_totals[pid] += Decimal(str(row.get("quantity", 0)))
            if pid not in product_meta and row.get("product"):
                product_meta[pid] = row["product"]

        for pid, on_hand_qty in on_hand_totals.items():
            wac = wac_map.get(pid, Decimal("0.00"))
            product_value = wac * on_hand_qty
            total_inventory_value += product_value

            meta = product_meta.get(pid, {})
            per_product.append({
                "product_id": pid,
                "product_name": meta.get("name") if meta else None,
                "sku": meta.get("sku") if meta else None,
                "wac_unit_cost": float(round(wac, 4)),
                "on_hand_quantity": int(on_hand_qty),
                "total_value": float(round(product_value, 2)),
            })

        # Sort by total_value descending for easy scanning
        per_product.sort(key=lambda x: x["total_value"], reverse=True)

        return {
            "total_inventory_value": float(round(total_inventory_value, 2)),
            "currency": "USD",
            "valuation_method": "Weighted Average Cost (WAC)",
            "per_product": per_product,
        }

    @staticmethod
    def calculate_cogs(jwt: str, from_date: str, to_date: str) -> dict:
        """
        Calculates Cost of Goods Sold for sale_out transactions in the given
        ISO 8601 date range using the Weighted Average Cost method.
        """
        supabase = get_user_client(jwt)

        # Fetch sales transactions in date range
        result = supabase.table("stock_transactions").select(
            "product_id, quantity_change, created_at"
        ).eq("txn_type", "sale_out").gte("created_at", from_date).lte("created_at", to_date + "T23:59:59").execute()

        sales_txns = result.data or []

        # WAC map (computed from full purchase history — WAC is a running average)
        wac_map = ValuationService._compute_wac(jwt)

        # Accumulate COGS per product
        cogs_by_product: dict = defaultdict(lambda: {"units_sold": 0, "cogs": Decimal("0.00")})

        for txn in sales_txns:
            pid = txn["product_id"]
            # quantity_change is negative for sales; take abs
            units_sold = abs(Decimal(str(txn.get("quantity_change", 0))))
            wac = wac_map.get(pid, Decimal("0.00"))
            cogs_by_product[pid]["units_sold"] += int(units_sold)
            cogs_by_product[pid]["cogs"] += wac * units_sold

        total_cogs = sum(v["cogs"] for v in cogs_by_product.values())

        per_product = [
            {
                "product_id": pid,
                "units_sold": data["units_sold"],
                "wac_unit_cost": float(round(wac_map.get(pid, Decimal("0.00")), 4)),
                "cogs": float(round(data["cogs"], 2)),
            }
            for pid, data in cogs_by_product.items()
        ]
        per_product.sort(key=lambda x: x["cogs"], reverse=True)

        return {
            "from_date": from_date,
            "to_date": to_date,
            "total_cogs": float(round(total_cogs, 2)),
            "currency": "USD",
            "valuation_method": "Weighted Average Cost (WAC)",
            "per_product": per_product,
        }
