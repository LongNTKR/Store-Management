"""Dashboard schema for unified API response."""

from typing import List, Dict, Any
from pydantic import BaseModel

from .product import Product
from .customer import Customer
from .invoice import Invoice


class DashboardStats(BaseModel):
    """Statistics for dashboard."""
    total_products: int
    total_customers: int

    # Invoice counts by status
    total_invoices: int
    paid_invoices: int
    pending_invoices: int
    cancelled_invoices: int
    processing_invoices: int = 0

    # Export status breakdown
    exported_invoices: int = 0
    non_exported_invoices: int = 0

    # Pending invoice export breakdown (pending only)
    pending_exported_invoices: int = 0
    pending_non_exported_invoices: int = 0

    # Revenue (simplified - no breakdown)
    total_revenue: float
    pending_revenue: float

    average_order_value: float


class DashboardData(BaseModel):
    """Unified dashboard data response."""
    stats: DashboardStats
    recent_products: List[Product]
    recent_customers: List[Customer]
    recent_invoices: List[Invoice]
