from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_root_and_health(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"]  # non-empty

    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_dashboard_summary_requires_auth(client):
    resp = client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 401


def test_dashboard_summary_forbidden_for_staff(client, auth_user_data):
    resp = client.get(
        "/api/v1/dashboard/summary",
        headers=_auth_header("staff-token"),
    )
    assert resp.status_code == 200  # Staff now allowed (remote pull updated to require_staff)


def test_dashboard_summary_happy_path(client):
    resp = client.get(
        "/api/v1/dashboard/summary",
        headers=_auth_header("manager-token"),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "total_inventory_value" in body
    assert "order_summary" in body
    assert body["order_summary"]["pending"] == 2


def test_users_list_unauthorized(client):
    resp = client.get("/api/v1/users/")
    assert resp.status_code == 401


def test_users_list_forbidden_for_manager(client):
    resp = client.get("/api/v1/users/", headers=_auth_header("manager-token"))
    assert resp.status_code == 403


def test_users_list_admin_happy_path(client):
    resp = client.get("/api/v1/users/", headers=_auth_header("admin-token"))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_users_update_role_validation(client):
    user_id = str(uuid4())
    resp = client.put(
        f"/api/v1/users/{user_id}/role",
        headers=_auth_header("admin-token"),
        json={"role": "not-a-real-role"},
    )
    assert resp.status_code == 400


def test_users_update_role_happy_path(client):
    user_id = str(uuid4())
    resp = client.put(
        f"/api/v1/users/{user_id}/role",
        headers=_auth_header("admin-token"),
        json={"role": "manager"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "manager"


def test_branches_list_unauthorized(client):
    resp = client.get("/api/v1/branches/")
    assert resp.status_code == 401


def test_branches_list_happy_path_manager(client):
    resp = client.get("/api/v1/branches/", headers=_auth_header("manager-token"))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_branches_create_forbidden_for_manager(client):
    resp = client.post(
        "/api/v1/branches/",
        headers=_auth_header("manager-token"),
        json={"name": "New Branch"},
    )
    assert resp.status_code == 403


def test_branches_create_admin_happy_path(client):
    resp = client.post(
        "/api/v1/branches/",
        headers=_auth_header("admin-token"),
        json={"name": "New Branch"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "New Branch"


def test_branches_update_admin_happy_path(client):
    branch_id = str(uuid4())
    resp = client.put(
        f"/api/v1/branches/{branch_id}",
        headers=_auth_header("admin-token"),
        json={"name": "Updated Branch"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Updated Branch"


def test_products_list_staff_happy_path(client):
    resp = client.get("/api/v1/products/", headers=_auth_header("staff-token"))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_products_create_forbidden_for_staff(client):
    resp = client.post(
        "/api/v1/products/",
        headers=_auth_header("staff-token"),
        json={"sku": "SKU-1", "name": "Widget"},
    )
    assert resp.status_code == 403


def test_products_create_admin_happy_path(client):
    resp = client.post(
        "/api/v1/products/",
        headers=_auth_header("manager-token"),
        json={"sku": "SKU-1", "name": "Widget"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["sku"] == "SKU-1"


def test_products_get_happy_path_staff(client):
    product_id = str(uuid4())
    resp = client.get(f"/api/v1/products/{product_id}", headers=_auth_header("staff-token"))
    assert resp.status_code == 200
    assert "name" in resp.json()


def test_products_update_forbidden_for_staff(client):
    product_id = str(uuid4())
    resp = client.put(
        f"/api/v1/products/{product_id}",
        headers=_auth_header("staff-token"),
        json={"name": "New Name"},
    )
    assert resp.status_code == 403


def test_products_delete_requires_admin(client):
    product_id = str(uuid4())
    resp = client.delete(f"/api/v1/products/{product_id}", headers=_auth_header("manager-token"))
    assert resp.status_code == 403


def test_products_delete_admin_happy_path(client):
    product_id = str(uuid4())
    resp = client.delete(f"/api/v1/products/{product_id}", headers=_auth_header("admin-token"))
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_orders_list_unauthorized(client):
    resp = client.get("/api/v1/orders/")
    assert resp.status_code == 401


def test_orders_list_happy_path_manager(client):
    resp = client.get("/api/v1/orders/", headers=_auth_header("manager-token"))
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    assert body[0]["order_number"] == "ORD-001"


def test_orders_get_happy_path_manager(client):
    order_id = str(uuid4())
    resp = client.get(f"/api/v1/orders/{order_id}", headers=_auth_header("manager-token"))
    assert resp.status_code == 200
    assert resp.json()["order_number"] == "ORD-002"


def test_orders_create_requires_manager(client):
    resp = client.post(
        "/api/v1/orders/",
        headers=_auth_header("staff-token"),
        json={
            "order_number": "ORD-NEW",
            "order_type": "purchase",
            "status": "draft",
            "branch_id": str(uuid4()),
            "supplier_id": None,
            "notes": None,
            "items": [
                {
                    "product_id": str(uuid4()),
                    "quantity": 2,
                    "unit_price": "12.50",
                }
            ],
        },
    )
    assert resp.status_code == 403


def test_orders_create_happy_path_manager(client):
    branch_id = uuid4()
    items = [
        {
            "product_id": str(uuid4()),
            "quantity": 2,
            "unit_price": "12.50",
        }
    ]
    resp = client.post(
        "/api/v1/orders/",
        headers=_auth_header("manager-token"),
        json={
            "order_number": "ORD-NEW",
            "order_type": "purchase",
            "status": "draft",
            "branch_id": str(branch_id),
            "supplier_id": None,
            "notes": None,
            "items": items,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["order_number"] == "ORD-NEW"


def test_orders_update_status_missing_status_returns_400(client):
    order_id = str(uuid4())
    resp = client.put(
        f"/api/v1/orders/{order_id}/status",
        headers=_auth_header("manager-token"),
        json={"notes": "no status"},
    )
    assert resp.status_code == 400


def test_orders_update_status_happy_path(client):
    order_id = str(uuid4())
    resp = client.put(
        f"/api/v1/orders/{order_id}/status",
        headers=_auth_header("admin-token"),
        json={"status": "delivered"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "delivered"


def test_stock_list_unauthorized(client):
    resp = client.get("/api/v1/stock/")
    assert resp.status_code == 401


def test_stock_list_staff_happy_path(client):
    resp = client.get("/api/v1/stock/", headers=_auth_header("staff-token"))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_stock_adjust_forbidden_when_staff_branch_mismatch(client, auth_user_data, monkeypatch):
    # Ensure mismatch triggers before hitting the service layer.
    staff_branch = auth_user_data["staff-token"].branch_id
    assert staff_branch is not None
    mismatch_branch = str(uuid4())

    called = {"count": 0}

    def _tracking_adjust(adj, performed_by):
        called["count"] += 1
        return {"success": True}

    monkeypatch.setattr("app.services.stock_service.StockService.adjust_stock", _tracking_adjust)

    payload = {
        "product_id": str(uuid4()),
        "branch_id": mismatch_branch,
        "quantity_change": 5,
        "txn_type": "adjustment_in",
        "notes": "should fail",
    }
    resp = client.post("/api/v1/stock/adjust", headers=_auth_header("staff-token"), json=payload)
    assert resp.status_code == 403
    assert called["count"] == 0


def test_stock_adjust_happy_path_for_staff(client, auth_user_data, monkeypatch):
    staff_branch = auth_user_data["staff-token"].branch_id
    payload = {
        "product_id": str(uuid4()),
        "branch_id": staff_branch,
        "quantity_change": 5,
        "txn_type": "adjustment_in",
        "notes": "ok",
    }
    resp = client.post("/api/v1/stock/adjust", headers=_auth_header("staff-token"), json=payload)
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_stock_transfer_requires_manager(client):
    resp = client.post(
        "/api/v1/stock/transfer",
        headers=_auth_header("staff-token"),
        json={
            "product_id": str(uuid4()),
            "from_branch_id": str(uuid4()),
            "to_branch_id": str(uuid4()),
            "quantity": 3,
            "notes": "nope",
        },
    )
    assert resp.status_code == 403


def test_stock_transfer_happy_path_manager(client):
    resp = client.post(
        "/api/v1/stock/transfer",
        headers=_auth_header("manager-token"),
        json={
            "product_id": str(uuid4()),
            "from_branch_id": str(uuid4()),
            "to_branch_id": str(uuid4()),
            "quantity": 3,
            "notes": "ok",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True

