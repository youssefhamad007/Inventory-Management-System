from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import products, stock, orders, branches, users, dashboard, notifications

app = FastAPI(
    title="Inventory Management System API",
    description="FastAPI backend for multi-tenant, role-based IMS",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "IMS API is live!", "version": "1.0.0"}

# Health checks at multiple levels for environment confidence
@app.get("/api/v1/health")
async def health_check_v1():
    return {"status": "healthy", "layer": "v1"}

@app.get("/health")
async def health_check_root():
    return {"status": "healthy", "layer": "root"}

# Flat API Routing for Vercel Resilience
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"], strict_slashes=False)
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"], strict_slashes=False)
app.include_router(stock.router, prefix="/api/v1/stock", tags=["Stock"], strict_slashes=False)
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Orders"], strict_slashes=False)
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"], strict_slashes=False)
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"], strict_slashes=False)
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"], strict_slashes=False)

# Optional: Also support without /api prefix for local testing and resilience
app.include_router(dashboard.router, prefix="/v1/dashboard", tags=["Dashboard"], strict_slashes=False)
app.include_router(products.router, prefix="/v1/products", tags=["Products"], strict_slashes=False)
app.include_router(stock.router, prefix="/v1/stock", tags=["Stock"], strict_slashes=False)
app.include_router(orders.router, prefix="/v1/orders", tags=["Orders"], strict_slashes=False)
app.include_router(branches.router, prefix="/v1/branches", tags=["Branches"], strict_slashes=False)
app.include_router(users.router, prefix="/v1/users", tags=["Users"], strict_slashes=False)
app.include_router(notifications.router, prefix="/v1/notifications", tags=["Notifications"], strict_slashes=False)
