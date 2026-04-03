# IMS Enterprise Backend Upgrade — Walkthrough

## Summary

All 4 backend tasks have been implemented and verified. The test suite passes **34/34** with zero regressions.

---

## Changes Made

### BE-TASK-01 — Order Lifecycle & Stock Allocation

| File | Change |
|------|--------|
| [models/order.py](file:///w:/level%203/Software/System/backend/app/models/order.py) | Added `PARTIALLY_DELIVERED` and `RETURNED` to [OrderStatus](file:///w:/level%203/Software/System/backend/app/models/order.py#12-20) enum |
| [services/order_service.py](file:///w:/level%203/Software/System/backend/app/services/order_service.py) | On `CONFIRMED` → calls `adjust_allocated_quantity` RPC (reserves stock). On `DELIVERED` → releases allocation and adds to physical stock for PURCHASE orders; deducts from physical stock for SALE orders |

### BE-TASK-02 — Partial Fulfillment Endpoint

| File | Change |
|------|--------|
| [models/order.py](file:///w:/level%203/Software/System/backend/app/models/order.py) | Added [ReceivedItem](file:///w:/level%203/Software/System/backend/app/models/order.py#50-54) and [ReceiveShipmentRequest](file:///w:/level%203/Software/System/backend/app/models/order.py#56-59) Pydantic models |
| [services/order_service.py](file:///w:/level%203/Software/System/backend/app/services/order_service.py) | Added [receive_shipment()](file:///w:/level%203/Software/System/backend/app/routers/orders.py#94-113) — validates state, adjusts physical stock and releases allocation per item, auto-sets `partially_delivered` or `delivered` |
| [routers/orders.py](file:///w:/level%203/Software/System/backend/app/routers/orders.py) | Added `POST /api/v1/orders/{id}/receive` endpoint (manager+) |

### BE-TASK-03 — Staff Adjustment Approval Workflow

| File | Change |
|------|--------|
| [models/approval.py](file:///w:/level%203/Software/System/backend/app/models/approval.py) | **NEW** — [PendingApprovalResponse](file:///w:/level%203/Software/System/backend/app/models/approval.py#14-30) model |
| [models/stock.py](file:///w:/level%203/Software/System/backend/app/models/stock.py) | Added `unit_cost: Optional[Decimal]` to [StockAdjustmentRequest](file:///w:/level%203/Software/System/backend/app/models/stock.py#30-39) for threshold evaluation |
| [routers/stock.py](file:///w:/level%203/Software/System/backend/app/routers/stock.py) | Intercepts staff negative adjustments: if `abs(qty) × unit_cost > $50` → HTTP 202 + [pending_approvals](file:///w:/level%203/Software/System/backend/app/services/stock_service.py#122-131) record instead of direct RPC |
| [services/stock_service.py](file:///w:/level%203/Software/System/backend/app/services/stock_service.py) | Added [create_pending_approval()](file:///w:/level%203/Software/System/backend/app/services/stock_service.py#91-121), [list_pending_approvals()](file:///w:/level%203/Software/System/backend/app/services/stock_service.py#122-131), [resolve_approval()](file:///w:/level%203/Software/System/backend/app/services/stock_service.py#132-182) (approve executes RPC; reject logs rejection) |
| [routers/approvals.py](file:///w:/level%203/Software/System/backend/app/routers/approvals.py) | **NEW** — `GET /api/v1/approvals/`, `POST /api/v1/approvals/{id}/approve`, `POST /api/v1/approvals/{id}/reject` |
| [main.py](file:///w:/level%203/Software/System/backend/app/main.py) | Registered `approvals_router` under `/api/v1/approvals` |

### BE-TASK-04 — Financial Valuation Service (WAC)

| File | Change |
|------|--------|
| [services/valuation_service.py](file:///w:/level%203/Software/System/backend/app/services/valuation_service.py) | **NEW** — [ValuationService](file:///w:/level%203/Software/System/backend/app/services/valuation_service.py#10-164) with [calculate_inventory_value()](file:///w:/level%203/Software/System/backend/app/services/valuation_service.py#59-113) (WAC × on-hand qty per product) and [calculate_cogs()](file:///w:/level%203/Software/System/backend/app/services/valuation_service.py#114-164) (WAC × units sold in date range) |
| [routers/stock.py](file:///w:/level%203/Software/System/backend/app/routers/stock.py) | Added `GET /api/v1/stock/valuation` and `GET /api/v1/stock/cogs?from_date=&to_date=` (manager+) |

---

## DB Prerequisites

These backend features require matching DB changes (DB tasks) to be in place before the API calls succeed in production:

| DB-TASK | Required for |
|---------|-------------|
| `allocated_quantity` column on [stock_levels](file:///w:/level%203/Software/System/backend/app/services/stock_service.py#14-34) + `adjust_allocated_quantity` RPC | BE-TASK-01 CONFIRMED/DELIVERED, BE-TASK-02 receive |
| [pending_approvals](file:///w:/level%203/Software/System/backend/app/services/stock_service.py#122-131) table | BE-TASK-03 approval workflow |
| `unit_cost` column on `stock_transactions` | BE-TASK-04 WAC calculation |
| [order_status](file:///w:/level%203/Software/System/backend/app/services/order_service.py#190-239) ENUM updated with `partially_delivered`, `returned` | BE-TASK-01/02 status transitions |

---

## Test Results

```
34 passed in 0.57s
```

All pre-existing test failures from the remote pull (signature changes + [get_user_client](file:///w:/level%203/Software/System/backend/app/db/supabase.py#19-27) in branches) were also corrected in [conftest.py](file:///w:/level%203/Software/System/backend/tests/conftest.py) and [test_endpoints.py](file:///w:/level%203/Software/System/backend/tests/test_endpoints.py).

## New API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/orders/{id}/receive` | Receive shipment (partial or full) |
| `GET` | `/api/v1/approvals/` | List pending staff adjustments |
| `POST` | `/api/v1/approvals/{id}/approve` | Approve + execute stock adjustment |
| `POST` | `/api/v1/approvals/{id}/reject` | Reject pending adjustment |
| `GET` | `/api/v1/stock/valuation` | Inventory value (WAC) |
| `GET` | `/api/v1/stock/cogs` | COGS for date range (WAC) |
