"""Database models for Store Management System."""

from datetime import datetime
from typing import List
from config import Config
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import pytz

Base = declarative_base()

# UTC+7 timezone for Vietnam
VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_vn_time():
    """Get current time in Vietnam timezone (UTC+7)."""
    return datetime.now(VN_TZ)


class Unit(Base):
    """Unit model - stores measurement units with calculation rules."""

    __tablename__ = 'units'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "cái", "kg", "mét"
    display_name = Column(String(100), nullable=False)  # User-friendly name
    allows_decimal = Column(Boolean, default=False)  # True for kg/mét, False for cái/chiếc
    step_size = Column(Float, default=1.0)  # Increment step (1.0 for integer, 0.1 or 0.01 for decimal)
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)  # System units cannot be deleted

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)

    # Relationships
    products = relationship('Product', back_populates='unit_ref')

    def __repr__(self):
        return f"<Unit(id={self.id}, name='{self.name}', allows_decimal={self.allows_decimal})>"


class Product(Base):
    """Product model - stores product information."""

    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    normalized_name = Column(String(255), nullable=True, index=True)  # Vietnamese unaccented name for search
    price = Column(Float, nullable=True)  # giá bán (có thể không nhập)
    import_price = Column(Float, nullable=True)  # giá nhập (có thể không nhập)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    unit = Column(String(50), default='cái')  # đơn vị: cái, hộp, kg, etc. (DEPRECATED - will be removed)
    unit_id = Column(Integer, ForeignKey('units.id'), nullable=True)  # Foreign key to units table
    stock_quantity = Column(Float, default=0)

    # Images stored as comma-separated paths
    image_paths = Column(Text, nullable=True)  # "path1.jpg,path2.jpg,path3.jpg"

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime, nullable=True, index=True)  # NULL = active, timestamp = deleted

    # Update tracking timestamps (for showing "recently updated" badges)
    price_updated_at = Column(DateTime, nullable=True, index=True)  # Last sale price update
    import_price_updated_at = Column(DateTime, nullable=True, index=True)  # Last import price update
    info_updated_at = Column(DateTime, nullable=True, index=True)  # Last info update (name, category, desc, unit)

    # Relationships
    unit_ref = relationship('Unit', back_populates='products')
    invoice_items = relationship('InvoiceItem', back_populates='product')
    # Price history is read-only from Product side to prevent SQLAlchemy from trying to manage it
    # Price history should only be created/modified through ProductService methods
    price_history = relationship(
        'PriceHistory', 
        back_populates='product', 
        order_by='PriceHistory.changed_at.desc()',
        viewonly=True  # Prevents SQLAlchemy from trying to update/delete price_history
    )

    def __repr__(self):
        return f"<Product(id={self.id}, name='{self.name}', price={self.price}, import_price={self.import_price})>"

    @property
    def images(self) -> List[str]:
        """Get list of image paths."""
        if not self.image_paths:
            return []
        return [path.strip() for path in self.image_paths.split(',') if path.strip()]

    @images.setter
    def images(self, image_list: List[str]):
        """Set images from list."""
        if not image_list:
            self.image_paths = None
            return

        cleaned_images = []
        for path in image_list:
            if not path:
                continue
            cleaned = path.strip()
            if cleaned:
                cleaned_images.append(cleaned)

        if len(cleaned_images) > Config.MAX_PRODUCT_IMAGES:
            raise ValueError(f"Each product can have at most {Config.MAX_PRODUCT_IMAGES} images.")

        self.image_paths = ','.join(cleaned_images) if cleaned_images else None


