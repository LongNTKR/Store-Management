from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Invoice(BaseModel):
    id: int
    invoice_number: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    subtotal: float
    discount: float = 0
    tax: float = 0
    total: float
    status: str = "pending"
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Statistics(BaseModel):
    total_invoices: int
    total_revenue: float
    paid_invoices: int
    pending_invoices: int
    cancelled_invoices: int
    pending_revenue: float
    average_order_value: float
