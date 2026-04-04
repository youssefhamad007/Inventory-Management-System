from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class ProductBase(BaseModel):
    sku: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    unit_price: Decimal = Decimal("0.00")
    cost_price: Decimal = Decimal("0.00")
    min_stock_level: int = 0
    image_url: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    """Create a product. Supplier links are managed separately via /products/{id}/suppliers."""
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[UUID] = None
    unit_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    min_stock_level: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------
# Product ↔ Supplier junction (Many-to-Many)
# ---------------------------------------------------------------

class ProductSupplierCreate(BaseModel):
    """Link a supplier to a product with pricing and lead-time info."""
    supplier_id: UUID
    unit_cost: Decimal = Decimal("0.00")
    lead_time_days: Optional[int] = None


class ProductSupplierUpdate(BaseModel):
    """Update supplier-specific pricing or lead time for a product."""
    unit_cost: Optional[Decimal] = None
    lead_time_days: Optional[int] = None


class ProductSupplierResponse(BaseModel):
    id: UUID
    product_id: UUID
    supplier_id: UUID
    unit_cost: Decimal
    lead_time_days: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
