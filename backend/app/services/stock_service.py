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
        query = supabase.table("stock_levels").select(
            "*, product:products!product_id(name, sku, min_stock_level), branch:branches!branch_id(name)"
        )
        
        if branch_id:
            query = query.eq("branch_id", str(branch_id))
        if product_id:
            query = query.eq("product_id", str(product_id))
            
        result = query.execute()
        return result.data

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