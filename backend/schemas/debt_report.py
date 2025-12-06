"""Pydantic schemas for debt report operations."""

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class AgingBucketInvoice(BaseModel):
    """Minimal invoice info for aging bucket."""
    id: int
    invoice_number: str
    created_at: datetime
    total: float
    paid_amount: float
    remaining_amount: float

    class Config:
        from_attributes = True


class AgingBucket(BaseModel):
    """Aging bucket schema."""
    bucket_label: str  # e.g., "0-30 ngày", "30-60 ngày"
    bucket_key: str  # e.g., "0-30", "30-60", "60-90", "90+"
    invoice_count: int
    total_amount: float
    invoices: List[AgingBucketInvoice] = []

    class Config:
        from_attributes = True


class AgingAnalysisResponse(BaseModel):
    """Aging analysis response schema."""
    customer_id: Optional[int] = None  # None means all customers
    customer_name: Optional[str] = None
    buckets: List[AgingBucket]
    total_debt: float
    total_invoices: int
    generated_at: datetime

    class Config:
        from_attributes = True
