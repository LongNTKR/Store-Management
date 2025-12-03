"""Product management service."""

import os
import shutil
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from database.models import Product, PriceHistory
from services.ocr_service import OCRService


class ProductService:
    """Service for product management operations."""

    def __init__(self, db_session: Session, image_dir: str = "data/images/products"):
        """
        Initialize product service.

        Args:
            db_session: SQLAlchemy database session
            image_dir: Directory to store product images
        """
        self.db = db_session
        self.image_dir = image_dir
        os.makedirs(image_dir, exist_ok=True)

    def create_product(
        self,
        name: str,
        price: float,
        description: Optional[str] = None,
        category: Optional[str] = None,
        unit: str = 'cái',
        stock_quantity: int = 0,
        image_paths: Optional[List[str]] = None
    ) -> Product:
        """
        Create a new product.

        Args:
            name: Product name
            price: Product price
            description: Product description
            category: Product category
            unit: Unit of measurement
            stock_quantity: Initial stock quantity
            image_paths: List of image file paths

        Returns:
            Created Product object
        """
        product = Product(
            name=name,
            price=price,
            description=description,
            category=category,
            unit=unit,
            stock_quantity=stock_quantity
        )

        if image_paths:
            product.images = image_paths

        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)

        return product

    def get_product(self, product_id: int) -> Optional[Product]:
        """
        Get product by ID.

        Args:
            product_id: Product ID

        Returns:
            Product object or None
        """
        return self.db.query(Product).filter(Product.id == product_id).first()

    def get_product_by_name(self, name: str) -> Optional[Product]:
        """
        Get product by exact name.

        Args:
            name: Product name

        Returns:
            Product object or None
        """
        return self.db.query(Product).filter(Product.name == name).first()

    def search_products(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        is_active: bool = True
    ) -> List[Product]:
        """
        Search products with filters.

        Args:
            query: Search query (name or description)
            category: Filter by category
            min_price: Minimum price
            max_price: Maximum price
            is_active: Filter by active status

        Returns:
            List of matching products
        """
        query = query.strip() if query else query  # normalize whitespace to improve matching
        filters = [Product.is_active == is_active]

        if query:
            filters.append(
                or_(
                    Product.name.ilike(f"%{query}%"),
                    Product.description.ilike(f"%{query}%")
                )
            )

        if category:
            filters.append(Product.category == category)

        if min_price is not None:
            filters.append(Product.price >= min_price)

        if max_price is not None:
            filters.append(Product.price <= max_price)

        return self.db.query(Product).filter(and_(*filters)).all()

    def get_all_products(self, is_active: bool = True) -> List[Product]:
        """
        Get all products.

        Args:
            is_active: Filter by active status

        Returns:
            List of all products
        """
        return self.db.query(Product).filter(Product.is_active == is_active).all()

    def update_product(
        self,
        product_id: int,
        name: Optional[str] = None,
        price: Optional[float] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        unit: Optional[str] = None,
        stock_quantity: Optional[int] = None,
        image_paths: Optional[List[str]] = None
    ) -> Optional[Product]:
        """
        Update product information.

        Args:
            product_id: Product ID
            name: New product name
            price: New product price (will track in price history)
            description: New description
            category: New category
            unit: New unit
            stock_quantity: New stock quantity
            image_paths: New image paths

        Returns:
            Updated Product object or None
        """
        product = self.get_product(product_id)
        if not product:
            return None

        # Track price change
        if price is not None and price != product.price:
            self._record_price_change(product, price)
            product.price = price

        if name is not None:
            product.name = name

        if description is not None:
            product.description = description

        if category is not None:
            product.category = category

        if unit is not None:
            product.unit = unit

        if stock_quantity is not None:
            product.stock_quantity = stock_quantity

        if image_paths is not None:
            product.images = image_paths

        product.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(product)

        return product

    def delete_product(self, product_id: int) -> bool:
        """
        Soft delete a product (set is_active to False).

        Args:
            product_id: Product ID

        Returns:
            True if successful, False otherwise
        """
        product = self.get_product(product_id)
        if not product:
            return False

        product.is_active = False
        product.updated_at = datetime.utcnow()

        self.db.commit()
        return True

    def permanently_delete_product(self, product_id: int) -> bool:
        """
        Permanently delete a product from database.

        Args:
            product_id: Product ID

        Returns:
            True if successful, False otherwise
        """
        product = self.get_product(product_id)
        if not product:
            return False

        self.db.delete(product)
        self.db.commit()
        return True

    def _record_price_change(self, product: Product, new_price: float, reason: str = "Manual update"):
        """
        Record price change in history.

        Args:
            product: Product object
            new_price: New price
            reason: Reason for price change
        """
        history = PriceHistory(
            product_id=product.id,
            old_price=product.price,
            new_price=new_price,
            reason=reason
        )
        self.db.add(history)

    def get_price_history(self, product_id: int) -> List[PriceHistory]:
        """
        Get price history for a product.

        Args:
            product_id: Product ID

        Returns:
            List of price history records
        """
        return self.db.query(PriceHistory).filter(
            PriceHistory.product_id == product_id
        ).order_by(PriceHistory.changed_at.desc()).all()

    def import_from_price_list(
        self,
        products_data: List[Dict],
        update_existing: bool = True,
        add_new: bool = True
    ) -> Tuple[int, int, List[str]]:
        """
        Import products from price list data.

        Args:
            products_data: List of product dictionaries with 'name' and 'price'
            update_existing: Update prices for existing products
            add_new: Add new products

        Returns:
            Tuple of (updated_count, added_count, error_messages)
        """
        updated_count = 0
        added_count = 0
        errors = []

        for item in products_data:
            try:
                name = item.get('name', '').strip()
                price = float(item.get('price', 0))

                if not name or price <= 0:
                    errors.append(f"Invalid product data: {item}")
                    continue

                # Check if product exists
                existing_product = self.get_product_by_name(name)

                if existing_product:
                    if update_existing and existing_product.price != price:
                        self.update_product(
                            existing_product.id,
                            price=price
                        )
                        self._record_price_change(
                            existing_product,
                            price,
                            reason="Price update from supplier list"
                        )
                        updated_count += 1
                else:
                    if add_new:
                        self.create_product(
                            name=name,
                            price=price,
                            description=item.get('description', ''),
                            category=item.get('category', None),
                            unit=item.get('unit', 'cái')
                        )
                        added_count += 1

            except Exception as e:
                errors.append(f"Error processing {item.get('name', 'unknown')}: {str(e)}")

        self.db.commit()

        return updated_count, added_count, errors

    def _parse_tabular_price_list(self, file_path: str, is_csv: bool = False) -> List[Dict]:
        """
        Parse Excel/CSV files without requiring OCR/Google Vision.

        Args:
            file_path: Path to Excel/CSV file
            is_csv: Whether the file is CSV (defaults to Excel parsing)

        Returns:
            List of product dictionaries with name/price keys
        """
        import pandas as pd  # Local import to avoid overhead if unused

        df = pd.read_csv(file_path) if is_csv else pd.read_excel(file_path)

        def detect_column(keywords: List[str]) -> Optional[str]:
            for col in df.columns:
                if any(keyword in str(col).lower() for keyword in keywords):
                    return col
            return None

        name_col = detect_column(['name', 'product', 'item', 'tên', 'sản phẩm'])
        price_col = detect_column(['price', 'cost', 'giá', 'gia'])

        if not name_col or not price_col:
            raise ValueError("Could not detect name and price columns in the uploaded file.")

        products: List[Dict] = []
        for _, row in df.iterrows():
            name = str(row[name_col]).strip()
            price = row[price_col]

            if pd.isna(name) or pd.isna(price) or name.lower() in ("", "nan"):
                continue

            if isinstance(price, str):
                price = price.replace(',', '').replace('.', '')

            try:
                price_value = float(price)
            except (TypeError, ValueError):
                continue

            products.append({
                'name': name,
                'price': price_value,
                'source': 'csv' if is_csv else 'excel'
            })

        return products

    def import_from_file(
        self,
        file_path: str,
        ocr_service: Optional[OCRService] = None,
        update_existing: bool = True,
        add_new: bool = True
    ) -> Tuple[int, int, List[str]]:
        """
        Import products from file (image, PDF, Excel, CSV).

        Args:
            file_path: Path to file
            ocr_service: OCR service instance (required for image/PDF)
            update_existing: Update existing products
            add_new: Add new products

        Returns:
            Tuple of (updated_count, added_count, error_messages)
        """
        try:
            ext = os.path.splitext(file_path)[1].lower()

            if ext in ('.xlsx', '.xls'):
                products_data = self._parse_tabular_price_list(file_path, is_csv=False)
            elif ext == '.csv':
                products_data = self._parse_tabular_price_list(file_path, is_csv=True)
            else:
                if ocr_service is None:
                    raise ValueError("OCR service is not configured for image/PDF import.")
                products_data = ocr_service.auto_parse_price_list(file_path)

            return self.import_from_price_list(products_data, update_existing, add_new)
        except Exception as e:
            return 0, 0, [f"Error importing file: {str(e)}"]

    def add_product_image(self, product_id: int, source_image_path: str) -> Optional[str]:
        """
        Add an image to a product.

        Args:
            product_id: Product ID
            source_image_path: Path to source image file

        Returns:
            Path to saved image or None
        """
        product = self.get_product(product_id)
        if not product:
            return None

        # Generate unique filename
        ext = os.path.splitext(source_image_path)[1]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"product_{product_id}_{timestamp}{ext}"
        dest_path = os.path.join(self.image_dir, filename)

        # Copy image
        shutil.copy2(source_image_path, dest_path)

        # Update product
        current_images = product.images
        current_images.append(dest_path)
        product.images = current_images
        product.updated_at = datetime.utcnow()

        self.db.commit()

        return dest_path

    def remove_product_image(self, product_id: int, image_path: str) -> bool:
        """
        Remove an image from a product.

        Args:
            product_id: Product ID
            image_path: Path to image to remove

        Returns:
            True if successful, False otherwise
        """
        product = self.get_product(product_id)
        if not product:
            return False

        current_images = product.images
        if image_path in current_images:
            current_images.remove(image_path)
            product.images = current_images
            product.updated_at = datetime.utcnow()

            # Delete physical file
            if os.path.exists(image_path):
                os.remove(image_path)

            self.db.commit()
            return True

        return False

    def get_categories(self) -> List[str]:
        """
        Get all unique product categories.

        Returns:
            List of category names
        """
        categories = self.db.query(Product.category).filter(
            Product.category.isnot(None),
            Product.is_active == True
        ).distinct().all()

        return [cat[0] for cat in categories if cat[0]]
