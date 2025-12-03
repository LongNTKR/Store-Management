"""Invoice management and generation service."""

import os
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database.models import Invoice, InvoiceItem, Product, Customer
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import openpyxl
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill


class InvoiceService:
    """Service for invoice management and generation."""

    def __init__(self, db_session: Session, output_dir: str = "data/invoices"):
        """
        Initialize invoice service.

        Args:
            db_session: SQLAlchemy database session
            output_dir: Directory to save generated invoices
        """
        self.db = db_session
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_invoice_number(self) -> str:
        """
        Generate a unique invoice number.

        Returns:
            Invoice number in format INV-YYYYMMDD-XXXX
        """
        today = datetime.now().strftime("%Y%m%d")
        prefix = f"INV-{today}"

        # Count invoices created today
        count = self.db.query(Invoice).filter(
            Invoice.invoice_number.like(f"{prefix}%")
        ).count()

        return f"{prefix}-{count + 1:04d}"

    def create_invoice(
        self,
        items: List[Dict],
        customer_id: Optional[int] = None,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
        customer_address: Optional[str] = None,
        discount: float = 0,
        tax: float = 0,
        payment_method: Optional[str] = None,
        notes: Optional[str] = None,
        status: str = 'pending'
    ) -> Invoice:
        """
        Create a new invoice.

        Args:
            items: List of dicts with 'product_id' and 'quantity'
            customer_id: Customer ID (if registered customer)
            customer_name: Customer name (for one-time customers)
            customer_phone: Customer phone
            customer_address: Customer address
            discount: Discount amount
            tax: Tax amount
            payment_method: Payment method
            notes: Additional notes
            status: Invoice status (pending, paid, cancelled)

        Returns:
            Created Invoice object
        """
        # Calculate subtotal
        subtotal = 0
        invoice_items = []

        for item_data in items:
            product = self.db.query(Product).filter(
                Product.id == item_data['product_id']
            ).first()

            if not product:
                raise ValueError(f"Product {item_data['product_id']} not found")

            quantity = item_data['quantity']
            item_subtotal = product.price * quantity

            invoice_item = InvoiceItem(
                product_id=product.id,
                product_name=product.name,
                product_price=product.price,
                quantity=quantity,
                unit=product.unit,
                subtotal=item_subtotal
            )
            invoice_items.append(invoice_item)
            subtotal += item_subtotal

        # Calculate total
        total = subtotal - discount + tax

        # Generate invoice number
        invoice_number = self.generate_invoice_number()

        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=customer_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_address=customer_address,
            subtotal=subtotal,
            discount=discount,
            tax=tax,
            total=total,
            status=status,
            payment_method=payment_method,
            notes=notes
        )

        self.db.add(invoice)
        self.db.flush()  # Get invoice ID

        # Add items
        for item in invoice_items:
            item.invoice_id = invoice.id
            self.db.add(item)

        self.db.commit()
        self.db.refresh(invoice)

        return invoice

    def get_invoice(self, invoice_id: int) -> Optional[Invoice]:
        """Get invoice by ID."""
        return self.db.query(Invoice).filter(Invoice.id == invoice_id).first()

    def get_invoice_by_number(self, invoice_number: str) -> Optional[Invoice]:
        """Get invoice by invoice number."""
        return self.db.query(Invoice).filter(
            Invoice.invoice_number == invoice_number
        ).first()

    def search_invoices(
        self,
        customer_id: Optional[int] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Invoice]:
        """Search invoices with filters. Uses joinedload to prevent N+1 queries."""
        from sqlalchemy.orm import joinedload

        filters = []

        if customer_id:
            filters.append(Invoice.customer_id == customer_id)

        if status:
            filters.append(Invoice.status == status)

        if start_date:
            filters.append(Invoice.created_at >= start_date)

        if end_date:
            filters.append(Invoice.created_at <= end_date)

        query = self.db.query(Invoice)

        # Eagerly load invoice items to prevent N+1 queries
        query = query.options(joinedload(Invoice.items))

        if filters:
            query = query.filter(and_(*filters))

        return query.order_by(Invoice.created_at.desc()).all()

    def update_invoice_status(self, invoice_id: int, status: str) -> Optional[Invoice]:
        """Update invoice status."""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return None

        invoice.status = status
        invoice.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(invoice)

        return invoice

    def generate_pdf(self, invoice_id: int, company_name: str = "Cửa Hàng Gia Đình") -> str:
        """
        Generate PDF invoice.

        Args:
            invoice_id: Invoice ID
            company_name: Company name to display on invoice

        Returns:
            Path to generated PDF file
        """
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Create PDF filename
        pdf_filename = f"{invoice.invoice_number}.pdf"
        pdf_path = os.path.join(self.output_dir, pdf_filename)

        # Create PDF
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2C3E50'),
            spaceAfter=30,
            alignment=1  # Center
        )

        elements.append(Paragraph(f"<b>{company_name}</b>", title_style))
        elements.append(Paragraph(f"HÓA ĐƠN BÁN HÀNG", title_style))
        elements.append(Spacer(1, 12))

        # Invoice info
        info_style = styles['Normal']
        elements.append(Paragraph(f"<b>Số hóa đơn:</b> {invoice.invoice_number}", info_style))
        elements.append(Paragraph(f"<b>Ngày:</b> {invoice.created_at.strftime('%d/%m/%Y %H:%M')}", info_style))

        if invoice.customer_name:
            elements.append(Paragraph(f"<b>Khách hàng:</b> {invoice.customer_name}", info_style))
        if invoice.customer_phone:
            elements.append(Paragraph(f"<b>Số điện thoại:</b> {invoice.customer_phone}", info_style))
        if invoice.customer_address:
            elements.append(Paragraph(f"<b>Địa chỉ:</b> {invoice.customer_address}", info_style))

        elements.append(Spacer(1, 20))

        # Items table
        table_data = [['STT', 'Sản phẩm', 'Đơn giá', 'SL', 'Đơn vị', 'Thành tiền']]

        for idx, item in enumerate(invoice.items, 1):
            table_data.append([
                str(idx),
                item.product_name,
                f"{item.product_price:,.0f}",
                str(item.quantity),
                item.unit,
                f"{item.subtotal:,.0f}"
            ])

        # Add totals
        table_data.append(['', '', '', '', 'Tạm tính:', f"{invoice.subtotal:,.0f}"])
        if invoice.discount > 0:
            table_data.append(['', '', '', '', 'Giảm giá:', f"-{invoice.discount:,.0f}"])
        if invoice.tax > 0:
            table_data.append(['', '', '', '', 'Thuế:', f"{invoice.tax:,.0f}"])
        table_data.append(['', '', '', '', '<b>Tổng cộng:</b>', f"<b>{invoice.total:,.0f} VNĐ</b>"])

        table = Table(table_data, colWidths=[30, 180, 70, 30, 60, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498DB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -4), colors.beige),
            ('GRID', (0, 0), (-1, -4), 1, colors.black),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 20))

        # Notes
        if invoice.notes:
            elements.append(Paragraph(f"<b>Ghi chú:</b> {invoice.notes}", info_style))

        # Build PDF
        doc.build(elements)

        return pdf_path

    def generate_excel(self, invoice_id: int, company_name: str = "Cửa Hàng Gia Đình") -> str:
        """
        Generate Excel invoice.

        Args:
            invoice_id: Invoice ID
            company_name: Company name

        Returns:
            Path to generated Excel file
        """
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")

        # Create Excel filename
        excel_filename = f"{invoice.invoice_number}.xlsx"
        excel_path = os.path.join(self.output_dir, excel_filename)

        # Create workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Hóa đơn"

        # Styles
        title_font = Font(size=18, bold=True)
        header_font = Font(size=12, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="3498DB", end_color="3498DB", fill_type="solid")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # Title
        ws.merge_cells('A1:F1')
        ws['A1'] = company_name
        ws['A1'].font = title_font
        ws['A1'].alignment = Alignment(horizontal='center')

        ws.merge_cells('A2:F2')
        ws['A2'] = "HÓA ĐƠN BÁN HÀNG"
        ws['A2'].font = Font(size=14, bold=True)
        ws['A2'].alignment = Alignment(horizontal='center')

        # Invoice info
        row = 4
        ws[f'A{row}'] = f"Số hóa đơn: {invoice.invoice_number}"
        row += 1
        ws[f'A{row}'] = f"Ngày: {invoice.created_at.strftime('%d/%m/%Y %H:%M')}"
        row += 1
        if invoice.customer_name:
            ws[f'A{row}'] = f"Khách hàng: {invoice.customer_name}"
            row += 1
        if invoice.customer_phone:
            ws[f'A{row}'] = f"Số điện thoại: {invoice.customer_phone}"
            row += 1
        if invoice.customer_address:
            ws[f'A{row}'] = f"Địa chỉ: {invoice.customer_address}"
            row += 1

        row += 1

        # Headers
        headers = ['STT', 'Sản phẩm', 'Đơn giá', 'Số lượng', 'Đơn vị', 'Thành tiền']
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center')
            cell.border = border

        # Items
        for idx, item in enumerate(invoice.items, 1):
            row += 1
            ws.cell(row=row, column=1, value=idx).border = border
            ws.cell(row=row, column=2, value=item.product_name).border = border
            ws.cell(row=row, column=3, value=item.product_price).border = border
            ws.cell(row=row, column=4, value=item.quantity).border = border
            ws.cell(row=row, column=5, value=item.unit).border = border
            ws.cell(row=row, column=6, value=item.subtotal).border = border

        # Totals
        row += 2
        ws.cell(row=row, column=5, value="Tạm tính:")
        ws.cell(row=row, column=6, value=invoice.subtotal)

        if invoice.discount > 0:
            row += 1
            ws.cell(row=row, column=5, value="Giảm giá:")
            ws.cell(row=row, column=6, value=-invoice.discount)

        if invoice.tax > 0:
            row += 1
            ws.cell(row=row, column=5, value="Thuế:")
            ws.cell(row=row, column=6, value=invoice.tax)

        row += 1
        ws.cell(row=row, column=5, value="Tổng cộng:").font = Font(bold=True)
        ws.cell(row=row, column=6, value=invoice.total).font = Font(bold=True)

        # Column widths
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['B'].width = 30
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 12
        ws.column_dimensions['E'].width = 12
        ws.column_dimensions['F'].width = 15

        wb.save(excel_path)

        return excel_path

    def print_invoice(self, invoice_id: int, company_name: str = "Cửa Hàng Gia Đình"):
        """
        Print invoice (generates PDF and opens it).

        Args:
            invoice_id: Invoice ID
            company_name: Company name
        """
        pdf_path = self.generate_pdf(invoice_id, company_name)

        # Open PDF with default viewer
        import platform
        import subprocess

        system = platform.system()
        if system == 'Windows':
            os.startfile(pdf_path)
        elif system == 'Darwin':  # macOS
            subprocess.run(['open', pdf_path])
        else:  # Linux
            subprocess.run(['xdg-open', pdf_path])

    def get_statistics(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """
        Get invoice statistics using SQL aggregation for performance.

        Args:
            start_date: Start date filter
            end_date: End date filter

        Returns:
            Dictionary with statistics
        """
        from sqlalchemy import func, case

        filters = []
        if start_date:
            filters.append(Invoice.created_at >= start_date)
        if end_date:
            filters.append(Invoice.created_at <= end_date)

        query = self.db.query(Invoice)
        if filters:
            query = query.filter(and_(*filters))

        # Use SQL aggregation instead of Python loops for performance
        results = query.with_entities(
            func.count(Invoice.id).label('total_invoices'),
            func.sum(case(
                (Invoice.status == 'paid', Invoice.total),
                else_=0
            )).label('total_revenue'),
            func.sum(case(
                (Invoice.status == 'pending', Invoice.total),
                else_=0
            )).label('pending_revenue'),
            func.count(case(
                (Invoice.status == 'paid', 1)
            )).label('paid_invoices'),
            func.count(case(
                (Invoice.status == 'pending', 1)
            )).label('pending_invoices'),
            func.count(case(
                (Invoice.status == 'cancelled', 1)
            )).label('cancelled_invoices'),
        ).first()

        total_invoices = results.total_invoices or 0
        paid_invoices = results.paid_invoices or 0
        total_revenue = float(results.total_revenue or 0)
        pending_revenue = float(results.pending_revenue or 0)

        return {
            'total_invoices': total_invoices,
            'paid_invoices': paid_invoices,
            'pending_invoices': results.pending_invoices or 0,
            'cancelled_invoices': results.cancelled_invoices or 0,
            'total_revenue': total_revenue,
            'pending_revenue': pending_revenue,
            'average_order_value': total_revenue / paid_invoices if paid_invoices > 0 else 0
        }
