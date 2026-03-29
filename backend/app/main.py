from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# 1. Direct Module Imports (Bypasses __init__.py bottlenecks)
from app.routers.dashboard import router as dashboard_router
from app.routers.products import router as products_router
from app.routers.stock import router as stock_router
from app.routers.orders import router as orders_router
from app.routers.branches import router as branches_router
from app.routers.users import router as users_router
from app.routers.notifications import router as notifications_router

# 2. Setup Logging for Vercel visibility
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.info("IMS API: Starting FastAPI initialization...")

app = FastAPI(
    title="Inventory Management System API",
    description="FastAPI backend for multi-tenant, role-based IMS",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    # Allow ANY Vercel subdomain and localhost
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global Exception Handler to ensure CORS headers are sent on 500 errors
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "message": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.get("/")
async def root():
    return {"message": "IMS API is live!", "version": "1.0.0"}

@app.get("/api/v1/health")
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(products_router, prefix="/api/v1/products", tags=["Products"])
app.include_router(stock_router, prefix="/api/v1/stock", tags=["Stock"])
app.include_router(orders_router, prefix="/api/v1/orders", tags=["Orders"])
app.include_router(branches_router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(notifications_router, prefix="/api/v1/notifications", tags=["Notifications"])

logger.info("IMS API: All routers mounted successfully.")