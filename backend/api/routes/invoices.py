from datetime import datetime
import pytz
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from api.dependencies import get_db
from schemas.invoice import Invoice, InvoiceCreate, InvoiceStatusUpdate, Statistics, InvoiceUpdate
from schemas.common import PaginatedResponse
from services import InvoiceService
from config import Config

router = APIRouter()
VN_TZ = pytz.timezone("Asia/Ho_Chi_Minh")


def _parse_date(date_str: str, end_of_day: bool = False) -> datetime:
    """Parse ISO-like date string to timezone-aware datetime in VN."""
    try:
        parsed = datetime.fromisoformat(date_str)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="Ngày không hợp lệ. Vui lòng dùng định dạng YYYY-MM-DD."
        ) from exc

    if parsed.tzinfo is None:
        parsed = VN_TZ.localize(parsed)

    if end_of_day:
        parsed = parsed.replace(hour=23, minute=59, second=59, microsecond=999999)

    return parsed


@router.get("/invoices", response_model=PaginatedResponse[Invoice])
async def get_invoices(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    invoice_number: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    limit: int = 30,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get all invoices with optional filters for status and search parameters"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    parsed_start = _parse_date(start_date) if start_date else None
    parsed_end = _parse_date(end_date, end_of_day=True) if end_date else None
    items, total, has_more, next_offset = invoice_service.search_invoices(
        status=status,
        start_date=parsed_start,
        end_date=parsed_end,
        invoice_number=invoice_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        limit=limit,
        offset=offset,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, db: Session = Depends(get_db)):
    """Create a new invoice"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)

    # Convert invoice items to list of dicts for the service
    items = [{"product_id": item.product_id, "quantity": item.quantity} for item in invoice_data.items]

    # Create invoice using the service
    invoice = invoice_service.create_invoice(
        items=items,
        customer_id=invoice_data.customer_id,
        customer_name=invoice_data.customer_name,
        customer_phone=invoice_data.customer_phone,
        customer_address=invoice_data.customer_address,
        discount=invoice_data.discount,
        tax=invoice_data.tax,
        payment_method=invoice_data.payment_method,
        notes=invoice_data.notes,
        status=invoice_data.status
    )

    return invoice


@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Get invoice by ID"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    invoice = invoice_service.get_invoice(invoice_id)
    return invoice


@router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db)
):
    """
    Update invoice details.

    Business rule: Only invoices with 'pending' status can be edited.
    """
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)

    items = [{"product_id": item.product_id, "quantity": item.quantity} for item in invoice_data.items]

    try:
        invoice = invoice_service.update_invoice(
            invoice_id=invoice_id,
            items=items,
            customer_id=invoice_data.customer_id,
            customer_name=invoice_data.customer_name,
            customer_phone=invoice_data.customer_phone,
            customer_address=invoice_data.customer_address,
            discount=invoice_data.discount,
            tax=invoice_data.tax,
            payment_method=invoice_data.payment_method,
            notes=invoice_data.notes
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return invoice


@router.put("/invoices/{invoice_id}/status", response_model=Invoice)
async def update_invoice_status(
    invoice_id: int, 
    status_update: InvoiceStatusUpdate, 
    db: Session = Depends(get_db)
):
    """
    Update invoice status.
    
    Business rule: Only pending invoices can have their status changed.
    Paid or cancelled invoices cannot be modified.
    """
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    
    try:
        invoice = invoice_service.update_invoice_status(invoice_id, status_update.status)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice
    except ValueError as e:
        # Business rule violation (trying to update paid/cancelled invoice)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invoices/{invoice_id}/pdf")
async def generate_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    """
    Generate PDF for an invoice.
    
    Business rule: Only paid invoices can be exported to PDF.
    Unpaid (pending) or cancelled invoices cannot be exported.
    """
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    
    # Check invoice status before generating PDF
    invoice = invoice_service.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != 'paid':
        raise HTTPException(
            status_code=400, 
            detail="Chỉ có thể xuất hóa đơn đã thanh toán. Hóa đơn chưa thanh toán hoặc đã hủy không thể xuất."
        )
    
    pdf_path = invoice_service.generate_pdf(invoice_id)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"invoice_{invoice_id}.pdf"
    )


@router.get("/invoices/{invoice_id}/excel")
async def generate_invoice_excel(invoice_id: int, db: Session = Depends(get_db)):
    """
    Generate Excel for an invoice.
    
    Business rule: Only paid invoices can be exported to Excel.
    Unpaid (pending) or cancelled invoices cannot be exported.
    """
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    
    # Check invoice status before generating Excel
    invoice = invoice_service.get_invoice(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice.status != 'paid':
        raise HTTPException(
            status_code=400, 
            detail="Chỉ có thể xuất hóa đơn đã thanh toán. Hóa đơn chưa thanh toán hoặc đã hủy không thể xuất."
        )
    
    excel_path = invoice_service.generate_excel(invoice_id)
    return FileResponse(
        excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"invoice_{invoice_id}.xlsx"
    )


@router.get("/stats", response_model=Statistics)
async def get_statistics(db: Session = Depends(get_db)):
    """Get invoice statistics"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    stats = invoice_service.get_statistics()
    return stats
