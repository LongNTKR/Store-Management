from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime


class InvoiceItemCreate(BaseModel):
    """Schema for creating invoice items"""
    product_id: int = Field(..., description="ID of the product")
    quantity: float = Field(..., gt=0, description="Quantity must be greater than 0 (supports decimals)")


class InvoiceCreate(BaseModel):
    """Schema for creating a new invoice"""
    items: List[InvoiceItemCreate] = Field(
        default_factory=list,
        description="Invoice items. Required unless status is processing."
    )
    customer_id: Optional[int] = Field(None, description="ID of registered customer (if applicable)")
    customer_name: Optional[str] = Field(None, description="Customer name (for walk-in customers)")
    customer_phone: Optional[str] = Field(None, description="Customer phone number")
    customer_address: Optional[str] = Field(None, description="Customer address")
    discount: float = Field(0, ge=0, description="Discount amount (must be >= 0)")
    tax: float = Field(0, ge=0, description="Tax amount (must be >= 0)")
    payment_method: Optional[str] = Field(None, description="Payment method: cash, transfer, card")
    notes: Optional[str] = Field(None, description="Additional notes")
    status: str = Field(
        "pending",
        description="Invoice status: pending (chờ thanh toán), paid, cancelled, processing"
    )

    @model_validator(mode="after")
    def validate_items_for_status(self):
        if self.status != "processing" and len(self.items) == 0:
            raise ValueError("Hóa đơn cần ít nhất 1 sản phẩm (trừ khi lưu ở trạng thái chờ xử lý).")
        return self


class InvoiceUpdate(BaseModel):
    """Schema for updating an existing invoice (only allowed when pending)."""
    items: List[InvoiceItemCreate] = Field(
        default_factory=list,
        description="Invoice must have at least one item when finalizing."
    )
    customer_id: Optional[int] = Field(None, description="ID of registered customer (if applicable)")
    customer_name: Optional[str] = Field(None, description="Customer name (for walk-in customers)")
    customer_phone: Optional[str] = Field(None, description="Customer phone number")
    customer_address: Optional[str] = Field(None, description="Customer address")
    discount: float = Field(0, ge=0, description="Discount amount (must be >= 0)")
    tax: float = Field(0, ge=0, description="Tax amount (must be >= 0)")
    payment_method: Optional[str] = Field(None, description="Payment method: cash, transfer, card")
    notes: Optional[str] = Field(None, description="Additional notes")
    status: Optional[str] = Field(
        None,
        description="New status when finishing a processing invoice (pending or paid). Leave empty to keep current status."
    )

    @model_validator(mode="after")
    def validate_items_for_update(self):
        if self.status and self.status != "processing" and len(self.items) == 0:
            raise ValueError("Cần ít nhất một sản phẩm trước khi đổi trạng thái hóa đơn.")
        return self


class InvoiceStatusUpdate(BaseModel):
    """Schema for updating invoice status"""
    status: str = Field(..., description="New status: pending, paid, cancelled (không áp dụng cho hóa đơn chờ xử lý)")


class InvoiceItem(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_price: float
    quantity: float  # Changed to float to support decimal quantities
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
    # Payment tracking
    paid_amount: float = 0
    remaining_amount: float
    payment_status: Optional[str] = None  # 'unpaid', 'partial', 'paid' (computed from model)
    # Returns tracking
    has_returns: Optional[bool] = None  # Computed from model
    total_returned_amount: Optional[float] = None  # Computed from model
    net_amount: Optional[float] = None  # Computed from model
    # Status
    status: str = "pending"
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    exported_at: Optional[datetime] = None  # Track when invoice was first exported to PDF or Excel
    items: List[InvoiceItem] = []

    class Config:
        from_attributes = True


class Statistics(BaseModel):
    # Invoice counts by status
    total_invoices: int
    paid_invoices: int
    pending_invoices: int
    cancelled_invoices: int
    processing_invoices: int = 0

    # Export status breakdown (paid + pending only, excluding cancelled/processing)
    exported_invoices: int = 0  # Overall count of invoices with exported_at set
    non_exported_invoices: int = 0  # Overall count of invoices without exported_at

    # Pending invoice export breakdown (pending only)
    pending_exported_invoices: int = 0  # Count of pending invoices that are exported
    pending_non_exported_invoices: int = 0  # Count of pending invoices that are not exported

    # Revenue totals (simplified - no breakdown by export status)
    total_revenue: float  # Sum of paid + pending invoice totals
    collected_amount: float = 0  # Total amount collected (sum of paid_amount)
    outstanding_debt: float = 0  # Total amount outstanding (sum of remaining_amount)

    # Legacy fields (keep for backward compatibility)
    pending_revenue: float  # Legacy: revenue from pending invoices only
    average_order_value: float
    total_debt: float = 0  # Legacy alias for outstanding_debt

    # Debt tracking
    invoices_with_debt: int = 0  # Count of invoices with remaining_amount > 0
    customers_with_debt: int = 0  # Count of distinct customers with debt
