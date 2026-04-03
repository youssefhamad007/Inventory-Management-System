from typing import Optional
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from enum import Enum


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class PendingApprovalResponse(BaseModel):
    """Represents a stock adjustment request awaiting manager review."""
    id: UUID
    product_id: UUID
    branch_id: UUID
    quantity_change: int
    unit_cost: Optional[float] = None
    requested_value: Optional[float] = None
    notes: Optional[str] = None
    requested_by: UUID
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    resolved_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
