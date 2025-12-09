"""Invoice return service - handles invoice return and refund operations."""

import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from database.models import (
    Invoice, InvoiceItem, InvoiceReturn, InvoiceReturnItem,
    Payment, PaymentAllocation, Product, Unit, get_vn_time
)
from schemas.invoice_return import (
    InvoiceReturnCreate, InvoiceReturnItemCreate,
    InvoiceReturnResponse, AvailableReturnQuantity
)
from pathlib import Path

def _is_valid_ttf(path: Path) -> bool:
    """Quick check to avoid HTML/error files when download fails."""
    try:
        if not path.exists() or path.stat().st_size < 1024:
            return False
        with path.open("rb") as f:
            header = f.read(4)
            return header in {b"\x00\x01\x00\x00", b"OTTO"}
    except Exception:
        return False

FONT_DIR = Path(__file__).resolve().parent / "fonts"
regular_font_path = FONT_DIR / "DejaVuSans.ttf"
bold_font_path = FONT_DIR / "DejaVuSans-Bold.ttf"

# Windows system fonts as backup (have Vietnamese glyphs)
windows_regular = Path("C:/Windows/Fonts/arial.ttf")
windows_bold = Path("C:/Windows/Fonts/arialbd.ttf")


# Font configuration (same as invoice_service.py)
FONT_NORMAL = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'
font_candidates = [
    ("DejaVuSans", regular_font_path, bold_font_path),
    ("Arial", windows_regular, windows_bold),
]

for font_name, normal_path, bold_path in font_candidates:
    if not (_is_valid_ttf(normal_path) and _is_valid_ttf(bold_path)):
        continue
    
    try:
        pdfmetrics.registerFont(TTFont(font_name, str(normal_path)))
        pdfmetrics.registerFont(TTFont(f"{font_name}-Bold", str(bold_path)))
        pdfmetrics.registerFontFamily(
            font_name,
            normal=font_name,
            bold=f"{font_name}-Bold",
            italic=font_name,  # Fallback
            boldItalic=f"{font_name}-Bold"  # Fallback
        )
        FONT_NORMAL = font_name
        FONT_BOLD = f"{font_name}-Bold"
        break
    except Exception as e:
        print(f"Warning: Could not load {font_name} fonts from {normal_path}: {e}")


