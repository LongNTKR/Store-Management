"""Debt report API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from api.dependencies import get_db
from schemas.debt_report import AgingAnalysisResponse, AgingBucket, AgingBucketInvoice
from services.debt_report_service import DebtReportService, get_vn_time
from config import Config

router = APIRouter(prefix="/debt-reports", tags=["Debt Reports"])


@router.get("/{customer_id}/pdf")
async def export_debt_pdf(
    customer_id: int,
    db: Session = Depends(get_db)
):
    """
    Export debt reconciliation report as PDF for a customer.

    Args:
        customer_id: Customer ID

    Returns:
        PDF file download

    Raises:
        404: Customer not found
        500: Error generating PDF
    """
    service = DebtReportService(db, Config.INVOICE_DIR)

    try:
        pdf_path = service.generate_debt_pdf(customer_id)

        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="Không thể tạo file PDF")

        # Get customer name for filename
        from database.models import Customer
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        filename = f"Cong-no-{customer.name.replace(' ', '-')}-{get_vn_time().strftime('%Y%m%d')}.pdf"

        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{filename}"
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi tạo báo cáo PDF: {str(e)}"
        )


@router.get("/{customer_id}/excel")
async def export_debt_excel(
    customer_id: int,
    db: Session = Depends(get_db)
):
    """
    Export debt reconciliation report as Excel for a customer.

    Args:
        customer_id: Customer ID

    Returns:
        Excel file download

    Raises:
        404: Customer not found
        500: Error generating Excel
    """
    service = DebtReportService(db, Config.INVOICE_DIR)

    try:
        excel_path = service.generate_debt_excel(customer_id)

        if not os.path.exists(excel_path):
            raise HTTPException(status_code=500, detail="Không thể tạo file Excel")

        # Get customer name for filename
        from database.models import Customer
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        filename = f"Cong-no-{customer.name.replace(' ', '-')}-{get_vn_time().strftime('%Y%m%d')}.xlsx"

        return FileResponse(
            path=excel_path,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{filename}"
            }
        )

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi tạo báo cáo Excel: {str(e)}"
        )


@router.get("/aging-analysis", response_model=AgingAnalysisResponse)
async def get_aging_analysis(
    customer_id: Optional[int] = Query(None, description="Customer ID (null = all customers)"),
    db: Session = Depends(get_db)
):
    """
    Get aging analysis for customer's debt.

    Args:
        customer_id: Optional customer ID. If null, returns analysis for all customers.

    Returns:
        AgingAnalysisResponse with buckets breakdown

    Raises:
        404: Customer not found (if customer_id provided)
    """
    from database.models import Customer, Invoice

    service = DebtReportService(db, Config.INVOICE_DIR)

    if customer_id:
        # Single customer analysis
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy khách hàng với ID {customer_id}")

        invoices = db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(['processing', 'pending', 'paid']),
            Invoice.remaining_amount > 0
        ).order_by(Invoice.created_at.asc()).all()

        customer_name = customer.name
    else:
        # All customers analysis
        invoices = db.query(Invoice).filter(
            Invoice.status.in_(['processing', 'pending', 'paid']),
            Invoice.remaining_amount > 0
        ).order_by(Invoice.created_at.asc()).all()

        customer_name = None

    # Calculate aging
    aging_buckets_data = service.calculate_aging_buckets(invoices)

    # Convert to schema
    buckets = []
    for bucket_data in aging_buckets_data:
        bucket_invoices = []
        for inv in bucket_data['invoices']:
            bucket_invoices.append(AgingBucketInvoice(
                id=inv.id,
                invoice_number=inv.invoice_number,
                created_at=inv.created_at,
                total=inv.total,
                paid_amount=inv.paid_amount,
                remaining_amount=inv.remaining_amount
            ))

        buckets.append(AgingBucket(
            bucket_label=bucket_data['bucket_label'],
            bucket_key=bucket_data['bucket_key'],
            invoice_count=bucket_data['invoice_count'],
            total_amount=bucket_data['total_amount'],
            invoices=bucket_invoices
        ))

    total_debt = sum(inv.remaining_amount for inv in invoices)
    total_invoices = len(invoices)

    return AgingAnalysisResponse(
        customer_id=customer_id,
        customer_name=customer_name,
        buckets=buckets,
        total_debt=total_debt,
        total_invoices=total_invoices,
        generated_at=get_vn_time()
    )
