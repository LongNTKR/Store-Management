from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InvoiceItemCreate(BaseModel):
    """Schema for creating invoice items"""
    product_id: int = Field(..., description="ID of the product")
    quantity: int = Field(..., gt=0, description="Quantity must be greater than 0")


class InvoiceCreate(BaseModel):
    """Schema for creating a new invoice"""
    items: List[InvoiceItemCreate] = Field(..., min_length=1, description="Invoice must have at least one item")
    customer_id: Optional[int] = Field(None, description="ID of registered customer (if applicable)")
    customer_name: Optional[str] = Field(None, description="Customer name (for walk-in customers)")
    customer_phone: Optional[str] = Field(None, description="Customer phone number")
    customer_address: Optional[str] = Field(None, description="Customer address")
    discount: float = Field(0, ge=0, description="Discount amount (must be >= 0)")
    tax: float = Field(0, ge=0, description="Tax amount (must be >= 0)")
    payment_method: Optional[str] = Field(None, description="Payment method: cash, transfer, card")
    notes: Optional[str] = Field(None, description="Additional notes")
    status: str = Field("pending", description="Invoice status: pending, paid, cancelled")


class InvoiceUpdate(BaseModel):
    """Schema for updating an existing invoice (only allowed when pending)."""
    items: List[InvoiceItemCreate] = Field(..., min_length=1, description="Invoice must have at least one item")
    customer_id: Optional[int] = Field(None, description="ID of registered customer (if applicable)")
    customer_name: Optional[str] = Field(None, description="Customer name (for walk-in customers)")
    customer_phone: Optional[str] = Field(None, description="Customer phone number")
    customer_address: Optional[str] = Field(None, description="Customer address")
    discount: float = Field(0, ge=0, description="Discount amount (must be >= 0)")
    tax: float = Field(0, ge=0, description="Tax amount (must be >= 0)")
    payment_method: Optional[str] = Field(None, description="Payment method: cash, transfer, card")
    notes: Optional[str] = Field(None, description="Additional notes")


class InvoiceStatusUpdate(BaseModel):
    """Schema for updating invoice status"""
    status: str = Field(..., description="New status: pending, paid, cancelled")


class InvoiceItem(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_price: float
    quantity: int
    unit: str
    subtotal: float

    class Config:
        from_attributes = True


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
    items: List[InvoiceItem] = []

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
