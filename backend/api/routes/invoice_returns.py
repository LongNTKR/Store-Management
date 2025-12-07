"""API routes for invoice returns."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from api.dependencies import get_db
from schemas.invoice_return import (
    InvoiceReturnCreate,
    InvoiceReturnResponse,
    AvailableReturnQuantity
)
from services.invoice_return_service import InvoiceReturnService
from config import Config

router = APIRouter()


@router.post("/invoices/{invoice_id}/returns", response_model=InvoiceReturnResponse)
async def create_invoice_return(
    invoice_id: int,
    return_data: InvoiceReturnCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new invoice return.

    Args:
        invoice_id: Invoice ID to return
        return_data: Return creation data

    Returns:
        Created invoice return

    Raises:
        HTTPException: 400 if validation fails, 404 if invoice not found
    """
    service = InvoiceReturnService(db)

    try:
        invoice_return = service.create_return(invoice_id, return_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Populate invoice_number for response
    response_data = InvoiceReturnResponse.model_validate(invoice_return)
    if invoice_return.invoice:
        response_data.invoice_number = invoice_return.invoice.invoice_number

    return response_data


@router.get("/invoices/{invoice_id}/returns", response_model=List[InvoiceReturnResponse])
async def get_invoice_returns(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all returns for an invoice.

    Args:
        invoice_id: Invoice ID

    Returns:
        List of invoice returns
    """
    service = InvoiceReturnService(db)
    returns = service.get_invoice_returns(invoice_id)

    # Populate invoice_number for each return
    response = []
    for ret in returns:
        ret_data = InvoiceReturnResponse.model_validate(ret)
        if ret.invoice:
            ret_data.invoice_number = ret.invoice.invoice_number
        response.append(ret_data)

    return response


@router.get("/invoices/{invoice_id}/available-return-quantities", response_model=List[AvailableReturnQuantity])
async def get_available_return_quantities(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    """
    Get available quantities for return for each invoice item.

    Args:
        invoice_id: Invoice ID

    Returns:
        List of available return quantities for each item

    Raises:
        HTTPException: 400 if validation fails, 404 if invoice not found
    """
    service = InvoiceReturnService(db)

    try:
        quantities = service.get_available_return_quantities(invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return [AvailableReturnQuantity(**q) for q in quantities]


@router.get("/returns/{return_id}", response_model=InvoiceReturnResponse)
async def get_return(
    return_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a specific return by ID.

    Args:
        return_id: Return ID

    Returns:
        Invoice return

    Raises:
        HTTPException: 404 if return not found
    """
    service = InvoiceReturnService(db)
    invoice_return = service.get_return(return_id)

    if not invoice_return:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy phiếu hoàn trả với ID {return_id}")

    # Populate invoice_number for response
    response_data = InvoiceReturnResponse.model_validate(invoice_return)
    if invoice_return.invoice:
        response_data.invoice_number = invoice_return.invoice.invoice_number

    return response_data


@router.get("/returns/{return_id}/pdf")
async def generate_return_pdf(
    return_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate PDF for an invoice return.

    Args:
        return_id: Return ID

    Returns:
        PDF file

    Raises:
        HTTPException: 400 if validation fails, 404 if return not found
    """
    service = InvoiceReturnService(db, Config.INVOICE_DIR)

    try:
        pdf_path = service.generate_return_pdf(return_id)
        return FileResponse(
            pdf_path,
            media_type='application/pdf',
            filename=f"return_{return_id}.pdf"
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
