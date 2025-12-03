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
    total_invoices: int
    paid_invoices: int
    pending_invoices: int
    cancelled_invoices: int
    total_revenue: float
    pending_revenue: float
    average_order_value: float


class DashboardData(BaseModel):
    """Unified dashboard data response."""
    stats: DashboardStats
    recent_products: List[Product]
    recent_customers: List[Customer]
    recent_invoices: List[Invoice]
