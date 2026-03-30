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
        
        # 2. Initialize 0-quantity stock levels at ALL branches
        # This ensures the product is immediately manageable at every location.
        try:
            admin_supabase = get_admin_client()
            # Fetch all active branches
            branches_res = admin_supabase.table("branches").select("id").eq("is_active", True).execute()
            if branches_res.data:
                init_data = [
                    {"product_id": new_product["id"], "branch_id": b["id"], "quantity": 0}
                    for b in branches_res.data
                ]
                admin_supabase.table("stock_levels").insert(init_data).execute()
                print(f"Initialized stock for {new_product['id']} at {len(init_data)} branches")
        except Exception as e:
            print(f"Non-critical: Could not initialize all stock levels for {new_product['id']}: {str(e)}")
        
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
        p_id_str = str(product_id)
        
        print(f"Attempting to delete product: {p_id_str}")
        
        # 1. Try to delete associated stock levels first
        try:
            supabase.table("stock_levels").delete().eq("product_id", p_id_str).execute()
        except Exception as e:
            print(f"Warning: Stock level deletion failed for {p_id_str}: {str(e)}")
            
        # 2. Try hard delete on the product
        try:
            result = supabase.table("products").delete().eq("id", p_id_str).execute()
            if result.data and len(result.data) > 0:
                print(f"Product hard-deleted: {p_id_str}")
                return True
        except Exception as e:
            print(f"Product hard-delete failed (likely dependencies) for {p_id_str}: {str(e)}")

        # 3. Fallback: Soft delete if hard delete is impossible (safeguard history)
        try:
            print(f"Falling back to soft-delete for product: {p_id_str}")
            result = supabase.table("products").update({"is_active": False}).eq("id", p_id_str).execute()
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            print(f"Soft-delete also failed for {p_id_str}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Total deletion failure: {str(e)}")
