import re
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
ALLOWED_ORIGIN_REGEX = re.compile(r"https://.*\.vercel\.app|http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:5173",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global Exception Handler — validates origin and hides internal details
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"{type(exc).__name__}: {str(exc)}"
    logger.error(f"Global Error: {error_msg}", exc_info=True)

    origin = request.headers.get("Origin") or ""
    headers = {}
    if origin and ALLOWED_ORIGIN_REGEX.fullmatch(origin):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "debug_info": error_msg},
        headers=headers
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