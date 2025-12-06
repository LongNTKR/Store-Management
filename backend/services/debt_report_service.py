"""Debt report generation service for customer reconciliation."""

import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import pytz

from database.models import Invoice, Customer, Payment, PaymentAllocation
from config import Config

# ReportLab imports for PDF
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, PageBreak, Frame, PageTemplate
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Excel imports
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

# Timezone
VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_vn_time():
    """Get current time in Vietnam timezone (UTC+7)."""
    return datetime.now(VN_TZ)

# Font setup for Vietnamese PDF
FONT_DIR = os.path.join(os.path.dirname(__file__), '..', 'fonts')
FONT_NORMAL = 'DejaVuSans'
FONT_BOLD = 'DejaVuSans-Bold'

# Register fonts if available
try:
    normal_font_path = os.path.join(FONT_DIR, 'DejaVuSans.ttf')
    bold_font_path = os.path.join(FONT_DIR, 'DejaVuSans-Bold.ttf')

    if os.path.exists(normal_font_path):
        pdfmetrics.registerFont(TTFont(FONT_NORMAL, normal_font_path))
    else:
        FONT_NORMAL = 'Helvetica'

    if os.path.exists(bold_font_path):
        pdfmetrics.registerFont(TTFont(FONT_BOLD, bold_font_path))
    else:
        FONT_BOLD = 'Helvetica-Bold'
except Exception as e:
    # Fallback to Helvetica if DejaVu fonts not available
    FONT_NORMAL = 'Helvetica'
    FONT_BOLD = 'Helvetica-Bold'
    print(f"Warning: Could not load DejaVu fonts, using Helvetica. Error: {e}")


