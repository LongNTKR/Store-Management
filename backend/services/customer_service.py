"""Customer management service."""

from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from rapidfuzz import fuzz

from database.models import Customer, Invoice, get_vn_time
from utils.text_utils import normalize_vietnamese, normalize_phone, normalize_email
from config import Config


class CustomerService:
    """Service for customer management operations."""

    def __init__(self, db_session: Session):
        """
        Initialize customer service.

        Args:
            db_session: SQLAlchemy database session
        """
        self.db = db_session

    def _normalize_page_params(self, limit: int, offset: int, max_limit: int = Config.MAX_PAGE_SIZE) -> tuple[int, int]:
        """Clamp pagination inputs to safe values."""
        safe_limit = max(1, min(limit or 0, max_limit))
        safe_offset = max(0, offset or 0)
        return safe_limit, safe_offset

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
            normalized_name=normalize_vietnamese(name) if name else None,
            phone=phone,
            normalized_phone=normalize_phone(phone) if phone else None,
            email=email,
            normalized_email=normalize_email(email) if email else None,
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
        Search customers by name, phone, or email with Vietnamese normalization support.
        
        Multi-tier search strategy:
        1. Search original fields (name, phone, email) with case-insensitive matching
        2. Search normalized fields (normalized_name, normalized_phone, normalized_email)
        3. Fuzzy matching on name/phone/email for typo tolerance
        
        This allows searching "nguyen" to find "Nguyễn Văn A",
        or "0123" to find various phone formats like "(012) 345-6789".

        Args:
            query: Search query (can be with or without Vietnamese diacritics)
            is_active: Filter by active status

        Returns:
            List of matching customers, ordered by name
        """
        if not query or not query.strip():
            return []
        
        query = query.strip()
        normalized_query = normalize_vietnamese(query)
        normalized_phone_query = normalize_phone(query)
        normalized_email_query = normalize_email(query)
        
        # Build search conditions with OR logic
        search_conditions = [
            # Original fields (case-insensitive)
            Customer.name.ilike(f"%{query}%"),
            Customer.phone.ilike(f"%{query}%"),
            Customer.email.ilike(f"%{query}%"),
            # Normalized fields
            Customer.normalized_name.ilike(f"%{normalized_query}%"),
        ]

        # Only add normalized phone/email filters when they are non-empty to avoid matching everything
        if normalized_phone_query:
            search_conditions.append(Customer.normalized_phone.ilike(f"%{normalized_phone_query}%"))

        if normalized_email_query:
            search_conditions.append(Customer.normalized_email.ilike(f"%{normalized_email_query}%"))
        
        base_results = self.db.query(Customer).filter(
            Customer.is_active == is_active,
            or_(*search_conditions)
        ).order_by(Customer.name).all()

        # Fuzzy matching for typo tolerance (additionally, without duplicating base results)
        seen_ids = {c.id for c in base_results}
        fuzzy_results: List[Customer] = []

        # Limit candidate set for performance
        candidates = self.db.query(Customer).filter(
            Customer.is_active == is_active
        ).limit(200).all()

        for customer in candidates:
            if customer.id in seen_ids:
                continue

            scores = []
            if customer.name:
                scores.append(fuzz.partial_ratio(query.lower(), customer.name.lower()))
            if customer.normalized_name:
                scores.append(fuzz.partial_ratio(normalized_query, customer.normalized_name))
            if normalized_phone_query and customer.normalized_phone:
                scores.append(fuzz.partial_ratio(normalized_phone_query, customer.normalized_phone))
            if normalized_email_query and customer.normalized_email:
                scores.append(fuzz.partial_ratio(normalized_email_query, customer.normalized_email))

            best_score = max(scores) if scores else 0
            if best_score >= 70:
                fuzzy_results.append((customer, best_score))
                seen_ids.add(customer.id)

        # Sort fuzzy matches by score descending for more relevant ordering
        fuzzy_results.sort(key=lambda item: item[1], reverse=True)
        combined = base_results + [c for c, _ in fuzzy_results]

        # Keep stable name ordering for base results; fuzzy already sorted
        return combined

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

    def get_customers_paginated(self, limit: int = 30, offset: int = 0, is_active: bool = True) -> tuple[List[Customer], int, bool, int | None]:
        """
        Get customers with pagination support.
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)
        base_query = self.db.query(Customer).filter(Customer.is_active == is_active)
        total = base_query.count()

        customers = base_query.order_by(Customer.created_at.desc(), Customer.id.desc()).offset(safe_offset).limit(safe_limit + 1).all()
        has_more = len(customers) > safe_limit
        next_offset = safe_offset + safe_limit if has_more else None

        return customers[:safe_limit], total, has_more, next_offset

    def search_customers_paginated(self, query: str, limit: int = 30, offset: int = 0, is_active: bool = True) -> tuple[List[Customer], int, bool, int | None]:
        """
        Search customers with pagination using the advanced search logic.
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)
        results = self.search_customers(query, is_active=is_active)
        total = len(results)
        sliced = results[safe_offset:safe_offset + safe_limit]
        has_more = safe_offset + safe_limit < total
        next_offset = safe_offset + safe_limit if has_more else None
        return sliced, total, has_more, next_offset

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
            customer.normalized_name = normalize_vietnamese(name)

        if phone is not None:
            customer.phone = phone
            customer.normalized_phone = normalize_phone(phone)

        if email is not None:
            customer.email = email
            customer.normalized_email = normalize_email(email)

        if address is not None:
            customer.address = address

        if notes is not None:
            customer.notes = notes

        customer.updated_at = get_vn_time()

        self.db.commit()
        self.db.refresh(customer)

        return customer

    def delete_customer(self, customer_id: int) -> bool:
        """
        Soft delete a customer (set is_active to False and deleted_at timestamp).

        Args:
            customer_id: Customer ID

        Returns:
            True if successful, False otherwise
        """
        customer = self.get_customer(customer_id)
        if not customer:
            return False

        customer.is_active = False
        customer.deleted_at = get_vn_time()
        customer.updated_at = get_vn_time()

        self.db.commit()
        return True

    def delete_customers(self, customer_ids: List[int]) -> Dict[str, int]:
        """Bulk soft delete customers."""
        unique_ids = list(dict.fromkeys(cid for cid in customer_ids if isinstance(cid, int)))
        if not unique_ids:
            return {"requested": 0, "deleted": 0}

        customers = self.db.query(Customer).filter(
            Customer.id.in_(unique_ids),
            Customer.is_active == True
        ).all()

        now = get_vn_time()
        for customer in customers:
            customer.is_active = False
            customer.deleted_at = now
            customer.updated_at = now

        self.db.commit()
        return {"requested": len(unique_ids), "deleted": len(customers)}

    def restore_customer(self, customer_id: int) -> bool:
        """
        Restore a soft-deleted customer.

        Args:
            customer_id: Customer ID

        Returns:
            True if successful, False otherwise
        """
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return False

        customer.is_active = True
        customer.deleted_at = None
        customer.updated_at = get_vn_time()

        self.db.commit()
        return True

    def restore_customers(self, customer_ids: List[int]) -> Dict[str, int]:
        """Bulk restore soft-deleted customers."""
        unique_ids = list(dict.fromkeys(cid for cid in customer_ids if isinstance(cid, int)))
        if not unique_ids:
            return {"requested": 0, "restored": 0}

        customers = self.db.query(Customer).filter(
            Customer.id.in_(unique_ids),
            Customer.is_active == False,
            Customer.deleted_at.isnot(None)
        ).all()

        now = get_vn_time()
        for customer in customers:
            customer.is_active = True
            customer.deleted_at = None
            customer.updated_at = now

        self.db.commit()
        return {"requested": len(unique_ids), "restored": len(customers)}

    def permanently_delete_customer(self, customer_id: int) -> bool:
        """
        Permanently delete a customer from database.

        Args:
            customer_id: Customer ID

        Returns:
            True if successful, False otherwise
        """
        customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return False

        self.db.delete(customer)
        self.db.commit()
        return True

    def get_trash_customers(self, is_active: bool = False) -> List[Customer]:
        """
        Get all soft-deleted customers.

        Args:
            is_active: Filter by active status (default False for trash)

        Returns:
            List of deleted customers
        """
        return self.db.query(Customer).filter(
            Customer.is_active == is_active,
            Customer.deleted_at.isnot(None)
        ).order_by(Customer.deleted_at.desc()).all()

    def get_trash_customers_paginated(self, limit: int = 30, offset: int = 0) -> tuple[List[Customer], int, bool, int | None]:
        """
        Get deleted customers with pagination support.
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)
        base_query = self.db.query(Customer).filter(
            Customer.is_active == False,
            Customer.deleted_at.isnot(None)
        )
        total = base_query.count()

        customers = base_query.order_by(Customer.deleted_at.desc()).offset(safe_offset).limit(safe_limit + 1).all()
        has_more = len(customers) > safe_limit
        next_offset = safe_offset + safe_limit if has_more else None

        return customers[:safe_limit], total, has_more, next_offset

    def search_trash_customers_paginated(self, query: str, limit: int = 30, offset: int = 0) -> tuple[List[Customer], int, bool, int | None]:
        """
        Search deleted customers with pagination.
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)

        if not query or not query.strip():
            return self.get_trash_customers_paginated(limit=safe_limit, offset=safe_offset)

        query = query.strip()
        normalized_query = normalize_vietnamese(query)
        normalized_phone_query = normalize_phone(query)
        normalized_email_query = normalize_email(query)

        # Build search conditions
        search_conditions = [
            Customer.name.ilike(f"%{query}%"),
            Customer.phone.ilike(f"%{query}%"),
            Customer.email.ilike(f"%{query}%"),
            Customer.normalized_name.ilike(f"%{normalized_query}%"),
        ]

        if normalized_phone_query:
            search_conditions.append(Customer.normalized_phone.ilike(f"%{normalized_phone_query}%"))

        if normalized_email_query:
            search_conditions.append(Customer.normalized_email.ilike(f"%{normalized_email_query}%"))

        base_query = self.db.query(Customer).filter(
            Customer.is_active == False,
            Customer.deleted_at.isnot(None),
            or_(*search_conditions)
        )

        total = base_query.count()
        results = base_query.order_by(Customer.deleted_at.desc()).offset(safe_offset).limit(safe_limit + 1).all()
        has_more = len(results) > safe_limit
        next_offset = safe_offset + safe_limit if has_more else None

        return results[:safe_limit], total, has_more, next_offset

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
