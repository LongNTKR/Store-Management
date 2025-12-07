"""Pydantic schemas for payment operations."""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict
from datetime import datetime


class PaymentAllocationResponse(BaseModel):
    """Payment allocation response schema."""
    id: int
    payment_id: int
    invoice_id: int
    invoice_number: str  # Denormalized for convenience
    payment_number: str  # Added for invoice details view
    payment_method: Optional[str] = None  # Added for invoice details view
    amount: float
    allocation_date: datetime
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    """Schema for creating a payment."""
    customer_id: int = Field(..., description="Customer ID")
    amount: float = Field(..., gt=0, description="Payment amount (must be > 0)")
    payment_method: str = Field(..., description="Payment method: cash, transfer, card")
    invoice_ids: Optional[List[int]] = Field(
        None,
        description="Optional: specific invoices to pay (for semi-auto FIFO)"
    )
    manual_allocations: Optional[Dict[int, float]] = Field(
        None,
        description="Optional: manual allocation (invoice_id -> amount)"
    )
    notes: Optional[str] = Field(None, description="Payment notes")
    payment_date: Optional[datetime] = Field(None, description="Payment date (defaults to now)")
    created_by: Optional[str] = Field(None, description="User recording payment")

    @model_validator(mode="after")
    def validate_allocations(self):
        """Validate manual allocations don't exceed payment amount."""
        if self.manual_allocations:
            total_allocated = sum(self.manual_allocations.values())
            if total_allocated > self.amount:
                raise ValueError(
                    f"Tổng số tiền phân bổ ({total_allocated:,.0f}) vượt quá "
                    f"số tiền thanh toán ({self.amount:,.0f})"
                )
        return self


class PaymentResponse(BaseModel):
    """Payment response schema."""
    id: int
    payment_number: str
    customer_id: int
    customer_name: str  # Denormalized from customer relationship
    amount: float
    payment_method: str
    payment_date: datetime
    notes: Optional[str] = None
    created_at: datetime
    created_by: Optional[str] = None
    allocations: List[PaymentAllocationResponse] = []

    @staticmethod
    def from_orm_with_customer(payment):
        """
        Helper to create response with denormalized customer name.

        Args:
            payment: Payment ORM object with customer relationship loaded

        Returns:
            PaymentResponse instance
        """
        allocations = []
        for alloc in payment.allocations:
            allocations.append(PaymentAllocationResponse(
                id=alloc.id,
                payment_id=alloc.payment_id,
                invoice_id=alloc.invoice_id,
                invoice_number=alloc.invoice.invoice_number if alloc.invoice else "",
                payment_number=payment.payment_number,
                payment_method=payment.payment_method,
                amount=alloc.amount,
                allocation_date=alloc.allocation_date,
                notes=alloc.notes
            ))

        return PaymentResponse(
            id=payment.id,
            payment_number=payment.payment_number,
            customer_id=payment.customer_id,
            customer_name=payment.customer.name if payment.customer else "",
            amount=payment.amount,
            payment_method=payment.payment_method,
            payment_date=payment.payment_date,
            notes=payment.notes,
            created_at=payment.created_at,
            created_by=payment.created_by,
            allocations=allocations
        )

    class Config:
        from_attributes = True


class DebtSummaryResponse(BaseModel):
    """Debt summary response schema."""
    total_debt: float
    total_revenue: float
    total_invoices: int
    unpaid_invoices: int
    partially_paid_invoices: int
    overdue_debt: float
    overdue_invoices: int
    invoices: List  # List of InvoiceResponse (imported from invoice schema)

    class Config:
        from_attributes = True
