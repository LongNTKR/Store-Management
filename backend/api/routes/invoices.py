from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from api.dependencies import get_db
from schemas.invoice import Invoice, Statistics
from services import InvoiceService
from config import Config

router = APIRouter()


@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all invoices, optionally filtered by status"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    invoices = invoice_service.search_invoices(status=status)
    return invoices


@router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Get invoice by ID"""
    invoice_service = InvoiceService(db, Config.INVOICE_DIR)
    invoice = invoice_service.get_invoice(invoice_id)
    return invoice


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
