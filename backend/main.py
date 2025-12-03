import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from api.routes import products, customers, invoices, import_routes, search, dashboard
from jobs import cleanup_old_deletions
from config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup background scheduler for auto-cleanup
scheduler = BackgroundScheduler()
scheduler.add_job(
    cleanup_old_deletions,
    'cron',
    hour=2,
    minute=0,
    name='cleanup_old_deletions',
    id='cleanup_old_deletions'
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifespan: startup and shutdown events."""
    # Startup
    if not scheduler.running:
        scheduler.start()
        logger.info("Background scheduler started - auto-cleanup job scheduled for 2 AM daily")

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler shutdown")


app = FastAPI(
    title="Store Management API",
    description="API for Store Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(products.router, prefix="/api", tags=["Products"])
app.include_router(customers.router, prefix="/api", tags=["Customers"])
app.include_router(invoices.router, prefix="/api", tags=["Invoices"])
app.include_router(import_routes.router, prefix="/api", tags=["Import"])
app.include_router(search.router, prefix="/api", tags=["Search"])

# Serve product images
app.mount(
    "/images/products",
    StaticFiles(directory=Config.IMAGE_DIR),
    name="product-images"
)


@app.get("/")
async def root():
    return {
        "message": "Store Management API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
