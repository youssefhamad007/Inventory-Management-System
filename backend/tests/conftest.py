import os
import sys
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

import pytest
from fastapi import Depends, HTTPException, Request, status
from fastapi.testclient import TestClient

# Ensure `backend/` is on sys.path so `from app...` imports work.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# FastAPI app imports read env vars at import-time via pydantic-settings.
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_ANON_KEY", "anon")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service_role")
os.environ.setdefault("DATABASE_URL", "postgresql://localhost/test")

from app.main import app  # noqa: E402
from app.auth.middleware import get_current_user  # noqa: E402
from app.routers import branches as branches_router  # noqa: E402
from app.routers import users as users_router  # noqa: E402
from app.services.dashboard_service import DashboardService  # noqa: E402
from app.services.order_service import OrderService  # noqa: E402
from app.services.product_service import ProductService  # noqa: E402
from app.services.stock_service import StockService  # noqa: E402


@dataclass(frozen=True)
class FakeUser:
    id: UUID
    email: str
    role: str
    branch_id: Optional[str]
    jwt: str


def _iso_now() -> datetime:
    # Stable enough for tests; avoid depending on current timezone formatting.
    return datetime(2026, 1, 1, 0, 0, 0)


class _FakeResult:
    def __init__(self, data: Any):
        self.data = data


class _FakeTable:
    """
    Minimal Supabase table-query emulator for the few router paths we test.
    """

    def __init__(self, table_name: str, profiles_data: List[Dict[str, Any]], branches_data: List[Dict[str, Any]]):
        self._table_name = table_name
        self._profiles_data = profiles_data
        self._branches_data = branches_data
        self._op: Optional[str] = None
        self._values: Optional[Dict[str, Any]] = None
        self._filter_eq_id: Optional[str] = None

    def select(self, *_args: Any, **_kwargs: Any) -> "_FakeTable":
        self._op = "select"
        return self

    def insert(self, values: Dict[str, Any]) -> "_FakeTable":
        self._op = "insert"
        self._values = values
        return self

    def update(self, values: Dict[str, Any]) -> "_FakeTable":
        self._op = "update"
        self._values = values
        return self

    def eq(self, column: str, value: Any) -> "_FakeTable":
        # We only emulate `eq("id", ...)` for these tests.
        if column == "id":
            self._filter_eq_id = str(value)
        return self

    def execute(self) -> _FakeResult:
        if self._op == "select":
            if self._table_name == "profiles":
                return _FakeResult(self._profiles_data)
            if self._table_name == "branches":
                return _FakeResult(self._branches_data)
            return _FakeResult([])

        if self._op == "insert":
            if self._table_name == "branches":
                inserted = {**(self._values or {}), "id": str(uuid4())}
                self._branches_data.append(inserted)
                return _FakeResult([inserted])
            return _FakeResult([])

        if self._op == "update":
            if self._table_name == "profiles":
                # Return the updated profile row.
                updated = {"id": self._filter_eq_id, **(self._values or {})}
                return _FakeResult([updated])
            if self._table_name == "branches":
                updated = {"id": self._filter_eq_id, **(self._values or {})}
                return _FakeResult([updated])
            return _FakeResult([])

        raise RuntimeError(f"Unsupported fake operation: {self._op!r}")

    def single(self) -> "_FakeTable":
        # Not needed for the tests; keep for compatibility if added later.
        return self


class _FakeSupabaseClient:
    def __init__(self, profiles_data: List[Dict[str, Any]], branches_data: List[Dict[str, Any]]):
        self._profiles_data = profiles_data
        self._branches_data = branches_data

    def table(self, table_name: str) -> _FakeTable:
        return _FakeTable(table_name, self._profiles_data, self._branches_data)


@pytest.fixture()
def auth_user_data() -> Dict[str, FakeUser]:
    staff_branch = str(uuid4())
    return {
        "admin-token": FakeUser(
            id=uuid4(),
            email="admin@example.com",
            role="admin",
            branch_id=str(uuid4()),
            jwt="admin-token",
        ),
        "manager-token": FakeUser(
            id=uuid4(),
            email="manager@example.com",
            role="manager",
            branch_id=str(uuid4()),
            jwt="manager-token",
        ),
        "staff-token": FakeUser(
            id=uuid4(),
            email="staff@example.com",
            role="staff",
            # Important: router compares `str(adj.branch_id) != user["branch_id"]`,
            # so we keep it as a string like Supabase typically returns.
            branch_id=staff_branch,
            jwt="staff-token",
        ),
    }


@pytest.fixture()
def fake_supabase(auth_user_data: Dict[str, FakeUser]) -> _FakeSupabaseClient:
    profiles_data = [
        {
            "id": str(auth_user_data["admin-token"].id),
            "email": auth_user_data["admin-token"].email,
            "role": "admin",
            "branch_id": auth_user_data["admin-token"].branch_id,
            "is_active": True,
        },
        {
            "id": str(auth_user_data["manager-token"].id),
            "email": auth_user_data["manager-token"].email,
            "role": "manager",
            "branch_id": auth_user_data["manager-token"].branch_id,
            "is_active": True,
        },
        {
            "id": str(auth_user_data["staff-token"].id),
            "email": auth_user_data["staff-token"].email,
            "role": "staff",
            "branch_id": auth_user_data["staff-token"].branch_id,
            "is_active": True,
        },
    ]
    branches_data = [{"id": str(uuid4()), "name": "Main Branch"}]
    return _FakeSupabaseClient(profiles_data=profiles_data, branches_data=branches_data)


