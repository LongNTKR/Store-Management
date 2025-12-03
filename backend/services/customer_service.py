"""Customer management service."""

from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database.models import Customer, Invoice


class CustomerService:
    """Service for customer management operations."""

    def __init__(self, db_session: Session):
        """
        Initialize customer service.

        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session

    def create_customer(
        self,
        name: str,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        address: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Customer:
        """
        Create a new customer.

        Args:
            name: Customer name
            phone: Customer phone number
            email: Customer email
            address: Customer address
            notes: Additional notes

        Returns:
            Created Customer object
        """
        customer = Customer(
            name=name,
            phone=phone,
            email=email,
            address=address,
            notes=notes
        )

        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)

        return customer

    def get_customer(self, customer_id: int) -> Optional[Customer]:
        """
        Get customer by ID.

        Args:
            customer_id: Customer ID

        Returns:
            Customer object or None
        """
        return self.db.query(Customer).filter(Customer.id == customer_id).first()

    def get_customer_by_phone(self, phone: str) -> Optional[Customer]:
        """
        Get customer by phone number.

        Args:
            phone: Phone number

        Returns:
            Customer object or None
        """
        return self.db.query(Customer).filter(Customer.phone == phone).first()

    def search_customers(self, query: str, is_active: bool = True) -> List[Customer]:
        """
        Search customers by name, phone, or email.

        Args:
            query: Search query
            is_active: Filter by active status

        Returns:
            List of matching customers
        """
        return self.db.query(Customer).filter(
            Customer.is_active == is_active,
            or_(
                Customer.name.contains(query),
                Customer.phone.contains(query),
                Customer.email.contains(query)
            )
        ).all()

    def get_all_customers(self, is_active: bool = True) -> List[Customer]:
        """
        Get all customers.

        Args:
            is_active: Filter by active status

        Returns:
            List of all customers
        """
        return self.db.query(Customer).filter(
            Customer.is_active == is_active
        ).order_by(Customer.name).all()

    def update_customer(
        self,
        customer_id: int,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        address: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Optional[Customer]:
        """
        Update customer information.

        Args:
            customer_id: Customer ID
            name: New customer name
            phone: New phone number
            email: New email
            address: New address
            notes: New notes

        Returns:
            Updated Customer object or None
        """
        customer = self.get_customer(customer_id)
        if not customer:
            return None

        if name is not None:
            customer.name = name

        if phone is not None:
            customer.phone = phone

        if email is not None:
            customer.email = email

        if address is not None:
            customer.address = address

        if notes is not None:
            customer.notes = notes

        customer.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(customer)

        return customer

    def delete_customer(self, customer_id: int) -> bool:
        """
        Soft delete a customer (set is_active to False).

        Args:
            customer_id: Customer ID

        Returns:
            True if successful, False otherwise
        """
        customer = self.get_customer(customer_id)
        if not customer:
            return False

        customer.is_active = False
        customer.updated_at = datetime.utcnow()

        self.db.commit()
        return True

    def get_customer_invoices(self, customer_id: int) -> List[Invoice]:
        """
        Get all invoices for a customer.

        Args:
            customer_id: Customer ID

        Returns:
            List of customer invoices
        """
        return self.db.query(Invoice).filter(
            Invoice.customer_id == customer_id
        ).order_by(Invoice.created_at.desc()).all()

    def get_customer_total_spent(self, customer_id: int) -> float:
        """
        Calculate total amount spent by customer.

        Args:
            customer_id: Customer ID

        Returns:
            Total amount spent
        """
        invoices = self.get_customer_invoices(customer_id)
        return sum(invoice.total for invoice in invoices if invoice.status == 'paid')

    def get_customer_stats(self, customer_id: int) -> dict:
        """
        Get customer statistics.

        Args:
            customer_id: Customer ID

        Returns:
            Dictionary with customer statistics
        """
        invoices = self.get_customer_invoices(customer_id)

        total_invoices = len(invoices)
        paid_invoices = len([inv for inv in invoices if inv.status == 'paid'])
        pending_invoices = len([inv for inv in invoices if inv.status == 'pending'])
        total_spent = sum(inv.total for inv in invoices if inv.status == 'paid')

        return {
            'total_invoices': total_invoices,
            'paid_invoices': paid_invoices,
            'pending_invoices': pending_invoices,
            'total_spent': total_spent,
            'average_order_value': total_spent / paid_invoices if paid_invoices > 0 else 0
        }
