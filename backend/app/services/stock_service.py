from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import HTTPException, status
from app.db.supabase import get_user_client, get_admin_client
from app.models.stock import StockAdjustmentRequest, StockTransferRequest, TransactionType

# Financial threshold (in USD) above which a staff negative adjustment
# requires manager approval instead of immediate execution.
STAFF_NEGATIVE_ADJUSTMENT_THRESHOLD = Decimal("50.00")


class StockService:
    @staticmethod
    def list_stock_levels(
        jwt: str,
        branch_id: Optional[UUID] = None,
        product_id: Optional[UUID] = None
    ) -> List[dict]:
        supabase = get_user_client(jwt)

        # Query physical stock levels
        query = supabase.table("stock_levels").select(
            "*, product:products!product_id(name, sku, min_stock_level, is_active), branch:branches!branch_id(name)"
        ).eq("product.is_active", True)

        if branch_id:
            query = query.eq("branch_id", str(branch_id))
        if product_id:
            query = query.eq("product_id", str(product_id))

        result = query.execute()
        return result.data or []

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

    # ------------------------------------------------------------------
    # BE-TASK-03: Pending Approval CRUD
    # ------------------------------------------------------------------

    @staticmethod
    def create_pending_approval(
        adj: StockAdjustmentRequest,
        unit_cost: Decimal,
        requested_value: Decimal,
        requested_by: UUID,
    ) -> dict:
        """
        Insert a stock adjustment request into the pending_approvals table
        instead of executing it immediately.  Uses the admin client to bypass RLS.
        """
        admin = get_admin_client()
        payload = {
            "product_id": str(adj.product_id),
            "branch_id": str(adj.branch_id),
            "quantity_change": adj.quantity_change,
            "txn_type": adj.txn_type.value,
            "unit_cost": float(unit_cost),
            "requested_value": float(requested_value),
            "notes": adj.notes,
            "requested_by": str(requested_by),
            "approval_status": "pending",
        }
        result = admin.table("pending_approvals").insert(payload).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create pending approval record",
            )
        return result.data[0]

    @staticmethod
    def list_pending_approvals(jwt: str, approval_status: Optional[str] = "pending") -> List[dict]:
        """List approval requests (managers use their JWT; admin client for full visibility)."""
        admin = get_admin_client()
        query = admin.table("pending_approvals").select(
            "*, product:products!product_id(name, sku), branch:branches!branch_id(name), requester:profiles!requested_by(full_name)"
        )
        if approval_status:
            query = query.eq("approval_status", approval_status)
        result = query.order("created_at", desc=True).execute()
        return result.data or []

    @staticmethod
    def resolve_approval(
        jwt: str,
        approval_id: UUID,
        action: str,   # "approve" | "reject"
        resolved_by: UUID,
    ) -> dict:
        """
        Approve or reject a pending stock adjustment.
        On approval: the original stock RPC is executed immediately.
        On rejection: the record is marked rejected without touching stock.
        """
        admin = get_admin_client()

        # Fetch the approval record
        result = admin.table("pending_approvals").select("*").eq("id", str(approval_id)).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending approval not found",
            )
        approval = result.data[0]

        if approval["approval_status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Approval is already '{approval['approval_status']}'.",
            )

        if action == "approve":
            # Execute the original stock adjustment via the standard RPC
            adj = StockAdjustmentRequest(
                product_id=approval["product_id"],
                branch_id=approval["branch_id"],
                quantity_change=approval["quantity_change"],
                txn_type=TransactionType(approval["txn_type"]),
                notes=f"[Manager approved] {approval.get('notes', '')}",
            )
            StockService.adjust_stock(jwt, adj, resolved_by)

        new_status = "approved" if action == "approve" else "rejected"

        from datetime import datetime, timezone
        update_result = admin.table("pending_approvals").update({
            "approval_status": new_status,
            "resolved_by": str(resolved_by),
            "resolved_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", str(approval_id)).execute()

        return update_result.data[0] if update_result.data else {"approval_status": new_status}