@pytest.fixture()
def client(auth_user_data: Dict[str, FakeUser], fake_supabase: _FakeSupabaseClient) -> TestClient:
    class _AttrDict(dict):
        """Behave like a dict for RBAC checks and like an object for `user.id` access."""

        def __getattr__(self, name: str) -> Any:
            try:
                return self[name]
            except KeyError as e:
                raise AttributeError(name) from e

    # Dependency override to avoid real Supabase Auth validation.
    async def _fake_get_current_user(request: Request):
        auth_header = request.headers.get("authorization")
        if not auth_header:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

        token = parts[1]
        if token not in auth_user_data:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        u = auth_user_data[token]
        return _AttrDict(u.__dict__)

    app.dependency_overrides[get_current_user] = _fake_get_current_user

    # Mock service-layer calls (so tests don't touch Supabase).
    ProductService.list_products = staticmethod(
        lambda *args, **kwargs: [{"id": str(uuid4()), "name": "Example Product"}]
    )
    ProductService.get_product = staticmethod(
        lambda *args, **kwargs: {"id": str(uuid4()), "name": "Example Product"}
    )
    ProductService.create_product = staticmethod(
        lambda product: {"id": str(uuid4()), "name": product.name, "sku": product.sku}
    )
    ProductService.update_product = staticmethod(
        lambda _product_id, product: {"id": str(_product_id), "name": getattr(product, "name", "Updated")}
    )
    ProductService.delete_product = staticmethod(
        lambda _product_id: True
    )

    OrderService.list_orders = staticmethod(
        lambda *args, **kwargs: [
            {
                "id": uuid4(),
                "order_number": "ORD-001",
                "order_type": "purchase",
                "status": "draft",
                "branch_id": uuid4(),
                "supplier_id": None,
                "notes": None,
                "total_amount": Decimal("10.50"),
                "created_by": uuid4(),
                "created_at": _iso_now(),
                "updated_at": _iso_now(),
                "items": [],
            }
        ]
    )
    OrderService.get_order = staticmethod(
        lambda _order_id: {
            "id": uuid4(),
            "order_number": "ORD-002",
            "order_type": "purchase",
            "status": "confirmed",
            "branch_id": uuid4(),
            "supplier_id": None,
            "notes": "Test order",
            "total_amount": Decimal("99.99"),
            "created_by": uuid4(),
            "created_at": _iso_now(),
            "updated_at": _iso_now(),
            "items": [],
        }
    )
    OrderService.create_order = staticmethod(
        lambda order, _created_by: {
            "id": uuid4(),
            "order_number": order.order_number,
            "order_type": order.order_type.value,
            "status": order.status.value,
            "branch_id": order.branch_id,
            "supplier_id": order.supplier_id,
            "notes": order.notes,
            "total_amount": Decimal("0.00"),
            "created_by": _created_by,
            "created_at": _iso_now(),
            "updated_at": _iso_now(),
            "items": [],
        }
    )
    OrderService.update_order_status = staticmethod(
        lambda _order_id, new_status, _performed_by: {
            "id": _order_id,
            "order_number": "ORD-UPDATED",
            "order_type": "purchase",
            "status": new_status.value if hasattr(new_status, "value") else str(new_status),
            "branch_id": uuid4(),
            "supplier_id": None,
            "notes": None,
            "total_amount": Decimal("5.00"),
            "created_by": uuid4(),
            "created_at": _iso_now(),
            "updated_at": _iso_now(),
            "items": [],
        }
    )

    StockService.list_stock_levels = staticmethod(
        lambda *args, **kwargs: [{"id": str(uuid4()), "product_id": str(uuid4()), "branch_id": str(uuid4()), "quantity": 10}]
    )
    StockService.adjust_stock = staticmethod(
        lambda _adj, _performed_by: {"success": True}
    )
    StockService.transfer_stock = staticmethod(
        lambda _transfer, _performed_by: {"success": True}
    )

    DashboardService.get_summary = staticmethod(
        lambda: {
            "total_inventory_value": Decimal("1234.56"),
            "low_stock_alerts": [],
            "order_summary": {"pending": 2, "delivered": 5},
            "recent_transactions": [],
        }
    )

    # Fake Supabase clients for the two routers that directly query Supabase.
    users_router.get_admin_client = lambda: fake_supabase
    branches_router.get_admin_client = lambda: fake_supabase
    branches_router.get_supabase_client = lambda: fake_supabase

    with TestClient(app) as ac:
        yield ac

    app.dependency_overrides.pop(get_current_user, None)

