from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from api.dependencies import get_db
from schemas.invoice import Invoice, InvoiceCreate, InvoiceStatusUpdate, Statistics
from services import InvoiceService
from config import Config

router = APIRouter()


@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    status: Optional[str] = None,
    invoice_number: Optional[str] = None,
    customer_name: Optional[str] = None,
    customer_phone: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all invoices with optional filters for status and search parameters"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    invoices = invoice_service.search_invoices(
        status=status,
        invoice_number=invoice_number,
        customer_name=customer_name,
        customer_phone=customer_phone
    )
    return invoices


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
    from fastapi import HTTPException
    
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
    """Generate PDF for an invoice"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    pdf_path = invoice_service.generate_pdf(invoice_id)
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"invoice_{invoice_id}.pdf"
    )


@router.get("/invoices/{invoice_id}/excel")
async def generate_invoice_excel(invoice_id: int, db: Session = Depends(get_db)):
    """Generate Excel for an invoice"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
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
