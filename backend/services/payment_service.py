"""Payment service - handles payment recording and debt management."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, case

from database.models import (
    Payment, PaymentAllocation, Invoice, Customer, get_vn_time
)


class PaymentService:
    """Service for payment operations."""

    def __init__(self, db: Session, invoice_dir: str = "data/invoices"):
        """
        Initialize payment service.

        Args:
            db: Database session
            invoice_dir: Directory for invoice files (for receipt generation)
        """
        self.db = db
        self.invoice_dir = invoice_dir

    def record_payment(
        self,
        customer_id: int,
        amount: float,
        payment_method: str,
        invoice_ids: Optional[List[int]] = None,
        manual_allocations: Optional[Dict[int, float]] = None,
        notes: Optional[str] = None,
        payment_date: Optional[datetime] = None,
        created_by: Optional[str] = None
    ) -> Payment:
        """
        Record a payment with FIFO allocation or manual override.

        Modes:
        - FIFO Auto: invoice_ids=None, manual_allocations=None
            → Allocate to all unpaid invoices in chronological order
        - Semi-Auto: invoice_ids=[...], manual_allocations=None
            → FIFO allocation within selected invoices only
        - Manual: manual_allocations={invoice_id: amount}
            → User specifies exact allocation for each invoice

        Args:
            customer_id: Customer making payment
            amount: Payment amount
            payment_method: 'cash', 'transfer', or 'card'
            invoice_ids: Optional list of invoice IDs for manual selection
            manual_allocations: Optional dict of invoice_id -> amount
            notes: Payment notes
            payment_date: Payment date (defaults to now)
            created_by: Username/staff who recorded payment

        Returns:
            Created Payment object with allocations

        Raises:
            ValueError: If validation fails
        """
        # Validation
        if amount <= 0:
            raise ValueError("Số tiền thanh toán phải lớn hơn 0")

        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Không tìm thấy khách hàng với ID {customer_id}")

        # Create payment record
        payment_number = self._generate_payment_number()
        payment = Payment(
            payment_number=payment_number,
            customer_id=customer_id,
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date or get_vn_time(),
            notes=notes,
            created_by=created_by
        )
        self.db.add(payment)
        self.db.flush()  # Get payment.id

        # Allocate payment
        if manual_allocations:
            # Manual mode: Use provided allocations
            remaining = amount
            for invoice_id, alloc_amount in manual_allocations.items():
                if alloc_amount > remaining:
                    raise ValueError(
                        f"Phân bổ vượt quá số tiền thanh toán. "
                        f"Còn lại: {remaining}, yêu cầu: {alloc_amount}"
                    )
                self._allocate_to_invoice(payment, invoice_id, alloc_amount)
                remaining -= alloc_amount

        elif invoice_ids:
            # Semi-auto: FIFO within selected invoices
            invoices = self.db.query(Invoice).filter(
                Invoice.id.in_(invoice_ids),
                Invoice.customer_id == customer_id,
                Invoice.remaining_amount > 0
            ).order_by(Invoice.created_at.asc()).all()

            if not invoices:
                raise ValueError("Không tìm thấy hóa đơn hợp lệ để thanh toán")

            remaining = amount
            for invoice in invoices:
                if remaining <= 0:
                    break
                alloc = min(remaining, invoice.remaining_amount)
                self._allocate_to_invoice(payment, invoice.id, alloc)
                remaining -= alloc

        else:
            # Full auto: FIFO on all unpaid invoices
            # STATUS: Only 'pending' or 'paid' (exclude 'processing' and 'cancelled')
            # EXPORT: Only exported invoices (exported_at IS NOT NULL)
            invoices = self.db.query(Invoice).filter(
                Invoice.customer_id == customer_id,
                Invoice.status.in_(['pending', 'paid']),
                Invoice.remaining_amount > 0,
                Invoice.exported_at.isnot(None)  # Only exported invoices
            ).order_by(Invoice.created_at.asc()).all()

            if not invoices:
                raise ValueError(
                    f"Khách hàng {customer.name} không có hóa đơn nào cần thanh toán"
                )

            # Check overpayment
            total_debt = sum(inv.remaining_amount for inv in invoices)
            if amount > total_debt:
                raise ValueError(
                    f"Số tiền thanh toán ({amount:,.0f}) vượt quá tổng nợ ({total_debt:,.0f})"
                )

            remaining = amount
            for invoice in invoices:
                if remaining <= 0:
                    break
                alloc = min(remaining, invoice.remaining_amount)
                self._allocate_to_invoice(payment, invoice.id, alloc)
                remaining -= alloc

        self.db.commit()
        self.db.refresh(payment)

        return payment

    def _allocate_to_invoice(self, payment: Payment, invoice_id: int, amount: float):
        """
        Allocate payment to an invoice and update invoice status.

        Args:
            payment: Payment object
            invoice_id: Invoice ID to allocate to
            amount: Amount to allocate

        Raises:
            ValueError: If validation fails
        """
        # Get invoice with row lock to prevent concurrent updates
        invoice = self.db.query(Invoice).with_for_update().filter(
            Invoice.id == invoice_id
        ).first()

        if not invoice:
            raise ValueError(f"Không tìm thấy hóa đơn với ID {invoice_id}")

        if amount > invoice.remaining_amount + 0.01:  # Float tolerance
            raise ValueError(
                f"Số tiền ({amount:,.0f}) vượt quá nợ còn lại của hóa đơn "
                f"{invoice.invoice_number} ({invoice.remaining_amount:,.0f})"
            )

        # Create allocation record
        allocation = PaymentAllocation(
            payment_id=payment.id,
            invoice_id=invoice.id,
            amount=amount
        )
        self.db.add(allocation)

        # Update invoice
        invoice.paid_amount += amount
        invoice.remaining_amount -= amount
        invoice.updated_at = get_vn_time()

        # Update invoice status
        if invoice.remaining_amount <= 0.01:  # Fully paid (float tolerance)
            invoice.status = 'paid'
            invoice.remaining_amount = 0  # Clean up float errors
        # Else: keep as 'pending' (now partially paid)

        self.db.flush()

    def _generate_payment_number(self) -> str:
        """
        Generate unique payment number: PAY-YYYYMMDD-XXXX

        Returns:
            Payment number string
        """
        now = get_vn_time()
        prefix = f"PAY-{now.strftime('%Y%m%d')}"

        # Count payments with this prefix today
        count = self.db.query(Payment).filter(
            Payment.payment_number.like(f"{prefix}%")
        ).count()

        return f"{prefix}-{count + 1:04d}"

    def get_payment(self, payment_id: int) -> Optional[Payment]:
        """
        Get payment by ID with allocations.

        Args:
            payment_id: Payment ID

        Returns:
            Payment object or None
        """
        return self.db.query(Payment).options(
            joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice),
            joinedload(Payment.customer)
        ).filter(Payment.id == payment_id).first()

    def get_customer_debt_summary(self, customer_id: int) -> Dict:
        """
        Get comprehensive debt summary for a customer.

        Args:
            customer_id: Customer ID

        Returns:
            Dict with:
            - total_debt: Total outstanding amount
            - total_invoices: Number of unpaid/partial invoices
            - unpaid_invoices: Count of invoices with paid_amount = 0
            - partially_paid_invoices: Count of invoices with 0 < paid < total
            - overdue_debt: Amount overdue (>30 days)
            - overdue_invoices: Count of overdue invoices
            - invoices: List of unpaid/partial invoices

        Raises:
            ValueError: If customer not found
        """
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            raise ValueError(f"Không tìm thấy khách hàng với ID {customer_id}")

        # Get all invoices with remaining debt
        # STATUS: Only 'pending' or 'paid' (exclude 'processing' and 'cancelled')
        # EXPORT: Only exported invoices (exported_at IS NOT NULL)
        invoices = self.db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(['pending', 'paid']),
            Invoice.remaining_amount > 0,
            Invoice.exported_at.isnot(None)  # Only count exported invoices in debt
        ).order_by(Invoice.created_at.asc()).all()

        # Calculate total revenue (only exported invoices with pending/paid status)
        # Must match debt calculation rules: exported_at IS NOT NULL + status in ['pending', 'paid']
        revenue_query = self.db.query(func.sum(Invoice.total)).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(['pending', 'paid']),
            Invoice.exported_at.isnot(None)
        )
        total_revenue = revenue_query.scalar() or 0.0

        # Calculate total refunded amount (VALUE of returned goods, not just cash settlements)
        # We need to use total_returned_amount property which sums all InvoiceReturn.refund_amount
        # This represents the actual value of goods returned, not just settlement cash
        #
        # Example: Invoice 32M, paid 9M, return all goods (32M value) → settlement 9M cash
        #   - inv.refunded_amount = 9M (cash OUT)
        #   - inv.total_returned_amount = 32M (goods VALUE) ✓ Use this for revenue calculation
        all_exported_invoices = self.db.query(Invoice).filter(
            Invoice.customer_id == customer_id,
            Invoice.status.in_(['pending', 'paid']),
            Invoice.exported_at.isnot(None)
        ).all()

        total_refunded = sum(
            inv.total_returned_amount  # VALUE of returned goods (from all InvoiceReturn.refund_amount)
            for inv in all_exported_invoices
        )

        # Calculate net revenue (revenue after deducting value of returned goods)
        total_net_revenue = total_revenue - total_refunded

        # Calculate totals
        total_debt = sum(inv.remaining_amount for inv in invoices)
        unpaid_count = sum(1 for inv in invoices if inv.paid_amount == 0)
        partially_paid_count = sum(
            1 for inv in invoices
            if inv.paid_amount > 0 and inv.remaining_amount > 0.01
        )

        # Overdue calculation (invoices older than 30 days)
        now = get_vn_time()
        overdue_threshold = now - timedelta(days=30)

        # Handle timezone-aware and timezone-naive datetime comparison
        overdue_invoices = []
        for inv in invoices:
            try:
                # Try direct comparison first
                if inv.created_at < overdue_threshold:
                    overdue_invoices.append(inv)
            except TypeError:
                # If comparison fails due to timezone mismatch, convert both to naive
                inv_naive = inv.created_at.replace(tzinfo=None) if inv.created_at.tzinfo else inv.created_at
                threshold_naive = overdue_threshold.replace(tzinfo=None)
                if inv_naive < threshold_naive:
                    overdue_invoices.append(inv)

        overdue_debt = sum(inv.remaining_amount for inv in overdue_invoices)

        return {
            'total_debt': total_debt,
            'total_revenue': total_revenue,  # Gross revenue (original invoice totals)
            'total_refunded': total_refunded,  # Total refunds (payment reversals + returns)
            'total_net_revenue': total_net_revenue,  # Net revenue (revenue - refunds)
            'total_invoices': len(invoices),

            'unpaid_invoices': unpaid_count,
            'partially_paid_invoices': partially_paid_count,
            'overdue_debt': overdue_debt,
            'overdue_invoices': len(overdue_invoices),
            'invoices': invoices
        }

    def get_payment_history(
        self,
        invoice_id: Optional[int] = None,
        customer_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Payment], int]:
        """
        Get payment history with filters.

        Args:
            invoice_id: Filter by invoice ID
            customer_id: Filter by customer ID
            start_date: Filter by payment date >= start_date
            end_date: Filter by payment date <= end_date
            limit: Max results to return
            offset: Number of results to skip

        Returns:
            Tuple of (payments, total_count)
        """
        query = self.db.query(Payment).options(
            joinedload(Payment.allocations).joinedload(PaymentAllocation.invoice),
            joinedload(Payment.customer)
        )

        # Apply filters
        if invoice_id:
            query = query.join(Payment.allocations).filter(
                PaymentAllocation.invoice_id == invoice_id
            )

        if customer_id:
            query = query.filter(Payment.customer_id == customer_id)

        if start_date:
            query = query.filter(Payment.payment_date >= start_date)

        if end_date:
            query = query.filter(Payment.payment_date <= end_date)

        # Get total count
        total = query.count()

        # Get paginated results
        payments = query.order_by(
            Payment.payment_date.desc()
        ).limit(limit).offset(offset).all()

        return payments, total

    def get_invoice_payment_allocations(self, invoice_id: int) -> List[PaymentAllocation]:
        """
        Get all payment allocations for an invoice.

        Args:
            invoice_id: Invoice ID

        Returns:
            List of PaymentAllocation objects
        """
        return self.db.query(PaymentAllocation).options(
            joinedload(PaymentAllocation.payment).joinedload(Payment.customer)
        ).filter(
            PaymentAllocation.invoice_id == invoice_id
        ).order_by(PaymentAllocation.allocation_date.desc()).all()

    def reverse_payment(self, payment_id: int, reason: str) -> None:
        """
        Reverse a payment (for corrections).

        This:
        - Reverses all allocations (updates invoice paid_amount and remaining_amount)
        - Updates invoice status if needed
        - Marks payment as reversed in notes
        - Does NOT delete the payment (audit trail)

        Args:
            payment_id: Payment ID to reverse
            reason: Reason for reversal

        Raises:
            ValueError: If payment not found
        """
        payment = self.get_payment(payment_id)
        if not payment:
            raise ValueError(f"Không tìm thấy thanh toán với ID {payment_id}")

        # Check if already reversed
        if payment.notes and "[ĐÃ HỦY]" in payment.notes:
            raise ValueError("Thanh toán này đã được hoàn trả trước đó")

        # Reverse all allocations
        for allocation in payment.allocations:
            invoice = self.db.query(Invoice).with_for_update().filter(
                Invoice.id == allocation.invoice_id
            ).first()

            if invoice:
                # Reverse the allocation
                invoice.paid_amount -= allocation.amount
                invoice.remaining_amount += allocation.amount

                # Revert invoice status if needed
                if invoice.paid_amount == 0:
                    invoice.status = 'pending'
                elif invoice.status == 'paid' and invoice.remaining_amount > 0.01:
                    # Was fully paid, now has remaining balance
                    invoice.status = 'pending'

                invoice.updated_at = get_vn_time()

        # Mark payment as reversed
        payment.notes = f"[ĐÃ HỦY] {reason}\n{payment.notes or ''}"
        payment.updated_at = get_vn_time()

        self.db.commit()
