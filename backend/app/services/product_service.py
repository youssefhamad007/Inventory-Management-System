from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from app.db.supabase import get_user_client, get_admin_client
from app.models.product import ProductCreate, ProductUpdate, ProductResponse

class ProductService:
    @staticmethod
    def list_products(
        jwt: str,
        category_id: Optional[UUID] = None,
        supplier_id: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[dict]:
        supabase = get_user_client(jwt)
        query = supabase.table("products").select("*, category:categories!category_id(name), supplier:suppliers!supplier_id(name)")
        
        if category_id:
            query = query.eq("category_id", str(category_id))
        if supplier_id:
            query = query.eq("supplier_id", str(supplier_id))
        if search:
            query = query.or_(f"name.ilike.%{search}%,sku.ilike.%{search}%")
            
        result = query.range(skip, skip + limit - 1).execute()
        return result.data

    @staticmethod
    def get_product(jwt: str, product_id: UUID) -> dict:
        supabase = get_user_client(jwt)
        result = supabase.table("products").select("*, category:categories!category_id(name), supplier:suppliers!supplier_id(name)").eq("id", str(product_id)).execute()
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return result.data[0]

    @staticmethod
    def create_product(jwt: str, product: ProductCreate, branch_id: Optional[UUID] = None) -> dict:
        supabase = get_user_client(jwt)
        # 1. Create the product
        result = supabase.table("products").insert(product.model_dump(mode="json")).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create product")
        
        new_product = result.data[0]
        
        # 2. Initialize 0-quantity stock level at the specified branch (if any)
        # This ensures it shows up in the Stock list immediately for the user.
        if branch_id:
            try:
                supabase.table("stock_levels").insert({
                    "product_id": new_product["id"],
                    "branch_id": str(branch_id),
                    "quantity": 0
                }).execute()
            except Exception as e:
                # Silently fail stock initialization if it already exists or other non-critical error
                print(f"Non-critical: Could not initialize stock for {new_product['id']} at {branch_id}: {str(e)}")
        
        return new_product

    @staticmethod
    def update_product(jwt: str, product_id: UUID, product: ProductUpdate) -> dict:
        supabase = get_user_client(jwt)
        result = supabase.table("products").update(
            product.model_dump(mode="json", exclude_unset=True)
        ).eq("id", str(product_id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return result.data[0]

    @staticmethod
    def delete_product(jwt: str, product_id: UUID) -> bool:
        supabase = get_user_client(jwt)
        # Soft delete by setting is_active to False
        result = supabase.table("products").update({"is_active": False}).eq("id", str(product_id)).execute()
        return len(result.data) > 0
