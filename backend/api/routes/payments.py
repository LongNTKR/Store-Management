"""Payment API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from api.dependencies import get_db
from schemas.payment import (
    PaymentCreate, PaymentResponse, DebtSummaryResponse, PaymentAllocationResponse
)
from schemas.invoice import Invoice as InvoiceSchema
from services.payment_service import PaymentService
from config import Config

router = APIRouter()


def _parse_datetime(date_str: str, end_of_day: bool = False) -> datetime:
    """Parse date string to datetime."""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        if end_of_day:
            dt = dt.replace(hour=23, minute=59, second=59)
        return dt
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {date_str}")


@router.post("/payments", response_model=PaymentResponse, tags=["payments"])
async def record_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db)
):
    """
    Record a new payment with FIFO or manual allocation.

    **FIFO Auto Mode** (invoice_ids=null, manual_allocations=null):
    ```json
    {
      "customer_id": 1,
      "amount": 9500,
      "payment_method": "cash",
      "notes": "Thanh toán tiền mặt"
    }
    ```
    → Hệ thống tự động phân bổ theo thứ tự hóa đơn cũ → mới

    **Semi-Auto Mode** (invoice_ids=[...], manual_allocations=null):
    ```json
    {
      "customer_id": 1,
      "amount": 5000,
      "payment_method": "transfer",
      "invoice_ids": [1, 3, 5]
    }
    ```
    → FIFO chỉ áp dụng cho các hóa đơn đã chọn

    **Manual Mode** (manual_allocations={...}):
    ```json
    {
      "customer_id": 1,
      "amount": 9500,
      "payment_method": "card",
      "manual_allocations": {
        "1": 1000,
        "2": 2000,
        "3": 6500
      }
    }
    ```
    → User chỉ định số tiền cho từng hóa đơn
    """
    service = PaymentService(db, Config.INVOICE_DIR)

    try:
        payment = service.record_payment(
            customer_id=payment_data.customer_id,
            amount=payment_data.amount,
            payment_method=payment_data.payment_method,
            invoice_ids=payment_data.invoice_ids,
            manual_allocations=payment_data.manual_allocations,
            notes=payment_data.notes,
            payment_date=payment_data.payment_date,
            created_by=payment_data.created_by
        )

        return PaymentResponse.from_orm_with_customer(payment)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/payments/{payment_id}", response_model=PaymentResponse, tags=["payments"])
async def get_payment(
    payment_id: int,
    db: Session = Depends(get_db)
):
    """
    Get payment details by ID including all allocations.
    """
    service = PaymentService(db, Config.INVOICE_DIR)
    payment = service.get_payment(payment_id)

    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thanh toán")

    return PaymentResponse.from_orm_with_customer(payment)


@router.get("/payments", response_model=List[PaymentResponse], tags=["payments"])
async def search_payments(
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    start_date: Optional[str] = Query(None, description="Filter by payment_date >= start_date (ISO format)"),
    end_date: Optional[str] = Query(None, description="Filter by payment_date <= end_date (ISO format)"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """
    Search payments with filters.

    Example:
    ```
    GET /api/payments?customer_id=1&start_date=2025-01-01&limit=20
    ```
    """
    service = PaymentService(db, Config.INVOICE_DIR)

    # Parse dates
    start_dt = _parse_datetime(start_date) if start_date else None
    end_dt = _parse_datetime(end_date, end_of_day=True) if end_date else None

    payments, total = service.get_payment_history(
        customer_id=customer_id,
        start_date=start_dt,
        end_date=end_dt,
        limit=limit,
        offset=offset
    )

    return [PaymentResponse.from_orm_with_customer(p) for p in payments]


@router.get("/customers/{customer_id}/debt", response_model=DebtSummaryResponse, tags=["payments"])
async def get_customer_debt(
    customer_id: int,
    db: Session = Depends(get_db)
):
    """
    Get comprehensive debt summary for a customer.

    Returns:
    - Total outstanding debt
    - Count of unpaid/partially paid invoices
    - Overdue debt (>30 days)
    - List of all invoices with remaining balance
    """
    service = PaymentService(db, Config.INVOICE_DIR)

    try:
        summary = service.get_customer_debt_summary(customer_id)

        # Convert invoices to Pydantic schemas
        invoices_data = []
        for inv in summary['invoices']:
            invoices_data.append(InvoiceSchema(
                id=inv.id,
                invoice_number=inv.invoice_number,
                customer_id=inv.customer_id,
                customer_name=inv.customer_name,
                customer_phone=inv.customer_phone,
                customer_address=inv.customer_address,
                subtotal=inv.subtotal,
                discount=inv.discount,
                tax=inv.tax,
                total=inv.total,
                paid_amount=inv.paid_amount,
                remaining_amount=inv.remaining_amount,
                payment_status=inv.payment_status,
                status=inv.status,
                payment_method=inv.payment_method,
                notes=inv.notes,
                created_at=inv.created_at,
                updated_at=inv.updated_at,
                items=[]  # Don't need items for debt summary
            ))

        return DebtSummaryResponse(
            total_debt=summary['total_debt'],
            total_invoices=summary['total_invoices'],
            unpaid_invoices=summary['unpaid_invoices'],
            partially_paid_invoices=summary['partially_paid_invoices'],
            overdue_debt=summary['overdue_debt'],
            overdue_invoices=summary['overdue_invoices'],
            invoices=invoices_data
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/payments/{payment_id}/reverse", tags=["payments"])
async def reverse_payment(
    payment_id: int,
    reason: str = Query(..., description="Reason for reversing payment"),
    db: Session = Depends(get_db)
):
    """
    Reverse a payment (for corrections).

    This will:
    - Reverse all allocations (update invoice paid_amount and remaining_amount)
    - Update invoice status if needed
    - Mark payment as reversed (does NOT delete for audit trail)

    Example:
    ```
    DELETE /api/payments/123/reverse?reason=Nhập nhầm số tiền
    ```
    """
    service = PaymentService(db, Config.INVOICE_DIR)

    try:
        service.reverse_payment(payment_id, reason)
        return {"message": "Đã hoàn trả thanh toán thành công"}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices/{invoice_id}/payments", response_model=List[PaymentAllocationResponse], tags=["payments"])
async def get_invoice_payments(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all payment allocations for a specific invoice.

    Returns list of payment allocations showing:
    - Payment number
    - Amount allocated to this invoice
    - Allocation date
    """
    service = PaymentService(db, Config.INVOICE_DIR)
    allocations = service.get_invoice_payment_allocations(invoice_id)

    result = []
    for alloc in allocations:
        result.append(PaymentAllocationResponse(
            id=alloc.id,
            payment_id=alloc.payment_id,
            invoice_id=alloc.invoice_id,
            invoice_number=alloc.invoice.invoice_number if alloc.invoice else "",
            amount=alloc.amount,
            allocation_date=alloc.allocation_date,
            notes=alloc.notes
        ))

    return result