class DebtReportService:
    """Service for generating debt reconciliation reports."""

    def __init__(self, db_session: Session, output_dir: str):
        """
        Initialize debt report service.

        Args:
            db_session: Database session
            output_dir: Directory to save reports
        """
        self.db = db_session
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def calculate_aging_buckets(
        self,
        invoices: List[Invoice],
        as_of_date: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Calculate aging buckets for invoices.

        Args:
            invoices: List of invoices with remaining debt
            as_of_date: Date to calculate aging from (default: now)

        Returns:
            List of aging bucket dicts with structure:
            {
                'bucket_label': '0-30 ngày',
                'bucket_key': '0-30',
                'invoice_count': 2,
                'total_amount': 1500000.0,
                'invoices': [Invoice, ...]
            }
        """
        if as_of_date is None:
            as_of_date = get_vn_time()

        # Define buckets
        buckets = [
            {'key': '0-30', 'label': '0-30 ngày', 'min_days': 0, 'max_days': 30},
            {'key': '30-60', 'label': '30-60 ngày', 'min_days': 30, 'max_days': 60},
            {'key': '60-90', 'label': '60-90 ngày', 'min_days': 60, 'max_days': 90},
            {'key': '90+', 'label': 'Trên 90 ngày', 'min_days': 90, 'max_days': float('inf')}
        ]

        # Initialize bucket results
        bucket_results = []
        for bucket in buckets:
            bucket_results.append({
                'bucket_label': bucket['label'],
                'bucket_key': bucket['key'],
                'invoice_count': 0,
                'total_amount': 0.0,
                'invoices': []
            })

        # Classify invoices into buckets
        for invoice in invoices:
            if invoice.remaining_amount <= 0:
                continue

            # Calculate days old
            try:
                # Handle timezone-aware and naive datetime
                inv_date = invoice.created_at
                if inv_date.tzinfo is None and as_of_date.tzinfo is not None:
                    # Make invoice date timezone-aware
                    inv_date = VN_TZ.localize(inv_date)
                elif inv_date.tzinfo is not None and as_of_date.tzinfo is None:
                    # Make as_of_date timezone-aware
                    as_of_date = VN_TZ.localize(as_of_date)

                days_old = (as_of_date - inv_date).days
            except:
                # Fallback: compare naive datetimes
                inv_naive = invoice.created_at.replace(tzinfo=None) if invoice.created_at.tzinfo else invoice.created_at
                as_of_naive = as_of_date.replace(tzinfo=None) if as_of_date.tzinfo else as_of_date
                days_old = (as_of_naive - inv_naive).days

            # Find appropriate bucket
            for i, bucket in enumerate(buckets):
                if bucket['min_days'] <= days_old < bucket['max_days']:
                    bucket_results[i]['invoice_count'] += 1
                    bucket_results[i]['total_amount'] += invoice.remaining_amount
                    bucket_results[i]['invoices'].append(invoice)
                    break

        return bucket_results

    def generate_debt_pdf(
        self,
        customer_id: int,
        company_name: Optional[str] = None
    ) -> str:
        """
        Generate PDF debt reconciliation report for customer.

        Args:
            customer_id: Customer ID
            company_name: Company name (default from Config)

        Returns:
            Path to generated PDF file

        Raises:
            ValueError: If customer not found
        """
        # Get customer
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Không tìm thấy khách hàng với ID {customer_id}")

        if company_name is None:
            company_name = Config.COMPANY_NAME

        # Get all invoices with debt
        invoices = self.db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(['processing', 'pending', 'paid']),
            Invoice.remaining_amount > 0
        ).order_by(Invoice.created_at.asc()).all()

        # Get payment history
        payments = self.db.query(Payment).filter(
            Payment.customer_id == customer_id
        ).order_by(Payment.payment_date.desc()).limit(20).all()

        # Calculate totals
        total_debt = sum(inv.remaining_amount for inv in invoices)
        total_invoices = len(invoices)

        # Calculate aging
        aging_buckets = self.calculate_aging_buckets(invoices)

        # Create PDF filename
        now = get_vn_time()
        pdf_filename = f"Cong-no-{customer.name.replace(' ', '-')}-{now.strftime('%Y%m%d')}.pdf"
        pdf_path = os.path.join(self.output_dir, pdf_filename)

        # Create PDF
        doc = SimpleDocTemplate(pdf_path, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=FONT_BOLD,
            fontSize=18,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=20,
            alignment=TA_CENTER
        )

        elements.append(Paragraph(f"<b>{company_name}</b>", title_style))
        elements.append(Paragraph(f"BÁO CÁO ĐỐI CHIẾU CÔNG NỢ", title_style))
        elements.append(Spacer(1, 10))

        # Report date
        info_style = ParagraphStyle(
            'InfoStyle',
            parent=styles['Normal'],
            fontName=FONT_NORMAL,
            fontSize=10,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(f"Ngày báo cáo: {now.strftime('%d/%m/%Y %H:%M')}", info_style))
        elements.append(Spacer(1, 15))

        # Customer info
        customer_style = ParagraphStyle(
            'CustomerStyle',
            parent=styles['Normal'],
            fontName=FONT_NORMAL,
            fontSize=11
        )
        elements.append(Paragraph(f"<b>Khách hàng:</b> {customer.name}", customer_style))
        if customer.phone:
            elements.append(Paragraph(f"<b>Số điện thoại:</b> {customer.phone}", customer_style))
        if customer.address:
            elements.append(Paragraph(f"<b>Địa chỉ:</b> {customer.address}", customer_style))
        elements.append(Spacer(1, 15))

        # Summary section
        summary_style = ParagraphStyle(
            'SummaryStyle',
            parent=styles['Heading2'],
            fontName=FONT_BOLD,
            fontSize=14,
            textColor=colors.HexColor('#E74C3C'),
            spaceAfter=10
        )
        elements.append(Paragraph("<b>TỔNG QUAN CÔNG NỢ</b>", summary_style))

        summary_data = [
            ['Tổng số hóa đơn chưa thanh toán đủ:', str(total_invoices)],
            ['Tổng công nợ:', f"{total_debt:,.0f} VNĐ"]
        ]

        summary_table = Table(summary_data, colWidths=[350, 150])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('FONTNAME', (0, -1), (-1, -1), FONT_BOLD),
            ('FONTSIZE', (0, -1), (-1, -1), 13),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#E74C3C')),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        # Aging analysis section
        elements.append(Paragraph("<b>PHÂN TÍCH TUỔI NỢ</b>", summary_style))

        aging_table_data = [['Độ tuổi nợ', 'Số hóa đơn', 'Tổng tiền (VNĐ)']]
        for bucket in aging_buckets:
            aging_table_data.append([
                bucket['bucket_label'],
                str(bucket['invoice_count']),
                f"{bucket['total_amount']:,.0f}"
            ])

        aging_table = Table(aging_table_data, colWidths=[200, 150, 150])
        aging_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498DB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(aging_table)
        elements.append(Spacer(1, 20))

        # Invoice list section
        elements.append(Paragraph("<b>CHI TIẾT HÓA ĐƠN CHƯA THANH TOÁN ĐỦ</b>", summary_style))

        invoice_table_data = [['STT', 'Số hóa đơn', 'Ngày', 'Tổng tiền', 'Đã trả', 'Còn lại']]
        for idx, invoice in enumerate(invoices, 1):
            invoice_table_data.append([
                str(idx),
                invoice.invoice_number,
                invoice.created_at.strftime('%d/%m/%Y'),
                f"{invoice.total:,.0f}",
                f"{invoice.paid_amount:,.0f}",
                f"{invoice.remaining_amount:,.0f}"
            ])

        invoice_table = Table(invoice_table_data, colWidths=[30, 90, 65, 80, 80, 80])
        invoice_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498DB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (3, 1), (-1, -1), 'RIGHT'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(invoice_table)
        elements.append(Spacer(1, 20))

        # Payment history section (recent 20 payments)
        if payments:
            elements.append(Paragraph("<b>LỊCH SỬ THANH TOÁN GẦN ĐÂY</b>", summary_style))

            payment_table_data = [['STT', 'Mã thanh toán', 'Ngày', 'Số tiền', 'Phương thức']]
            for idx, payment in enumerate(payments, 1):
                payment_method_map = {
                    'cash': 'Tiền mặt',
                    'transfer': 'Chuyển khoản',
                    'card': 'Thẻ'
                }
                payment_table_data.append([
                    str(idx),
                    payment.payment_number,
                    payment.payment_date.strftime('%d/%m/%Y'),
                    f"{payment.amount:,.0f}",
                    payment_method_map.get(payment.payment_method, payment.payment_method or '')
                ])

            payment_table = Table(payment_table_data, colWidths=[30, 100, 80, 90, 100])
            payment_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498DB')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
                ('FONTSIZE', (0, 0), (-1, 0), 9),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (3, 1), (3, -1), 'RIGHT'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(payment_table)

        # Footer note
        elements.append(Spacer(1, 30))
        note_style = ParagraphStyle(
            'NoteStyle',
            parent=styles['Normal'],
            fontName=FONT_NORMAL,
            fontSize=9,
            textColor=colors.grey,
            alignment=TA_CENTER
        )
        elements.append(Paragraph(
            f"Báo cáo được tạo tự động từ hệ thống {Config.APP_NAME}",
            note_style
        ))

        # Build PDF
        doc.build(elements)

        return pdf_path

    def generate_debt_excel(
        self,
        customer_id: int
    ) -> str:
        """
        Generate Excel debt reconciliation report for customer.

        Args:
            customer_id: Customer ID

        Returns:
            Path to generated Excel file

        Raises:
            ValueError: If customer not found
        """
        # Get customer
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Không tìm thấy khách hàng với ID {customer_id}")

        # Get data
        invoices = self.db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(['processing', 'pending', 'paid']),
            Invoice.remaining_amount > 0
        ).order_by(Invoice.created_at.asc()).all()

        payments = self.db.query(Payment).filter(
            Payment.customer_id == customer_id
        ).order_by(Payment.payment_date.desc()).all()

        aging_buckets = self.calculate_aging_buckets(invoices)

        # Create Excel file
        now = get_vn_time()
        excel_filename = f"Cong-no-{customer.name.replace(' ', '-')}-{now.strftime('%Y%m%d')}.xlsx"
        excel_path = os.path.join(self.output_dir, excel_filename)

        wb = Workbook()

        # Define styles
        header_font = Font(bold=True, color="FFFFFF", size=11)
        header_fill = PatternFill(start_color="3498DB", end_color="3498DB", fill_type="solid")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # Sheet 1: Summary
        ws_summary = wb.active
        ws_summary.title = "Tổng quan"

        ws_summary['A1'] = f"BÁO CÁO CÔNG NỢ - {customer.name.upper()}"
        ws_summary['A1'].font = Font(bold=True, size=14)
        ws_summary['A2'] = f"Ngày báo cáo: {now.strftime('%d/%m/%Y %H:%M')}"

        ws_summary['A4'] = "Thông tin khách hàng:"
        ws_summary['A4'].font = Font(bold=True)
        ws_summary['A5'] = f"Tên: {customer.name}"
        ws_summary['A6'] = f"Số điện thoại: {customer.phone or 'N/A'}"
        ws_summary['A7'] = f"Địa chỉ: {customer.address or 'N/A'}"

        total_debt = sum(inv.remaining_amount for inv in invoices)
        ws_summary['A9'] = "Tổng công nợ:"
        ws_summary['A9'].font = Font(bold=True, size=12)
        ws_summary['B9'] = total_debt
        ws_summary['B9'].number_format = '#,##0 "VNĐ"'
        ws_summary['B9'].font = Font(bold=True, size=12, color="E74C3C")

        ws_summary['A10'] = "Số hóa đơn chưa thanh toán đủ:"
        ws_summary['B10'] = len(invoices)

        # Sheet 2: Aging Analysis
        ws_aging = wb.create_sheet("Phân tích tuổi nợ")

        ws_aging['A1'] = "PHÂN TÍCH TUỔI NỢ"
        ws_aging['A1'].font = Font(bold=True, size=12)

        ws_aging['A3'] = "Độ tuổi nợ"
        ws_aging['B3'] = "Số hóa đơn"
        ws_aging['C3'] = "Tổng tiền (VNĐ)"

        for cell in ['A3', 'B3', 'C3']:
            ws_aging[cell].font = header_font
            ws_aging[cell].fill = header_fill
            ws_aging[cell].alignment = Alignment(horizontal='center')

        row = 4
        for bucket in aging_buckets:
            ws_aging[f'A{row}'] = bucket['bucket_label']
            ws_aging[f'B{row}'] = bucket['invoice_count']
            ws_aging[f'C{row}'] = bucket['total_amount']
            ws_aging[f'C{row}'].number_format = '#,##0'
            row += 1

        # Add borders
        for row_idx in range(3, row):
            for col_idx in range(1, 4):
                cell = ws_aging.cell(row=row_idx, column=col_idx)
                cell.border = border

        # Sheet 3: Invoice Details
        ws_invoices = wb.create_sheet("Chi tiết hóa đơn")

        headers = ['STT', 'Số hóa đơn', 'Ngày', 'Tổng tiền', 'Đã trả', 'Còn lại', 'Trạng thái']
        for col_idx, header in enumerate(headers, 1):
            cell = ws_invoices.cell(row=1, column=col_idx)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center')
            cell.border = border

        for idx, invoice in enumerate(invoices, 2):
            ws_invoices.cell(row=idx, column=1, value=idx-1)
            ws_invoices.cell(row=idx, column=2, value=invoice.invoice_number)
            ws_invoices.cell(row=idx, column=3, value=invoice.created_at.strftime('%d/%m/%Y'))
            ws_invoices.cell(row=idx, column=4, value=invoice.total)
            ws_invoices.cell(row=idx, column=5, value=invoice.paid_amount)
            ws_invoices.cell(row=idx, column=6, value=invoice.remaining_amount)

            status_map = {
                'pending': 'Chưa thanh toán',
                'paid': 'Đã thanh toán',
                'processing': 'Đang xử lý'
            }
            ws_invoices.cell(row=idx, column=7, value=status_map.get(invoice.status, invoice.status))

            # Format currency
            for col in [4, 5, 6]:
                ws_invoices.cell(row=idx, column=col).number_format = '#,##0'

            # Add borders
            for col in range(1, 8):
                ws_invoices.cell(row=idx, column=col).border = border

        # Sheet 4: Payment History
        ws_payments = wb.create_sheet("Lịch sử thanh toán")

        payment_headers = ['STT', 'Mã thanh toán', 'Ngày', 'Số tiền', 'Phương thức', 'Ghi chú']
        for col_idx, header in enumerate(payment_headers, 1):
            cell = ws_payments.cell(row=1, column=col_idx)
            cell.value = header
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center')
            cell.border = border

        payment_method_map = {
            'cash': 'Tiền mặt',
            'transfer': 'Chuyển khoản',
            'card': 'Thẻ'
        }

        for idx, payment in enumerate(payments, 2):
            ws_payments.cell(row=idx, column=1, value=idx-1)
            ws_payments.cell(row=idx, column=2, value=payment.payment_number)
            ws_payments.cell(row=idx, column=3, value=payment.payment_date.strftime('%d/%m/%Y'))
            ws_payments.cell(row=idx, column=4, value=payment.amount)
            ws_payments.cell(row=idx, column=5, value=payment_method_map.get(payment.payment_method, payment.payment_method or ''))
            ws_payments.cell(row=idx, column=6, value=payment.notes or '')

            ws_payments.cell(row=idx, column=4).number_format = '#,##0'

            for col in range(1, 7):
                ws_payments.cell(row=idx, column=col).border = border

        # Auto-size columns
        for ws in [ws_summary, ws_aging, ws_invoices, ws_payments]:
            for column in ws.columns:
                max_length = 0
                column = [cell for cell in column]
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                ws.column_dimensions[get_column_letter(column[0].column)].width = adjusted_width

        # Save workbook
        wb.save(excel_path)

        return excel_path
