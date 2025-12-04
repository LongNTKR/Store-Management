"""Database models for Store Management System."""

from datetime import datetime
from typing import List
from config import Config
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
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


class Product(Base):
    """Product model - stores product information."""

    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    price = Column(Float, nullable=False)
    import_price = Column(Float, nullable=True)  # giá nhập (có thể không nhập)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    unit = Column(String(50), default='cái')  # đơn vị: cái, hộp, kg, etc.
    stock_quantity = Column(Integer, default=0)

    # Images stored as comma-separated paths
    image_paths = Column(Text, nullable=True)  # "path1.jpg,path2.jpg,path3.jpg"

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)
    is_active = Column(Boolean, default=True)
    deleted_at = Column(DateTime, nullable=True, index=True)  # NULL = active, timestamp = deleted

    # Relationships
    invoice_items = relationship('InvoiceItem', back_populates='product')
    price_history = relationship('PriceHistory', back_populates='product', order_by='PriceHistory.changed_at.desc()')

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
    phone = Column(String(20), nullable=True, index=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)
    is_active = Column(Boolean, default=True)

    # Relationships
    invoices = relationship('Invoice', back_populates='customer', order_by='Invoice.created_at.desc()')

    def __repr__(self):
        return f"<Customer(id={self.id}, name='{self.name}', phone='{self.phone}')>"


class Invoice(Base):
    """Invoice model - stores invoice/order information."""

    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)

    # Customer
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=True)
    customer_name = Column(String(255), nullable=True)  # For one-time customers
    customer_phone = Column(String(20), nullable=True)
    customer_address = Column(Text, nullable=True)

    # Financial
    subtotal = Column(Float, nullable=False, default=0)
    discount = Column(Float, default=0)  # Discount amount or percentage
    tax = Column(Float, default=0)  # Tax amount or percentage
    total = Column(Float, nullable=False)

    # Status
    status = Column(String(50), default='pending', index=True)  # pending, paid, cancelled
    payment_method = Column(String(50), nullable=True)  # cash, transfer, card

    # Notes
    notes = Column(Text, nullable=True)

    # Metadata (using UTC+7 timezone)
    created_at = Column(DateTime, default=get_vn_time, index=True)
    updated_at = Column(DateTime, default=get_vn_time, onupdate=get_vn_time)

    # Relationships
    customer = relationship('Customer', back_populates='invoices')
    items = relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Invoice(id={self.id}, number='{self.invoice_number}', total={self.total})>"


class InvoiceItem(Base):
    """Invoice item model - stores individual items in an invoice."""

    __tablename__ = 'invoice_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey('invoices.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=True)

    # Product details (snapshot at time of purchase)
    product_name = Column(String(255), nullable=False)
    product_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
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
