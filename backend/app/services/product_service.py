from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.db.supabase import get_user_client, get_admin_client
from app.models.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductSupplierCreate,
    ProductSupplierUpdate,
)


class ProductService:
    # ------------------------------------------------------------------
    # Core Product CRUD
    # ------------------------------------------------------------------

    @staticmethod
    def list_products(
        jwt: str,
        category_id: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[dict]:
        supabase = get_user_client(jwt)

        # Join category name and supplier info via junction table
        query = supabase.table("products").select(
            "*, "
            "category:categories!category_id(name), "
            "product_suppliers(id, supplier_id, unit_cost, lead_time_days, "
            "supplier:suppliers(name))"
        )

        if category_id:
            query = query.eq("category_id", str(category_id))
        if search:
            query = query.or_(f"name.ilike.%{search}%,sku.ilike.%{search}%")

        result = query.range(skip, skip + limit - 1).execute()
        return result.data

    @staticmethod
    def get_product(jwt: str, product_id: UUID) -> dict:
        supabase = get_user_client(jwt)
        result = (
            supabase.table("products")
            .select(
                "*, "
                "category:categories!category_id(name), "
                "product_suppliers(id, supplier_id, unit_cost, lead_time_days, "
                "supplier:suppliers(name))"
            )
            .eq("id", str(product_id))
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return result.data[0]

    @staticmethod
    def create_product(
        jwt: str, product: ProductCreate, branch_id: Optional[UUID] = None
    ) -> dict:
        supabase = get_user_client(jwt)
        # 1. Create the product (no supplier_id — managed via junction table)
        result = supabase.table("products").insert(
            product.model_dump(mode="json")
        ).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create product")

        new_product = result.data[0]

        # 2. Initialize 0-quantity stock levels at ALL active branches
        try:
            admin_supabase = get_admin_client()
            branches_res = (
                admin_supabase.table("branches")
                .select("id")
                .eq("is_active", True)
                .execute()
            )
            if branches_res.data:
                init_data = [
                    {
                        "product_id": new_product["id"],
                        "branch_id": b["id"],
                        "quantity": 0,
                        "allocated_quantity": 0,
                    }
                    for b in branches_res.data
                ]
                admin_supabase.table("stock_levels").insert(init_data).execute()
                print(
                    f"Initialized stock for {new_product['id']} "
                    f"at {len(init_data)} branches"
                )
        except Exception as e:
            print(
                f"Non-critical: Could not initialize all stock levels "
                f"for {new_product['id']}: {str(e)}"
            )

        return new_product

    @staticmethod
    def update_product(jwt: str, product_id: UUID, product: ProductUpdate) -> dict:
        supabase = get_user_client(jwt)
        result = (
            supabase.table("products")
            .update(product.model_dump(mode="json", exclude_unset=True))
            .eq("id", str(product_id))
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return result.data[0]

    @staticmethod
    def delete_product(jwt: str, product_id: UUID) -> bool:
        supabase = get_user_client(jwt)
        p_id_str = str(product_id)

        print(f"Attempting to delete product: {p_id_str}")

        # 1. Try to delete associated stock levels first
        try:
            supabase.table("stock_levels").delete().eq(
                "product_id", p_id_str
            ).execute()
        except Exception as e:
            print(f"Warning: Stock level deletion failed for {p_id_str}: {str(e)}")

        # 2. Try hard delete on the product (CASCADE will clean product_suppliers)
        try:
            result = (
                supabase.table("products").delete().eq("id", p_id_str).execute()
            )
            if result.data and len(result.data) > 0:
                print(f"Product hard-deleted: {p_id_str}")
                return True
        except Exception as e:
            print(
                f"Product hard-delete failed (likely dependencies) "
                f"for {p_id_str}: {str(e)}"
            )

        # 3. Fallback: Soft delete
        try:
            print(f"Falling back to soft-delete for product: {p_id_str}")
            result = (
                supabase.table("products")
                .update({"is_active": False})
                .eq("id", p_id_str)
                .execute()
            )
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            print(f"Soft-delete also failed for {p_id_str}: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Total deletion failure: {str(e)}"
            )

    # ------------------------------------------------------------------
    # Product ↔ Supplier junction CRUD
    # ------------------------------------------------------------------

    @staticmethod
    def list_product_suppliers(jwt: str, product_id: UUID) -> List[dict]:
        """List all suppliers linked to a product with their pricing info."""
        supabase = get_user_client(jwt)
        result = (
            supabase.table("product_suppliers")
            .select("*, supplier:suppliers(name, contact_name, email, phone)")
            .eq("product_id", str(product_id))
            .execute()
        )
        return result.data or []

    @staticmethod
    def add_product_supplier(
        jwt: str, product_id: UUID, data: ProductSupplierCreate
    ) -> dict:
        """Link a supplier to a product with unit cost and lead time."""
        supabase = get_user_client(jwt)

        # Verify product exists
        product_check = (
            supabase.table("products")
            .select("id")
            .eq("id", str(product_id))
            .execute()
        )
        if not product_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )

        payload = data.model_dump(mode="json")
        payload["product_id"] = str(product_id)

        try:
            result = supabase.table("product_suppliers").insert(payload).execute()
        except Exception as e:
            error_msg = str(e)
            if "duplicate" in error_msg.lower() or "unique" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This supplier is already linked to this product.",
                )
            raise HTTPException(status_code=500, detail=f"Failed to link supplier: {error_msg}")

        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to link supplier")
        return result.data[0]

    @staticmethod
    def update_product_supplier(
        jwt: str,
        product_id: UUID,
        supplier_id: UUID,
        data: ProductSupplierUpdate,
    ) -> dict:
        """Update unit cost or lead time for an existing product-supplier link."""
        supabase = get_user_client(jwt)
        result = (
            supabase.table("product_suppliers")
            .update(data.model_dump(mode="json", exclude_unset=True))
            .eq("product_id", str(product_id))
            .eq("supplier_id", str(supplier_id))
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product-supplier link not found",
            )
        return result.data[0]

    @staticmethod
    def remove_product_supplier(jwt: str, product_id: UUID, supplier_id: UUID) -> bool:
        """Unlink a supplier from a product."""
        supabase = get_user_client(jwt)
        result = (
            supabase.table("product_suppliers")
            .delete()
            .eq("product_id", str(product_id))
            .eq("supplier_id", str(supplier_id))
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product-supplier link not found",
            )
        return True
