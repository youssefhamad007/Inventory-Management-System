from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.db.supabase import get_user_client
from app.models.stock import StockAdjustmentRequest, StockTransferRequest, TransactionType

class StockService:
    @staticmethod
    def list_stock_levels(
        jwt: str,
        branch_id: Optional[UUID] = None,
        product_id: Optional[UUID] = None
    ) -> List[dict]:
        supabase = get_user_client(jwt)
        
        # 1. Fetch physical stock levels
        stock_query = supabase.table("stock_levels").select(
            "*, product:products!product_id(name, sku, min_stock_level), branch:branches!branch_id(name)"
        )
        if branch_id:
            stock_query = stock_query.eq("branch_id", str(branch_id))
        if product_id:
            stock_query = stock_query.eq("product_id", str(product_id))
            
        stock_result = stock_query.execute()
        physical_stock = stock_result.data or []
        
        # 2. If filtering by a specific branch or product, we might want to see "Zero Stock" items too.
        # But for now, let's at least ensure all products are visible if product_id is specified,
        # or if we are looking at the general list, ensure products with NO entries appear at least once.
        
        # Optimization: Only do the "Merge" if we are looking for a specific product or the general list
        # to avoid performance issues with huge catalogs.
        all_products_query = supabase.table("products").select("id, name, sku, min_stock_level")
        if product_id:
            all_products_query = all_products_query.eq("id", str(product_id))
        
        products_result = all_products_query.limit(200).execute() # Limit to prevent explosion
        all_products = products_result.data or []
        
        # Create a set of product IDs that already have stock entries
        product_ids_with_stock = {s["product_id"] for s in physical_stock}
        
        # For products with NO stock entries anywhere, add a "virtual" 0-stock entry
        virtual_stock = []
        for p in all_products:
            if p["id"] not in product_ids_with_stock:
                # If we're filtering by branch, but the product isn't there, show it at that branch with 0
                virtual_stock.append({
                    "id": f"virtual-{p['id']}",
                    "product_id": p["id"],
                    "branch_id": str(branch_id) if branch_id else None,
                    "quantity": 0,
                    "product": p,
                    "branch": {"name": "Pending Initialization"} if not branch_id else {"name": "Not in this Branch"}
                })
                
        return physical_stock + virtual_stock

    @staticmethod
    def adjust_stock(jwt: str, adj: StockAdjustmentRequest, performed_by: UUID) -> dict:
        """
        Calls the PostgreSQL RPC function 'adjust_stock_level' defined in the DB.
        This ensures atomic updates and audit logging.
        The RPC is SECURITY DEFINER, so it runs with elevated privileges
        regardless of the caller's RLS context.
        """
        supabase = get_user_client(jwt)
        
        result = supabase.rpc("adjust_stock_level", {
            "p_product_id": str(adj.product_id),
            "p_branch_id": str(adj.branch_id),
            "p_quantity_change": adj.quantity_change,
            "p_txn_type": adj.txn_type.value,
            "p_performed_by": str(performed_by),
            "p_notes": adj.notes
        }).execute()
        
        if not result.data or result.data.get("success") is False:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=result.data.get("error", "Stock adjustment failed")
            )
            
        return result.data

    @staticmethod
    def transfer_stock(jwt: str, transfer: StockTransferRequest, performed_by: UUID) -> dict:
        """
        Inter-branch transfer: involves two adjustments (out from source, in to target).
        """
        # 1. Deduct from source
        out_adj = StockAdjustmentRequest(
            product_id=transfer.product_id,
            branch_id=transfer.from_branch_id,
            quantity_change=-transfer.quantity,
            txn_type=TransactionType.TRANSFER_OUT,
            notes=f"Transfer to {transfer.to_branch_id}. {transfer.notes or ''}"
        )
        StockService.adjust_stock(jwt, out_adj, performed_by)
        
        # 2. Add to target
        in_adj = StockAdjustmentRequest(
            product_id=transfer.product_id,
            branch_id=transfer.to_branch_id,
            quantity_change=transfer.quantity,
            txn_type=TransactionType.TRANSFER_IN,
            notes=f"Transfer from {transfer.from_branch_id}. {transfer.notes or ''}"
        )
        return StockService.adjust_stock(jwt, in_adj, performed_by)