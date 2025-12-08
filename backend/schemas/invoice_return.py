"""Pydantic schemas for invoice returns."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class InvoiceReturnItemCreate(BaseModel):
    """Schema for creating a return item."""
    invoice_item_id: int = Field(..., description="ID of the invoice item being returned")
    quantity_returned: float = Field(..., gt=0, description="Quantity to return (must be > 0)")
    restore_inventory: bool = Field(True, description="Whether to restore stock quantity")

    @field_validator('quantity_returned')
    @classmethod
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError("Số lượng hoàn trả phải lớn hơn 0")
        return v


class InvoiceReturnCreate(BaseModel):
    """Schema for creating a new invoice return."""
    return_items: List[InvoiceReturnItemCreate] = Field(
        ...,
        min_length=1,
        description="List of items to return (at least 1 required)"
    )
    reason: str = Field(..., min_length=3, description="Reason for return (min 3 characters)")
    refund_amount: Optional[float] = Field(
        None,
        ge=0,
        description="Refund amount (null = auto-calculate, 0 = no refund)"
    )
    create_refund_payment: bool = Field(True, description="Whether to create a refund payment record")
    payment_method: Optional[str] = Field("cash", description="Payment method for refund: cash, transfer, card")
    notes: Optional[str] = Field(None, description="Additional notes")
    created_by: Optional[str] = Field(None, description="Username/staff who processed the return")

    @field_validator('reason')
    @classmethod
    def validate_reason(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Lý do hoàn trả phải có ít nhất 3 ký tự")
        return v.strip()


class InvoiceReturnItemResponse(BaseModel):
    """Schema for invoice return item response."""
    id: int
    invoice_item_id: int
    product_id: Optional[int] = None
    product_name: str
    product_price: float
    unit: str
    quantity_returned: float
    subtotal: float
    restore_inventory: bool

    class Config:
        from_attributes = True


class InvoiceReturnResponse(BaseModel):
    """Schema for invoice return response."""
    id: int
    return_number: str
    invoice_id: int
    invoice_number: Optional[str] = None  # Will be populated from invoice relationship
    refund_payment_id: Optional[int] = None
    reason: str
    refund_amount: float
    is_full_return: bool
    created_at: datetime
    created_by: Optional[str] = None
    notes: Optional[str] = None
    exported_at: Optional[datetime] = None  # First export timestamp (PDF)
    return_items: List[InvoiceReturnItemResponse] = []

    class Config:
        from_attributes = True


class AvailableReturnQuantity(BaseModel):
    """Schema for available return quantity helper."""
    invoice_item_id: int
    product_id: Optional[int] = None
    product_name: str
    original_quantity: float
    already_returned: float
    available_for_return: float
    unit: str
    allows_decimal: bool = True
    product_price: float

    class Config:
        from_attributes = True
