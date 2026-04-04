from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from app.services.product_service import ProductService
from app.models.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductSupplierCreate,
    ProductSupplierUpdate,
)
from app.auth.permissions import require_role, require_manager

router = APIRouter()


# ------------------------------------------------------------------
# Core Product CRUD
# ------------------------------------------------------------------


@router.get("/", response_model=List[dict])
async def list_products(
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user=Depends(require_role(["admin", "manager", "staff"])),
):
    return ProductService.list_products(
        user["jwt"], category_id, search, skip, limit
    )


@router.get("/{id}", response_model=dict)
async def get_product(
    id: UUID,
    user=Depends(require_role(["admin", "manager", "staff"])),
):
    return ProductService.get_product(user["jwt"], id)


@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    user=Depends(require_manager()),
):
    return ProductService.create_product(
        user["jwt"], product, user.get("branch_id")
    )


@router.put("/{id}", response_model=dict)
async def update_product(
    id: UUID,
    product: ProductUpdate,
    user=Depends(require_manager()),
):
    return ProductService.update_product(user["jwt"], id, product)


@router.delete("/{id}", response_model=dict)
async def delete_product(
    id: UUID,
    user=Depends(require_role(["admin"])),
):
    success = ProductService.delete_product(user["jwt"], id)
    return {
        "success": success,
        "message": "Product deactivated" if success else "Product not found",
    }


# ------------------------------------------------------------------
# Product ↔ Supplier relationship management
# ------------------------------------------------------------------


@router.get(
    "/{id}/suppliers",
    response_model=List[dict],
    summary="List suppliers for a product",
    description=(
        "Returns all suppliers linked to this product, including unit "
        "cost, lead time, and supplier contact info.\n\n"
        "- **Roles**: Admin, Manager, Staff"
    ),
)
async def list_product_suppliers(
    id: UUID,
    user=Depends(require_role(["admin", "manager", "staff"])),
):
    return ProductService.list_product_suppliers(user["jwt"], id)


@router.post(
    "/{id}/suppliers",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Link a supplier to a product",
    description=(
        "Create a new product-supplier relationship with per-supplier "
        "pricing and lead time.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def add_product_supplier(
    id: UUID,
    data: ProductSupplierCreate,
    user=Depends(require_manager()),
):
    return ProductService.add_product_supplier(user["jwt"], id, data)


@router.put(
    "/{id}/suppliers/{supplier_id}",
    response_model=dict,
    summary="Update a product-supplier link",
    description=(
        "Update the unit cost or lead time for an existing "
        "product-supplier relationship.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def update_product_supplier(
    id: UUID,
    supplier_id: UUID,
    data: ProductSupplierUpdate,
    user=Depends(require_manager()),
):
    return ProductService.update_product_supplier(user["jwt"], id, supplier_id, data)


@router.delete(
    "/{id}/suppliers/{supplier_id}",
    response_model=dict,
    summary="Unlink a supplier from a product",
    description=(
        "Remove the supplier relationship. Does not delete the supplier "
        "or product themselves.\n\n"
        "- **Roles**: Admin and Manager"
    ),
)
async def remove_product_supplier(
    id: UUID,
    supplier_id: UUID,
    user=Depends(require_manager()),
):
    ProductService.remove_product_supplier(user["jwt"], id, supplier_id)
    return {"success": True, "message": "Supplier unlinked from product"}
