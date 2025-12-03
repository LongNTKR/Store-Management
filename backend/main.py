from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import products, customers, invoices, import_routes, search, dashboard

app = FastAPI(
    title="Store Management API",
    description="API for Store Management System",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Vite default port
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