class Customer(Base):
    """Customer model - stores customer information."""

    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    normalized_name = Column(String(255), nullable=True, index=True)  # Vietnamese unaccented name for search
    phone = Column(String(20), nullable=True, index=True)
    normalized_phone = Column(String(20), nullable=True, index=True)  # Digits-only phone for search
    email = Column(String(255), nullable=True, index=True)  # Added index for email search
    normalized_email = Column(String(255), nullable=True, index=True)  # Lowercase email for case-insensitive search
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime, nullable=True, index=True)  # NULL = active, timestamp = deleted

    # Relationships
    invoices = relationship('Invoice', back_populates='customer', order_by='Invoice.created_at.desc()')
    payments = relationship('Payment', back_populates='customer', order_by='Payment.payment_date.desc()')

    def __repr__(self):
        return f"<Customer(id={self.id}, name='{self.name}', phone='{self.phone}')>"

    def get_total_debt(self, db_session) -> float:
        """Calculate total outstanding debt (computed on-the-fly, not stored).
        
        Only includes exported invoices (exported_at IS NOT NULL) to ensure
        debt is only counted after invoice has been officially issued.
        """
        from sqlalchemy import func
        result = db_session.query(
            func.sum(Invoice.remaining_amount)
        ).filter(
            Invoice.customer_id == self.id,
            Invoice.status.in_(['pending', 'paid']),
            Invoice.remaining_amount > 0,
            Invoice.exported_at.isnot(None)  # Only count exported invoices
        ).scalar()
        return float(result or 0)


class Invoice(Base):
    """Invoice model - stores invoice/order information."""

    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)

    # Customer
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=True)
    customer_name = Column(String(255), nullable=True, index=True)  # For one-time customers
    normalized_customer_name = Column(String(255), nullable=True, index=True)  # Vietnamese unaccented name for search
    customer_phone = Column(String(20), nullable=True, index=True)
    normalized_customer_phone = Column(String(20), nullable=True, index=True)  # Digits-only phone for search
    customer_address = Column(Text, nullable=True)

    # Financial
    subtotal = Column(Float, nullable=False, default=0)
    discount = Column(Float, default=0)  # Discount amount or percentage
    tax = Column(Float, default=0)  # Tax amount or percentage
    total = Column(Float, nullable=False)

    # Payment tracking
    paid_amount = Column(Float, default=0, nullable=False)  # Total amount paid (cash IN)
    refunded_amount = Column(Float, default=0, nullable=False)  # NEW: Total refunded (cash OUT)
    remaining_amount = Column(Float, nullable=False)  # total - paid_amount + refunded_amount

    # Status
    status = Column(String(50), default='pending', index=True)  # pending, paid, cancelled
    payment_method = Column(String(50), nullable=True)  # cash, transfer, card

    # Notes
    notes = Column(Text, nullable=True)

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time, index=True)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)
    exported_at = Column(DateTime, nullable=True, index=True)  # First export timestamp (PDF or Excel)

    # Relationships
    customer = relationship('Customer', back_populates='invoices')
    items = relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')
    payment_allocations = relationship(
        'PaymentAllocation',
        back_populates='invoice',
        order_by='PaymentAllocation.allocation_date.desc()'
    )
    returns = relationship(
        'InvoiceReturn',
        back_populates='invoice',
        order_by='InvoiceReturn.created_at.desc()'
    )

    def __repr__(self):
        return f"<Invoice(id={self.id}, number='{self.invoice_number}', total={self.total})>"

    @property
    def payment_status(self) -> str:
        """Return payment status: 'unpaid', 'partial', 'paid'."""
        if self.paid_amount == 0:
            return 'unpaid'
        elif self.remaining_amount <= 0.01:  # Float tolerance
            return 'paid'
        else:
            return 'partial'

    @property
    def is_fully_paid(self) -> bool:
        """Check if invoice is fully paid."""
        return self.remaining_amount <= 0.01  # Float tolerance

    @property
    def is_partially_paid(self) -> bool:
        """Check if invoice has partial payment."""
        return self.paid_amount > 0 and self.remaining_amount > 0.01

    @property
    def total_returned_amount(self) -> float:
        """Total amount actually refunded (only returns with status='refunded').

        This represents the actual value of goods that have been returned AND refunded.
        Does NOT include pending returns (status='pending_refund').
        """
        return sum(ret.refund_amount for ret in self.returns
                   if ret.status == 'refunded')

    @property
    def total_pending_return_amount(self) -> float:
        """Total amount pending refund (only returns with status='pending_refund').

        This represents the value of goods that customers want to return
        but have NOT been refunded yet.
        """
        return sum(ret.refund_amount for ret in self.returns
                   if ret.status == 'pending_refund')

    @property
    def has_returns(self) -> bool:
        """Check if invoice has any returns (refunded or pending)."""
        return len(self.returns) > 0

    @property
    def net_amount(self) -> float:
        """Net amount = total - total_returned_amount.

        This is the ACTUAL net revenue after deducting ONLY refunded returns.
        Does NOT deduct pending returns (they haven't been refunded yet).
        """
        return self.total - self.total_returned_amount

    @property
    def projected_net_amount(self) -> float:
        """Projected net amount if all pending returns are processed.

        This shows what the net amount WILL BE if all pending returns are confirmed.
        Formula: total - total_returned_amount - total_pending_return_amount
        """
        return self.total - self.total_returned_amount - self.total_pending_return_amount

    @property
    def net_payment_amount(self) -> float:
        """Net payment = paid_amount - refunded_amount (actual cash flow)."""
        return self.paid_amount - self.refunded_amount

    @property
    def shop_owes_customer(self) -> bool:
        """True if shop owes money back to customer."""
        return self.net_payment_amount < 0

    @property
    def customer_owes_shop(self) -> bool:
        """True if customer still owes money."""
        return self.remaining_amount > 0