class InvoiceReturnService:
    """Service for invoice return operations."""

    def __init__(self, db: Session, output_dir: str = "data/invoices"):
        """
        Initialize invoice return service.

        Args:
            db: Database session
            output_dir: Directory for PDF output files
        """
        self.db = db
        self.output_dir = output_dir

    def create_return(
        self,
        invoice_id: int,
        data: InvoiceReturnCreate
    ) -> InvoiceReturn:
        """
        Create a new invoice return with refund.

        Args:
            invoice_id: Invoice ID to return
            data: Return creation data

        Returns:
            Created InvoiceReturn object

        Raises:
            ValueError: If validation fails
        """
        # Step 1: Validate invoice eligibility
        invoice = self._validate_invoice_eligibility(invoice_id)

        # Step 2: Validate return items
        validated_items = self._validate_return_items(invoice, data.return_items)

        # Step 3: Calculate refund amount
        if data.refund_amount is None:
            refund_amount = self._calculate_refund_amount(validated_items)
        else:
            refund_amount = data.refund_amount

        # Step 4: Determine if full return
        is_full_return = self._is_full_return(invoice, validated_items)

        # Step 5: Generate return number
        return_number = self._generate_return_number()

        # Step 6: Create InvoiceReturn record
        invoice_return = InvoiceReturn(
            return_number=return_number,
            invoice_id=invoice_id,
            reason=data.reason.strip(),
            refund_amount=refund_amount,
            is_full_return=is_full_return,
            status='pending_refund',  # Always start as pending
            created_by=data.created_by,
            notes=data.notes,
            refund_payment_id=None
        )
        self.db.add(invoice_return)
        self.db.flush()  # Get invoice_return.id

        # Step 7: Create InvoiceReturnItem records
        for item_data in validated_items:
            return_item = InvoiceReturnItem(
                invoice_return_id=invoice_return.id,
                invoice_item_id=item_data['invoice_item_id'],
                product_id=item_data['product_id'],
                product_name=item_data['product_name'],
                product_price=item_data['product_price'],
                unit=item_data['unit'],
                quantity_returned=item_data['quantity_returned'],
                subtotal=item_data['subtotal'],
                restore_inventory=item_data['restore_inventory']
            )
            self.db.add(return_item)

        self.db.flush()

        # Step 8: Update inventory
        self._restore_inventory(validated_items)

        # Payment will be created when status is changed to 'refunded' via update_return_status()

        self.db.commit()
        self.db.refresh(invoice_return)
        return invoice_return

    def get_invoice_returns(self, invoice_id: int) -> List[InvoiceReturn]:
        """
        Get all returns for an invoice.

        Args:
            invoice_id: Invoice ID

        Returns:
            List of InvoiceReturn objects
        """
        return self.db.query(InvoiceReturn).options(
            joinedload(InvoiceReturn.return_items),
            joinedload(InvoiceReturn.refund_payment)
        ).filter(
            InvoiceReturn.invoice_id == invoice_id
        ).order_by(InvoiceReturn.created_at.desc()).all()

    def get_customer_returns(self, customer_id: int) -> List[InvoiceReturn]:
        """
        Get all returns for a customer.

        Args:
            customer_id: Customer ID

        Returns:
            List of InvoiceReturn objects
        """
        return self.db.query(InvoiceReturn).join(Invoice).options(
            joinedload(InvoiceReturn.invoice),
            joinedload(InvoiceReturn.return_items),
            joinedload(InvoiceReturn.refund_payment)
        ).filter(
            Invoice.customer_id == customer_id
        ).order_by(InvoiceReturn.created_at.desc()).all()

    def get_return(self, return_id: int) -> Optional[InvoiceReturn]:
        """
        Get a specific return by ID.

        Args:
            return_id: Return ID

        Returns:
            InvoiceReturn object or None
        """
        return self.db.query(InvoiceReturn).options(
            joinedload(InvoiceReturn.return_items),
            joinedload(InvoiceReturn.invoice),
            joinedload(InvoiceReturn.refund_payment)
        ).filter(InvoiceReturn.id == return_id).first()

    def update_return_status(
        self,
        return_id: int,
        new_status: str,
        payment_method: Optional[str] = None,
        notes: Optional[str] = None
    ) -> InvoiceReturn:
        """
        Update return status between pending_refund and refunded.

        When changing to 'refunded':
        - Creates Payment record if not exists
        - Reduces invoice.remaining_amount

        When changing to 'pending_refund':
        - Deletes Payment record
        - Restores invoice.remaining_amount

        Args:
            return_id: Return ID
            new_status: New status (pending_refund or refunded)
            payment_method: Payment method (required when changing to refunded)
            notes: Optional notes for status change

        Returns:
            Updated InvoiceReturn object

        Raises:
            ValueError: If validation fails
        """
        # Validate status
        if new_status not in ['pending_refund', 'refunded']:
            raise ValueError("Trạng thái phải là 'pending_refund' hoặc 'refunded'")

        # Get return with relationships
        invoice_return = self.db.query(InvoiceReturn).options(
            joinedload(InvoiceReturn.invoice),
            joinedload(InvoiceReturn.refund_payment)
        ).filter(InvoiceReturn.id == return_id).first()

        if not invoice_return:
            raise ValueError(f"Không tìm thấy phiếu hoàn trả với ID {return_id}")

        old_status = invoice_return.status

        # No change
        if old_status == new_status:
            return invoice_return

        invoice = invoice_return.invoice

        # Transition: pending_refund -> refunded
        if old_status == 'pending_refund' and new_status == 'refunded':
            if not payment_method:
                raise ValueError("Phương thức thanh toán là bắt buộc khi chuyển sang trạng thái 'refunded'")

            # Step 1: Apply credit for returned goods (reduces what customer owes)
            invoice.remaining_amount -= invoice_return.refund_amount
            # Example: 23M - 32M = -9M (shop owes customer 9M)

            # Step 2: Calculate net settlement amount (actual cash to pay customer)
            # If remaining is negative, shop owes customer -> settlement needed
            settlement_amount = abs(min(0, invoice.remaining_amount))
            # Example: abs(min(0, -9M)) = 9M (cash shop needs to pay)

            # Step 3: Create settlement payment (if shop owes customer)
            if settlement_amount > 0:
                if not invoice_return.refund_payment_id:
                    # Create payment for SETTLEMENT amount (not full refund amount!)
                    settlement_payment = self._create_refund_payment(
                        invoice=invoice,
                        refund_amount=settlement_amount,  # Actual cash out
                        payment_method=payment_method,
                        reason= f"Settlement for return {invoice_return.return_number}: {invoice_return.reason}",
                        return_number=invoice_return.return_number
                    )
                    invoice_return.refund_payment_id = settlement_payment.id

                # Step 4: Allocate settlement payment
                self._allocate_settlement_to_invoice(
                    invoice=invoice,
                    settlement_amount=settlement_amount
                )
                # After allocation: refunded_amount += 9M, remaining = 0

            # Step 5: Update invoice status
            if invoice.remaining_amount <= 0.01:  # Float tolerance
                invoice.status = 'paid'
                invoice.remaining_amount = 0  # Clean up float errors
            elif invoice.remaining_amount > 0:
                invoice.status = 'pending'

        # Transition: refunded -> pending_refund (BLOCKED)
        elif old_status == 'refunded' and new_status == 'pending_refund':
            raise ValueError("Không thể hủy hoàn tiền khi đã xác nhận hoàn tiền (đã xuất quỹ).")

        # Update status
        invoice_return.status = new_status

        # Add notes
        if notes:
            status_note = f"[Thay đổi trạng thái: {old_status} -> {new_status}] {notes}"
            if invoice_return.notes:
                invoice_return.notes += f"\n{status_note}"
            else:
                invoice_return.notes = status_note

        self.db.commit()
        self.db.refresh(invoice_return)
        return invoice_return

    def get_available_return_quantities(self, invoice_id: int) -> List[Dict]:
        """
        Get available quantities for return for each invoice item.

        Args:
            invoice_id: Invoice ID

        Returns:
            List of dicts with available return info for each item
        """
        # Eager load items, products and units for performance and data access
        invoice = self.db.query(Invoice).options(
            joinedload(Invoice.items).joinedload(InvoiceItem.product).joinedload(Product.unit_ref)
        ).filter(Invoice.id == invoice_id).first()
        
        if not invoice:
            raise ValueError(f"Không tìm thấy hóa đơn với ID {invoice_id}")

        result = []
        for item in invoice.items:
            # Calculate already returned quantity
            already_returned = self.db.query(
                func.sum(InvoiceReturnItem.quantity_returned)
            ).join(InvoiceReturn).filter(
                InvoiceReturnItem.invoice_item_id == item.id,
                InvoiceReturn.invoice_id == invoice_id
            ).scalar() or 0

            available = item.quantity - already_returned

            # Determine allows_decimal
            allows_decimal = True # Default to True (allow float) if unknown
            
            # Logic: 
            # 1. Try to get from Product -> Unit relation
            # 2. If not available, try to look up Unit by name (fallback for when product is deleted or unit changed)
            
            if item.product and item.product.unit_ref:
                allows_decimal = item.product.unit_ref.allows_decimal
            else:
                # Fallback: check unit by name
                # We need to verify if the unit name in InvoiceItem corresponds to a Unit record
                unit_name = item.unit
                if unit_name:
                    unit_obj = self.db.query(Unit).filter(Unit.name == unit_name).first()
                    if unit_obj:
                        allows_decimal = unit_obj.allows_decimal
                    else:
                        # Hardcoded fallback for common integer units if not found in DB
                        # This matches the previous frontend logic as a safety net
                        integer_units = [
                            'cái', 'chiếc', 'bộ', 'hộp', 'thùng',
                            'viên', 'chai', 'lọ', 'hũ', 'gói', 'bao', 'con'
                        ]
                        if unit_name.lower().strip() in integer_units:
                            allows_decimal = False

            result.append({
                'invoice_item_id': item.id,
                'product_id': item.product_id,
                'product_name': item.product_name,
                'original_quantity': item.quantity,
                'already_returned': already_returned,
                'available_for_return': available,
                'unit': item.unit,
                'allows_decimal': allows_decimal,
                'product_price': item.product_price
            })

        return result

    # Private helper methods

    def _validate_invoice_eligibility(self, invoice_id: int) -> Invoice:
        """
        Validate that invoice is eligible for return.

        Args:
            invoice_id: Invoice ID

        Returns:
            Invoice object

        Raises:
            ValueError: If invoice not found or not eligible
        """
        invoice = self.db.query(Invoice).options(
            joinedload(Invoice.items)
        ).filter(Invoice.id == invoice_id).first()

        if not invoice:
            raise ValueError(f"Không tìm thấy hóa đơn với ID {invoice_id}")

        if invoice.status not in ['paid', 'pending']:
            raise ValueError(
                f"Chỉ có thể hoàn trả hóa đơn ở trạng thái 'Đã thanh toán' hoặc 'Chưa thanh toán'. "
                f"Trạng thái hiện tại: '{invoice.status}'"
            )

        if len(invoice.items) == 0:
            raise ValueError("Hóa đơn không có sản phẩm nào để hoàn trả")

        return invoice

    def _validate_return_items(
        self,
        invoice: Invoice,
        return_items: List[InvoiceReturnItemCreate]
    ) -> List[Dict]:
        """
        Validate return items and calculate subtotals.

        Args:
            invoice: Invoice object
            return_items: List of return item data

        Returns:
            List of validated item dicts with calculated fields

        Raises:
            ValueError: If validation fails
        """
        validated = []
        invoice_item_ids = {item.id for item in invoice.items}

        for item_data in return_items:
            # Check invoice_item_id belongs to this invoice
            if item_data.invoice_item_id not in invoice_item_ids:
                raise ValueError(
                    f"Invoice item {item_data.invoice_item_id} không thuộc hóa đơn này"
                )

            # Get invoice item
            invoice_item = next(
                (item for item in invoice.items if item.id == item_data.invoice_item_id),
                None
            )

            # Calculate already returned quantity
            already_returned = self.db.query(
                func.sum(InvoiceReturnItem.quantity_returned)
            ).join(InvoiceReturn).filter(
                InvoiceReturnItem.invoice_item_id == item_data.invoice_item_id,
                InvoiceReturn.invoice_id == invoice.id
            ).scalar() or 0

            available = invoice_item.quantity - already_returned

            # Validate quantity
            if item_data.quantity_returned > available:
                raise ValueError(
                    f"Không thể hoàn trả {item_data.quantity_returned} {invoice_item.unit} "
                    f"của '{invoice_item.product_name}'. "
                    f"Số lượng khả dụng: {available} {invoice_item.unit}"
                )

            # Calculate subtotal
            subtotal = item_data.quantity_returned * invoice_item.product_price

            validated.append({
                'invoice_item_id': item_data.invoice_item_id,
                'product_id': invoice_item.product_id,
                'product_name': invoice_item.product_name,
                'product_price': invoice_item.product_price,
                'unit': invoice_item.unit,
                'quantity_returned': item_data.quantity_returned,
                'subtotal': subtotal,
                'restore_inventory': item_data.restore_inventory
            })

        return validated

    def _calculate_refund_amount(self, validated_items: List[Dict]) -> float:
        """
        Calculate total refund amount from validated items.

        Args:
            validated_items: List of validated item dicts

        Returns:
            Total refund amount
        """
        return sum(item['subtotal'] for item in validated_items)

    def _is_full_return(self, invoice: Invoice, validated_items: List[Dict]) -> bool:
        """
        Determine if this is a full return.

        Args:
            invoice: Invoice object
            validated_items: List of validated item dicts

        Returns:
            True if all items are fully returned
        """
        # Get all already returned quantities
        for item in invoice.items:
            already_returned = self.db.query(
                func.sum(InvoiceReturnItem.quantity_returned)
            ).join(InvoiceReturn).filter(
                InvoiceReturnItem.invoice_item_id == item.id,
                InvoiceReturn.invoice_id == invoice.id
            ).scalar() or 0

            # Add current return quantity
            current_return = sum(
                v['quantity_returned']
                for v in validated_items
                if v['invoice_item_id'] == item.id
            )

            total_returned = already_returned + current_return

            # If any item is not fully returned, this is not a full return
            if total_returned < item.quantity:
                return False

        return True

    def _restore_inventory(self, validated_items: List[Dict]) -> None:
        """
        Restore product inventory for items with restore_inventory=True.

        Args:
            validated_items: List of validated item dicts
        """
        for item_data in validated_items:
            if item_data['restore_inventory'] and item_data['product_id']:
                product = self.db.query(Product).filter(
                    Product.id == item_data['product_id']
                ).first()

                if product:
                    product.stock_quantity += item_data['quantity_returned']

    def _allocate_settlement_to_invoice(self, invoice: Invoice, settlement_amount: float) -> None:
        """
        Allocate settlement payment to invoice.

        Settlement = actual cash paid to customer to clear negative balance.
        This is different from the credit for returned goods.

        Args:
            settlement_amount: Positive value of cash paid to customer (e.g., 9M)
        """
        # Update invoice financial fields
        invoice.refunded_amount += settlement_amount  # Track cash OUT
        invoice.remaining_amount += settlement_amount  # Clear the negative balance
        # Example: refunded_amount = 0 + 9M = 9M
        #          remaining_amount = -9M + 9M = 0 ✓

        invoice.updated_at = get_vn_time()

        # Clean up float errors
        if abs(invoice.remaining_amount) <= 0.01:
            invoice.remaining_amount = 0

        self.db.flush()

    def _reverse_settlement_allocation(self, invoice: Invoice, settlement_amount: float) -> None:
        """
        Reverse a settlement payment allocation.

        Args:
            settlement_amount: Positive value of settlement being reversed
        """
        invoice.refunded_amount -= settlement_amount
        invoice.remaining_amount -= settlement_amount
        # Example: refunded_amount = 9M - 9M = 0
        #          remaining_amount = 0 - 9M = -9M (shop owes customer again)

        invoice.updated_at = get_vn_time()
        self.db.flush()

    def _create_refund_payment(
        self,
        invoice: Invoice,
        refund_amount: float,
        payment_method: str,
        reason: str,
        return_number: str
    ) -> Payment:
        """
        Create a negative payment record for refund.

        Args:
            invoice: Invoice object
            refund_amount: Amount to refund (positive value) - SETTLEMENT AMOUNT
            payment_method: Payment method
            reason: Return reason
            return_number: Return number for reference

        Returns:
            Created Payment object
        """
        # Create negative payment
        payment = Payment(
            payment_number=f"REFUND-{return_number}",
            customer_id=invoice.customer_id,
            amount=-refund_amount,  # NEGATIVE amount (Cash OUT)
            payment_method=payment_method,
            notes=f"[HOÀN TRẢ] {reason}",
            payment_date=get_vn_time()
        )
        self.db.add(payment)
        self.db.flush()

        # Create negative allocation
        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=invoice.id,
            amount=-refund_amount,  # NEGATIVE amount
            notes=f"Hoàn trả: {return_number}"
        )
        self.db.add(allocation)
        
        return payment

    def _generate_return_number(self) -> str:
        """
        Generate unique return number: RET-YYYYMMDD-XXXX

        Returns:
            Return number string
        """
        now = get_vn_time()
        prefix = f"RET-{now.strftime('%Y%m%d')}"

        # Count returns with this prefix today
        count = self.db.query(InvoiceReturn).filter(
            InvoiceReturn.return_number.like(f"{prefix}%")
        ).count()

        return f"{prefix}-{count + 1:04d}"

    def generate_return_pdf(self, return_id: int, company_name: str = "Voi Store") -> str:
        """
        Generate PDF for invoice return.

        Args:
            return_id: Invoice Return ID
            company_name: Company name to display

        Returns:
            Path to generated PDF file

        Raises:
            ValueError: If return not found
        """
        # Get return with full details
        invoice_return = self.db.query(InvoiceReturn).options(
            joinedload(InvoiceReturn.return_items),
            joinedload(InvoiceReturn.invoice)
        ).filter(InvoiceReturn.id == return_id).first()

        if not invoice_return:
            raise ValueError(f"Invoice return {return_id} not found")

        # Create PDF filename
        pdf_filename = f"{invoice_return.return_number}.pdf"
        pdf_path = os.path.join(self.output_dir, pdf_filename)

        # Create PDF
        doc = SimpleDocTemplate(pdf_path, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=FONT_BOLD,
            fontSize=24,
            textColor=colors.HexColor('#C0392B'),  # Red color for return
            spaceAfter=30,
            alignment=1  # Center
        )

        elements.append(Paragraph(f"<b>{company_name}</b>", title_style))
        elements.append(Paragraph("PHIẾU HOÀN TRẢ", title_style))
        elements.append(Spacer(1, 12))

        # Return info
        info_style = ParagraphStyle(
            'InfoStyle',
            parent=styles['Normal'],
            fontName=FONT_NORMAL,
            fontSize=10
        )

        elements.append(Paragraph(f"<b>Số phiếu hoàn trả:</b> {invoice_return.return_number}", info_style))
        elements.append(Paragraph(
            f"<b>Ngày hoàn trả:</b> {invoice_return.created_at.strftime('%d/%m/%Y %H:%M')}",
            info_style
        ))
        elements.append(Paragraph(
            f"<b>Hóa đơn gốc:</b> {invoice_return.invoice.invoice_number}",
            info_style
        ))

        if invoice_return.invoice.customer_name:
            elements.append(Paragraph(
                f"<b>Khách hàng:</b> {invoice_return.invoice.customer_name}",
                info_style
            ))
        if invoice_return.invoice.customer_phone:
            elements.append(Paragraph(
                f"<b>Số điện thoại:</b> {invoice_return.invoice.customer_phone}",
                info_style
            ))

        elements.append(Spacer(1, 12))

        # Reason for return (highlighted)
        reason_style = ParagraphStyle(
            'ReasonStyle',
            parent=styles['Normal'],
            fontName=FONT_NORMAL,
            fontSize=10,
            textColor=colors.HexColor('#E74C3C'),
            leftIndent=10,
            rightIndent=10
        )
        elements.append(Paragraph(f"<b>Lý do hoàn trả:</b> {invoice_return.reason}", reason_style))
        elements.append(Spacer(1, 20))

        # Return items table
        header_style = ParagraphStyle(
            'HeaderStyle',
            parent=styles['Normal'],
            fontName=FONT_BOLD,
            fontSize=8,
            textColor=colors.whitesmoke,
            alignment=1  # Center
        )

        table_data = [[
            Paragraph('<b>STT</b>', header_style),
            Paragraph('<b>Sản phẩm</b>', header_style),
            Paragraph('<b>Đơn giá<br/>(VNĐ)</b>', header_style),
            Paragraph('<b>SL hoàn</b>', header_style),
            Paragraph('<b>Đơn vị</b>', header_style),
            Paragraph('<b>Thành tiền<br/>(VNĐ)</b>', header_style)
        ]]

        product_style = ParagraphStyle(
            'ProductStyle',
            parent=styles['Normal'],
            fontName=FONT_NORMAL,
            fontSize=8,
            alignment=0  # Left align
        )

        for idx, item in enumerate(invoice_return.return_items, 1):
            table_data.append([
                str(idx),
                Paragraph(item.product_name, product_style),
                f"{item.product_price:,.0f}",
                f"-{item.quantity_returned}",  # Negative quantity
                item.unit,
                f"-{item.subtotal:,.0f}"  # Negative subtotal
            ])

        # Table styling
        table = Table(table_data, colWidths=[25, 135, 70, 50, 50, 120])
        table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E74C3C')),  # Red header
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),

            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#FADBD8')),  # Light red
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # STT
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Price
            ('ALIGN', (3, 1), (3, -1), 'CENTER'),  # Quantity
            ('ALIGN', (4, 1), (4, -1), 'CENTER'),  # Unit
            ('ALIGN', (5, 1), (5, -1), 'RIGHT'),   # Subtotal
            ('FONTNAME', (0, 1), (-1, -1), FONT_NORMAL),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 20))

        # Total refund amount
        total_style = ParagraphStyle(
            'TotalStyle',
            parent=styles['Normal'],
            fontName=FONT_BOLD,
            fontSize=12,
            alignment=2  # Right align
        )
        elements.append(Paragraph(
            f"<b>Tổng tiền hoàn trả: -{invoice_return.refund_amount:,.0f} VNĐ</b>",
            total_style
        ))
        elements.append(Spacer(1, 20))

        # Notes if exists
        if invoice_return.notes:
            notes_style = ParagraphStyle(
                'NotesStyle',
                parent=styles['Normal'],
                fontName=FONT_NORMAL,
                fontSize=9,
                leftIndent=10
            )
            elements.append(Paragraph(f"<b>Ghi chú:</b> {invoice_return.notes}", notes_style))
            elements.append(Spacer(1, 20))

        # Signature section
        signature_table = Table([
            ['Người hoàn trả', 'Người nhận'],
            ['(Ký, ghi rõ họ tên)', '(Ký, ghi rõ họ tên)']
        ], colWidths=[250, 250])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Oblique' if FONT_NORMAL == 'Helvetica' else FONT_NORMAL),
            ('FONTSIZE', (0, 1), (-1, 1), 9),
            ('TOPPADDING', (0, 0), (-1, 0), 40),
        ]))
        elements.append(Spacer(1, 30))
        elements.append(signature_table)

        # Build PDF
        doc.build(elements)
        
        # Set exported_at timestamp if this is the first export
        if not invoice_return.exported_at:
            invoice_return.exported_at = get_vn_time()
            self.db.commit()

        return pdf_path
