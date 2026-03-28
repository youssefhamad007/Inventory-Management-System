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

# Unified V1 Router
v1_router = APIRouter(prefix="/api/v1")

v1_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
v1_router.include_router(products.router, prefix="/products", tags=["Products"])
v1_router.include_router(stock.router, prefix="/stock", tags=["Stock"])
v1_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
v1_router.include_router(branches.router, prefix="/branches", tags=["Branches"])
v1_router.include_router(users.router, prefix="/users", tags=["Users"])
v1_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

app.include_router(v1_router)

# Also support without /api prefix just in case of rewrite logic variations
app.include_router(v1_router, prefix="/alt") # Extra prefix for debugging if needed