class InvoiceItem(Base):
    """Invoice item model - stores individual items in an invoice."""

    __tablename__ = 'invoice_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)

    # Product details (snapshot at time of purchase)
    product_name = Column(String(255), nullable=False)
    product_price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False, default=1)  # Changed to Float to support decimal quantities (e.g., 0.5 kg)
    unit = Column(String(50), default='cái')

    # Calculated
    subtotal = Column(Float, nullable=False)  # price * quantity

    # Relationships
    invoice = relationship('Invoice', back_populates='items')
    product = relationship('Product', back_populates='invoice_items')

    def __repr__(self):
        return f"<InvoiceItem(id={self.id}, product='{self.product_name}', qty={self.quantity})>"


class PriceHistory(Base):
    """Price history model - tracks price changes."""

    __tablename__ = 'price_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)

    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)

    changed_at = Column(DateTime, default=get_vn_time, index=True)
    reason = Column(String(255), nullable=True)  # e.g., "Price update from supplier"


    # Relationships
    product = relationship('Product', back_populates='price_history')

    def __repr__(self):
        return f"<PriceHistory(product_id={self.product_id}, {self.old_price} -> {self.new_price})>"


class AIConfiguration(Base):
    """AI Configuration model - stores encrypted API keys for AI providers."""

    __tablename__ = 'ai_configurations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(50), unique=True, nullable=False, index=True)  # google, openai, grok, claude, deepseek, qwen
    display_name = Column(String(100), nullable=False)  # User-friendly name
    api_key_encrypted = Column(Text, nullable=False)  # Encrypted API key
    is_enabled = Column(Boolean, default=True)  # Enable/disable provider
    selected_model = Column(String(100), nullable=True)  # Selected model for this provider
    
    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)

    def __repr__(self):
        return f"<AIConfiguration(provider='{self.provider}', display_name='{self.display_name}', enabled={self.is_enabled}, model='{self.selected_model}')>"


class MasterPassword(Base):
    """Master Password model - stores hashed master password for AI config access."""

    __tablename__ = 'master_password'

    id = Column(Integer, primary_key=True, autoincrement=True)
    password_hash = Column(String(255), nullable=False)  # Bcrypt hashed password
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)

    def __repr__(self):
        return f"<MasterPassword(id={self.id})>"


class Payment(Base):
    """Payment model - tracks customer payment transactions."""

    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_number = Column(String(50), unique=True, nullable=False, index=True)  # PAY-YYYYMMDD-XXXX
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False, index=True)

    # Financial
    amount = Column(Float, nullable=False)  # Total payment amount
    payment_method = Column(String(50), nullable=False)  # cash, transfer, card

    # Metadata
    payment_date = Column(DateTime, default=get_vn_time, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)
    created_by = Column(String(100), nullable=True)  # Username/staff who recorded payment

    # Relationships
    customer = relationship('Customer', back_populates='payments')
    allocations = relationship('PaymentAllocation', back_populates='payment', cascade='all, delete-orphan')

    # Indexes for performance
    __table_args__ = (
        Index('idx_payment_customer_date', 'customer_id', 'payment_date'),
    )

    def __repr__(self):
        return f"<Payment(id={self.id}, number='{self.payment_number}', amount={self.amount})>"


