"""Dashboard API endpoints for unified data fetching."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.dependencies import get_db
from schemas.dashboard import DashboardData, DashboardStats
from services import ProductService, CustomerService, InvoiceService
from config import Config

router = APIRouter()


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Get all dashboard data in a single API call.

    This endpoint combines multiple queries to reduce network overhead:
    - Statistics (products, customers, invoices, revenue)
    - Recent products (last 10)
    - Recent customers (last 10)
    - Recent invoices (last 5)

    Returns unified response to eliminate waterfall requests.
    """
    # Initialize services
    product_service = ProductService(db, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)
    customer_service = CustomerService(db)
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)

    # Fetch data in parallel (database level)
    products = product_service.get_all_products()
    customers = customer_service.get_all_customers()
    invoices, _, _, _ = invoice_service.search_invoices(limit=5, offset=0)
    invoice_stats = invoice_service.get_statistics()

    # Build stats
    stats = DashboardStats(
        total_products=len([p for p in products if p.is_active]),
        total_customers=len([c for c in customers if c.is_active]),
        total_invoices=invoice_stats.get('total_invoices', 0),
        paid_invoices=invoice_stats.get('paid_invoices', 0),
        pending_invoices=invoice_stats.get('pending_invoices', 0),
        cancelled_invoices=invoice_stats.get('cancelled_invoices', 0),
        total_revenue=invoice_stats.get('total_revenue', 0),
        pending_revenue=invoice_stats.get('pending_revenue', 0),
        average_order_value=invoice_stats.get('average_order_value', 0),
    )

    # Return recent items (limit in Python for now, can optimize later)
    return DashboardData(
        stats=stats,
        recent_products=sorted(
            [p for p in products if p.is_active],
            key=lambda x: x.updated_at or x.created_at,
            reverse=True
        )[:10],
        recent_customers=sorted(
            [c for c in customers if c.is_active],
            key=lambda x: x.updated_at or x.created_at,
            reverse=True
        )[:10],
        recent_invoices=sorted(
            invoices,
            key=lambda x: x.created_at,
            reverse=True
        )[:3],
    )