class PaymentAllocation(Base):
    """Payment allocation model - tracks how payments are distributed to invoices."""

    __tablename__ = 'payment_allocations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    payment_id = Column(Integer, ForeignKey('payments.id'), nullable=False, index=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False, index=True)

    # Allocation details
    amount = Column(Float, nullable=False)  # Amount allocated to this invoice
    allocation_date = Column(DateTime, default=get_vn_time)
    notes = Column(Text, nullable=True)

    # Relationships
    payment = relationship('Payment', back_populates='allocations')
    invoice = relationship('Invoice', back_populates='payment_allocations')

    # Indexes for performance
    __table_args__ = (
        Index('idx_payment_invoice', 'payment_id', 'invoice_id'),
    )

    def __repr__(self):
        return f"<PaymentAllocation(id={self.id}, payment_id={self.payment_id}, invoice_id={self.invoice_id}, amount={self.amount})>"


class InvoiceReturn(Base):
    """Invoice return model - tracks invoice return transactions."""

    __tablename__ = 'invoice_returns'

    id = Column(Integer, primary_key=True, autoincrement=True)
    return_number = Column(String(50), unique=True, nullable=False, index=True)  # RET-YYYYMMDD-XXXX

    # Foreign Keys
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False, index=True)
    refund_payment_id = Column(Integer, ForeignKey('payments.id'), nullable=True, index=True)

    # Return Details
    reason = Column(Text, nullable=False)  # Reason for return (min 3 chars)
    refund_amount = Column(Float, default=0, nullable=False)  # Amount refunded (can be 0)
    is_full_return = Column(Boolean, default=False)  # Full or partial return

    # Status
    status = Column(String(20), default='pending_refund', nullable=False, index=True)  # pending_refund, refunded

    # Metadata
    created_at = Column(DateTime, default=get_vn_time, index=True)
    created_by = Column(String(100), nullable=True)  # Username/staff who processed return
    notes = Column(Text, nullable=True)
    exported_at = Column(DateTime, nullable=True, index=True)  # First export timestamp (PDF)

    # Relationships
    invoice = relationship('Invoice', back_populates='returns')
    return_items = relationship('InvoiceReturnItem', back_populates='invoice_return', cascade='all, delete-orphan')
    refund_payment = relationship('Payment', foreign_keys=[refund_payment_id])

    # Indexes for performance
    __table_args__ = (
        Index('idx_return_invoice_date', 'invoice_id', 'created_at'),
        Index('idx_return_status', 'status'),
    )

    @property
    def is_refunded(self) -> bool:
        """Check if return has been refunded."""
        return self.status == 'refunded'

    def __repr__(self):
        return f"<InvoiceReturn(id={self.id}, number='{self.return_number}', refund={self.refund_amount})>"


class InvoiceReturnItem(Base):
    """Invoice return item model - tracks individual items in a return."""

    __tablename__ = 'invoice_return_items'

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Foreign Keys
    invoice_return_id = Column(Integer, ForeignKey('invoice_returns.id'), nullable=False, index=True)
    invoice_item_id = Column(Integer, ForeignKey('invoice_items.id'), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)

    # Product Snapshot (at time of return)
    product_name = Column(String(255), nullable=False)
    product_price = Column(Float, nullable=False)
    unit = Column(String(50), default='cái')

    # Return Details
    quantity_returned = Column(Float, nullable=False)  # Quantity being returned
    subtotal = Column(Float, nullable=False)  # quantity_returned * product_price
    restore_inventory = Column(Boolean, default=True)  # Whether to restore stock

    # Relationships
    invoice_return = relationship('InvoiceReturn', back_populates='return_items')
    invoice_item = relationship('InvoiceItem')
    product = relationship('Product')

    def __repr__(self):
        return f"<InvoiceReturnItem(id={self.id}, product='{self.product_name}', qty={self.quantity_returned})>"
