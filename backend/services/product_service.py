"""Product management service."""

import logging
import os
import uuid
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, text
from unidecode import unidecode
from rapidfuzz import fuzz, process

from database.models import Product, PriceHistory
from services.ocr_service import OCRService
from config import Config


logger = logging.getLogger(__name__)


def normalize_vietnamese(text: str) -> str:
    """
    Normalize Vietnamese text by removing diacritics.

    Args:
        text: Vietnamese text with diacritics

    Returns:
        Normalized text without diacritics in lowercase

    Example:
        normalize_vietnamese("Bút bi đỏ") -> "but bi do"
    """
    if not text:
        return ""
    return unidecode(text).lower().strip()


class ProductService:
    """Service for product management operations."""

    def __init__(self, db_session: Session, image_dir: str = "data/images/products", max_images: int = 5):
        """
        Initialize product service.

        Args:
            db_session: SQLAlchemy database session
            image_dir: Directory to store product images
        """
        self.db = db_session
        self.image_dir = os.path.abspath(image_dir)
        self.max_images = max_images
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
        os.makedirs(self.image_dir, exist_ok=True)
        self._setup_fts5_if_needed()

    def _normalize_page_params(self, limit: int, offset: int, max_limit: int = Config.MAX_PAGE_SIZE) -> Tuple[int, int]:
        """Clamp pagination params to avoid heavy queries."""
        safe_limit = max(1, min(limit or 0, max_limit))
        safe_offset = max(0, offset or 0)
        return safe_limit, safe_offset

    def _fetch_with_pagination(self, query, limit: int, offset: int, order_recent: bool = True) -> Tuple[List[Product], bool]:
        """Apply pagination to a SQLAlchemy query and detect if more results exist."""
        working_query = query
        if order_recent:
            working_query = working_query.order_by(Product.updated_at.desc(), Product.id.desc())

        results = working_query.offset(offset).limit(limit + 1).all()
        has_more = len(results) > limit
        return results[:limit], has_more

    def _setup_fts5_if_needed(self):
        """Setup SQLite FTS5 virtual table and triggers for full-text search."""
        try:
            # Check if FTS5 table exists and whether it needs rebuilding
            schema_row = self.db.execute(text(
                "SELECT name, sql FROM sqlite_master WHERE type='table' AND name='products_fts'"
            )).fetchone()

            needs_setup = schema_row is None
            if schema_row is not None:
                schema_sql = schema_row[1] or ""
                if "content='products'" in schema_sql:
                    logger.info("Removing outdated FTS5 table definition...")
                    # Remove old triggers before dropping the table
                    for trigger_name in ("products_fts_insert", "products_fts_update", "products_fts_delete"):
                        self.db.execute(text(f"DROP TRIGGER IF EXISTS {trigger_name}"))
                    self.db.execute(text("DROP TABLE IF EXISTS products_fts"))
                    needs_setup = True

            if needs_setup:
                logger.info("Creating FTS5 virtual table for products...")

                # Create FTS5 virtual table (standalone, no external content link)
                self.db.execute(text("""
                    CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
                        product_id UNINDEXED,
                        name,
                        normalized_name,
                        description,
                        category
                    )
                """))

                # Populate FTS5 table with existing data
                self.db.execute(text("""
                    INSERT INTO products_fts(product_id, name, normalized_name, description, category)
                    SELECT id, name, normalized_name, description, category FROM products WHERE is_active = 1
                """))

                # Create trigger for INSERT
                self.db.execute(text("""
                    CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
                        INSERT INTO products_fts(product_id, name, normalized_name, description, category)
                        VALUES (new.id, new.name, new.normalized_name, new.description, new.category);
                    END
                """))

                # Create trigger for UPDATE
                self.db.execute(text("""
                    CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
                        DELETE FROM products_fts WHERE product_id = old.id;
                        INSERT INTO products_fts(product_id, name, normalized_name, description, category)
                        VALUES (new.id, new.name, new.normalized_name, new.description, new.category);
                    END
                """))

                # Create trigger for DELETE
                self.db.execute(text("""
                    CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
                        DELETE FROM products_fts WHERE product_id = old.id;
                    END
                """))

                self.db.commit()
                logger.info("FTS5 table and triggers created successfully")
        except Exception as e:
            logger.warning(f"FTS5 setup failed (may not be critical): {e}")
            self.db.rollback()
    def create_product(
        self,
        name: str,
        price: float,
        import_price: Optional[float] = None,
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
            import_price: Product import/cost price
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
            normalized_name=normalize_vietnamese(name),
            price=price,
            import_price=import_price,
            description=description,
            category=category,
            unit=unit,
            stock_quantity=stock_quantity
        )

        if image_paths:
            sanitized_images = self._sanitize_image_references(image_paths)
            product.images = sanitized_images

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
        Advanced multi-tier search for products.

        Search Strategy (in order of priority):
        1. FTS5 full-text search (best for multi-word queries)
        2. Normalized name matching (Vietnamese without diacritics)
        3. Fuzzy matching (typo tolerance)
        4. Multi-keyword search (OR logic for each word)

        Args:
            query: Search query (supports Vietnamese with/without diacritics)
            category: Filter by category
            min_price: Minimum price
            max_price: Maximum price
            is_active: Filter by active status

        Returns:
            List of matching products, ranked by relevance
        """
        if not query or not query.strip():
            # Search endpoints should only return matches; empty query yields empty set
            return []

        # Normalize query for better matching
        query = query.strip()
        normalized_query = normalize_vietnamese(query)

        # Split into keywords for multi-keyword search
        keywords = [kw for kw in normalized_query.split() if len(kw) > 1]

        # Track found product IDs to avoid duplicates
        seen_ids = set()
        results = []

        # TIER 1: FTS5 Full-Text Search (highest priority)
        try:
            fts_products = self._search_with_fts5(normalized_query, is_active, category, min_price, max_price)
            for product in fts_products:
                if product.id not in seen_ids:
                    seen_ids.add(product.id)
                    results.append(product)
        except Exception as e:
            logger.warning(f"FTS5 search failed: {e}")

        # TIER 2: Normalized Name Exact/Prefix Match
        normalized_products = self._search_normalized(
            normalized_query, is_active, category, min_price, max_price
        )
        for product in normalized_products:
            if product.id not in seen_ids:
                seen_ids.add(product.id)
                results.append(product)

        # TIER 3: Fuzzy Matching (typo tolerance)
        fuzzy_products = self._search_fuzzy(
            query, normalized_query, is_active, category, min_price, max_price, exclude_ids=seen_ids
        )
        for product in fuzzy_products:
            if product.id not in seen_ids:
                seen_ids.add(product.id)
                results.append(product)

        # TIER 4: Multi-keyword Search (OR logic)
        if len(keywords) > 1:
            keyword_products = self._search_multi_keyword(
                keywords, is_active, category, min_price, max_price, exclude_ids=seen_ids
            )
            for product in keyword_products:
                if product.id not in seen_ids:
                    seen_ids.add(product.id)
                    results.append(product)

        return results

    def _search_with_fts5(
        self,
        normalized_query: str,
        is_active: bool,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float]
    ) -> List[Product]:
        """Search using SQLite FTS5 for fast full-text search."""
        # FTS5 query syntax (match across indexed columns: name, normalized_name, description, category)
        fts_query = ' OR '.join([f'"{word}"*' for word in normalized_query.split() if len(word) > 1])
        if not fts_query:
            return []

        # Query FTS5 table
        sql = text("""
            SELECT DISTINCT p.*
            FROM products p
            INNER JOIN products_fts fts ON p.id = fts.product_id
            WHERE products_fts MATCH :query
              AND p.is_active = :is_active
              AND (:category IS NULL OR p.category = :category)
              AND (:min_price IS NULL OR p.price >= :min_price)
              AND (:max_price IS NULL OR p.price <= :max_price)
            ORDER BY fts.rank
            LIMIT 50
        """)

        result = self.db.execute(sql, {
            'query': fts_query,
            'is_active': is_active,
            'category': category,
            'min_price': min_price,
            'max_price': max_price
        })

        # Map to Product objects
        product_ids = [row[0] for row in result]
        if not product_ids:
            return []

        return self.db.query(Product).filter(Product.id.in_(product_ids)).all()

    def _search_normalized(
        self,
        normalized_query: str,
        is_active: bool,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float]
    ) -> List[Product]:
        """Search using normalized (unaccented) name matching."""
        filters = [
            Product.is_active == is_active,
            or_(
                Product.normalized_name.ilike(f"%{normalized_query}%"),
                Product.name.ilike(f"%{normalized_query}%")
            )
        ]

        if category:
            filters.append(Product.category == category)
        if min_price is not None:
            filters.append(Product.price >= min_price)
        if max_price is not None:
            filters.append(Product.price <= max_price)

        return self.db.query(Product).filter(and_(*filters)).limit(50).all()

    def _search_fuzzy(
        self,
        query: str,
        normalized_query: str,
        is_active: bool,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float],
        exclude_ids: set,
        threshold: int = 70
    ) -> List[Product]:
        """Search using fuzzy matching for typo tolerance."""
        # Get candidate products
        filters = [Product.is_active == is_active]
        if category:
            filters.append(Product.category == category)
        if min_price is not None:
            filters.append(Product.price >= min_price)
        if max_price is not None:
            filters.append(Product.price <= max_price)
        if exclude_ids:
            filters.append(Product.id.notin_(exclude_ids))

        candidates = self.db.query(Product).filter(and_(*filters)).limit(200).all()

        # Fuzzy match against names
        fuzzy_results = []
        for product in candidates:
            # Try fuzzy matching on both original and normalized names
            score_original = fuzz.partial_ratio(query.lower(), product.name.lower())
            score_normalized = fuzz.partial_ratio(
                normalized_query, product.normalized_name or ""
            )
            best_score = max(score_original, score_normalized)

            if best_score >= threshold:
                fuzzy_results.append((product, best_score))

        # Sort by score descending
        fuzzy_results.sort(key=lambda x: x[1], reverse=True)

        return [product for product, score in fuzzy_results[:20]]

    def _search_multi_keyword(
        self,
        keywords: List[str],
        is_active: bool,
        category: Optional[str],
        min_price: Optional[float],
        max_price: Optional[float],
        exclude_ids: set
    ) -> List[Product]:
        """Search using OR logic across multiple keywords."""
        if not keywords:
            return []

        # Build OR conditions for each keyword
        keyword_conditions = []
        for keyword in keywords:
            keyword_conditions.append(Product.normalized_name.ilike(f"%{keyword}%"))
            keyword_conditions.append(Product.name.ilike(f"%{keyword}%"))
            keyword_conditions.append(Product.description.ilike(f"%{keyword}%"))

        filters = [
            Product.is_active == is_active,
            or_(*keyword_conditions)
        ]

        if category:
            filters.append(Product.category == category)
        if min_price is not None:
            filters.append(Product.price >= min_price)
        if max_price is not None:
            filters.append(Product.price <= max_price)
        if exclude_ids:
            filters.append(Product.id.notin_(exclude_ids))

        return self.db.query(Product).filter(and_(*filters)).limit(30).all()

    def get_all_products(self, is_active: bool = True) -> List[Product]:
        """
        Get all products.

        Args:
            is_active: Filter by active status

        Returns:
            List of all products
        """
        return self.db.query(Product).filter(Product.is_active == is_active).all()

    def get_products_page(self, limit: int = 30, offset: int = 0, is_active: bool = True) -> Tuple[List[Product], int, bool, Optional[int]]:
        """
        Get a paginated list of products with total count and has_more flag.
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)
        base_query = self.db.query(Product).filter(Product.is_active == is_active)

        total = base_query.count()
        items, has_more = self._fetch_with_pagination(
            base_query, limit=safe_limit, offset=safe_offset, order_recent=True
        )
        next_offset = safe_offset + safe_limit if has_more else None
        return items, total, has_more, next_offset

    def get_deleted_products_page(self, limit: int = 30, offset: int = 0) -> Tuple[List[Product], int, bool, Optional[int]]:
        """
        Get paginated soft-deleted products ordered by deletion date.
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)
        base_query = self.db.query(Product).filter(
            Product.is_active == False,
            Product.deleted_at.isnot(None)
        ).order_by(Product.deleted_at.desc(), Product.id.desc())

        total = base_query.count()
        results = base_query.offset(safe_offset).limit(safe_limit + 1).all()
        has_more = len(results) > safe_limit
        next_offset = safe_offset + safe_limit if has_more else None
        return results[:safe_limit], total, has_more, next_offset

    def search_products_page(
        self,
        query: Optional[str],
        limit: int = 30,
        offset: int = 0,
        is_active: bool = True
    ) -> Tuple[List[Product], int, bool, Optional[int]]:
        """
        Paginated search over products (active or deleted).
        """
        safe_limit, safe_offset = self._normalize_page_params(limit, offset)
        results = self.search_products(query=query, is_active=is_active)
        total = len(results)
        sliced = results[safe_offset:safe_offset + safe_limit]
        has_more = safe_offset + safe_limit < total
        next_offset = safe_offset + safe_limit if has_more else None
        return sliced, total, has_more, next_offset

    def search_deleted_products(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> List[Product]:
        """
        Search deleted products (in trash) with advanced multi-tier search.

        This is a convenience wrapper around search_products() with is_active=False.
        Uses the same powerful search features: FTS5, fuzzy matching, Vietnamese
        diacritic normalization, and multi-keyword support.

        Args:
            query: Search query (supports Vietnamese with/without diacritics)
            category: Filter by category
            min_price: Minimum price
            max_price: Maximum price

        Returns:
            List of matching deleted products, ranked by relevance
        """
        return self.search_products(
            query=query,
            category=category,
            min_price=min_price,
            max_price=max_price,
            is_active=False  # Only search deleted products
        )

    def update_product(
        self,
        product_id: int,
        name: Optional[str] = None,
        price: Optional[float] = None,
        import_price: Optional[float] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        unit: Optional[str] = None,
        stock_quantity: Optional[int] = None,
        image_paths: Optional[List[str]] = None,
        price_change_reason: str = "Manual update"
    ) -> Optional[Product]:
        """
        Update product information.

        Args:
            product_id: Product ID
            name: New product name
            price: New product price (will track in price history)
            import_price: New import/cost price
            description: New description
            category: New category
            unit: New unit
            stock_quantity: New stock quantity
            image_paths: New image paths
            price_change_reason: Reason for logging price changes

        Returns:
            Updated Product object or None
        """
        product = self.get_product(product_id)
        if not product:
            return None

        # Track price change
        if price is not None and price != product.price:
            self._record_price_change(product, price, reason=price_change_reason)
            product.price = price

        if name is not None:
            product.name = name
            product.normalized_name = normalize_vietnamese(name)

        if import_price is not None:
            product.import_price = import_price

        if description is not None:
            product.description = description

        if category is not None:
            product.category = category

        if unit is not None:
            product.unit = unit

        if stock_quantity is not None:
            product.stock_quantity = stock_quantity

        if image_paths is not None:
            sanitized_images = self._sanitize_image_references(image_paths)
            product.images = sanitized_images

        product.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(product)

        return product

    def delete_product(self, product_id: int) -> bool:
        """
        Soft delete a product (set is_active to False and record deletion timestamp).
        Product can be restored within 30 days, after which it will be permanently deleted.

        Args:
            product_id: Product ID

        Returns:
            True if successful, False otherwise
        """
        product = self.get_product(product_id)
        if not product:
            return False

        product.is_active = False
        product.deleted_at = datetime.utcnow()
        product.updated_at = datetime.utcnow()

        self.db.commit()
        return True

    def delete_products(self, product_ids: List[int]) -> Dict[str, int]:
        """
        Bulk soft delete products.

        Args:
            product_ids: List of product IDs to delete

        Returns:
            Dict with requested count and number of products updated
        """
        unique_ids = list(dict.fromkeys(pid for pid in product_ids if isinstance(pid, int)))
        if not unique_ids:
            return {"requested": 0, "deleted": 0}

        products = self.db.query(Product).filter(
            Product.id.in_(unique_ids),
            Product.is_active == True
        ).all()

        now = datetime.utcnow()
        for product in products:
            product.is_active = False
            product.deleted_at = now
            product.updated_at = now

        self.db.commit()
        return {"requested": len(unique_ids), "deleted": len(products)}

    def restore_product(self, product_id: int) -> Optional[Product]:
        """
        Restore a soft-deleted product.

        Args:
            product_id: Product ID

        Returns:
            Restored product if successful, None otherwise
        """
        # Use get_product with is_active=False to find deleted products
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product or product.is_active:
            return None

        product.is_active = True
        product.deleted_at = None
        product.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(product)

        return product

    def restore_products(self, product_ids: List[int]) -> Dict[str, int]:
        """Bulk restore soft-deleted products."""
        unique_ids = list(dict.fromkeys(pid for pid in product_ids if isinstance(pid, int)))
        if not unique_ids:
            return {"requested": 0, "restored": 0}

        products = self.db.query(Product).filter(
            Product.id.in_(unique_ids),
            Product.is_active == False,
            Product.deleted_at.isnot(None)
        ).all()

        now = datetime.utcnow()
        for product in products:
            product.is_active = True
            product.deleted_at = None
            product.updated_at = now

        self.db.commit()

        return {"requested": len(unique_ids), "restored": len(products)}

    def get_deleted_products(self) -> List[Product]:
        """
        Get all soft-deleted products (in trash).

        Returns:
            List of deleted products ordered by deletion date (newest first)
        """
        return self.db.query(Product).filter(
            Product.is_active == False,
            Product.deleted_at.isnot(None)
        ).order_by(Product.deleted_at.desc()).all()

    def cleanup_old_deletions(self, days_old: int = 30) -> int:
        """
        Permanently delete products that have been in trash for more than specified days.
        This is called by the auto-cleanup background job.

        Args:
            days_old: Number of days after which to permanently delete (default 30)

        Returns:
            Number of products permanently deleted
        """
        from datetime import timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        # Find products deleted before cutoff date
        old_deletions = self.db.query(Product).filter(
            Product.is_active == False,
            Product.deleted_at.isnot(None),
            Product.deleted_at < cutoff_date
        ).all()

        count = len(old_deletions)

        # Permanently delete them
        for product in old_deletions:
            self._delete_product_images(product)
            self.db.delete(product)

        self.db.commit()

        return count

    def permanently_delete_product(self, product_id: int) -> bool:
        """
        Permanently delete a product from database.
        This action cannot be undone.

        Args:
            product_id: Product ID

        Returns:
            True if successful, False otherwise
        """
        # Allow deleting both active and deleted products
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            return False

        self._delete_product_images(product)
        self.db.delete(product)
        self.db.commit()
        return True

    def permanently_delete_products(self, product_ids: List[int]) -> Dict[str, int]:
        """
        Permanently delete multiple products from database.

        Args:
            product_ids: List of product IDs

        Returns:
            Dict with requested count and deleted count
        """
        unique_ids = list(dict.fromkeys(pid for pid in product_ids if isinstance(pid, int)))
        if not unique_ids:
            return {"requested": 0, "deleted": 0}

        products = self.db.query(Product).filter(Product.id.in_(unique_ids)).all()

        for product in products:
            self._delete_product_images(product)
            self.db.delete(product)

        self.db.commit()
        return {"requested": len(unique_ids), "deleted": len(products)}

    def _sanitize_image_references(self, image_paths: List[str]) -> List[str]:
        """
        Normalize a list of image paths while enforcing the maximum limit.
        """
        cleaned: List[str] = []
        for path in image_paths:
            if not path:
                continue
            normalized = self._normalize_stored_path(path)
            if normalized and normalized not in cleaned:
                cleaned.append(normalized)

        if len(cleaned) > self.max_images:
            raise ValueError(f"Each product can have at most {self.max_images} images.")

        return cleaned

    def _normalize_stored_path(self, path: Optional[str]) -> str:
        """Return a normalized filename for comparison/storage."""
        if not path:
            return ""
        candidate = path.strip()
        if not candidate:
            return ""
        return os.path.basename(candidate)

    def _resolve_absolute_path(self, stored_path: str) -> str:
        """Convert stored image reference into an absolute filesystem path."""
        if os.path.isabs(stored_path):
            return stored_path
        return os.path.join(self.image_dir, stored_path)

    def _delete_product_images(self, product: Product) -> None:
        """Remove all stored image files for a product before permanent deletion."""
        for image_ref in list(product.images):
            absolute_path = self._resolve_absolute_path(image_ref)
            if os.path.exists(absolute_path):
                try:
                    os.remove(absolute_path)
                except OSError as exc:
                    logger.warning("Failed to remove image %s for product %s: %s", image_ref, product.id, exc)

    def _determine_extension(self, filename: Optional[str]) -> str:
        """
        Determine a safe file extension for an uploaded image.
        Defaults to .jpg when extension is missing or not allowed.
        """
        if not filename:
            return ".jpg"

        ext = os.path.splitext(filename)[1].lower()
        if ext in self.allowed_extensions:
            return ext
        return ".jpg"

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
                import_price = item.get('import_price')
                import_price_value = None

                if import_price not in (None, ''):
                    import_price_value = float(import_price)

                if not name or price <= 0:
                    errors.append(f"Invalid product data: {item}")
                    continue

                # Check if product exists
                existing_product = self.get_product_by_name(name)

                if existing_product:
                    if update_existing:
                        update_kwargs = {}

                        if existing_product.price != price:
                            update_kwargs['price'] = price
                            self._record_price_change(
                                existing_product,
                                price,
                                reason="Price update from supplier list"
                            )

                        if import_price_value is not None and existing_product.import_price != import_price_value:
                            update_kwargs['import_price'] = import_price_value

                        if update_kwargs:
                            self.update_product(existing_product.id, **update_kwargs)
                            updated_count += 1
                else:
                    if add_new:
                        self.create_product(
                            name=name,
                            price=price,
                            import_price=import_price_value,
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

    def add_product_image(
        self,
        product_id: int,
        data: Optional[bytes] = None,
        source_image_path: Optional[str] = None,
        original_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Add an image to a product.

        Args:
            product_id: Product ID
            data: Raw image bytes (preferred)
            source_image_path: Optional path to copy from
            original_filename: Filename used to determine extension

        Returns:
            Stored filename or None
        """
        product = self.get_product(product_id)
        if not product:
            return None

        current_images = list(product.images)
        if len(current_images) >= self.max_images:
            raise ValueError(f"Each product can have at most {self.max_images} images.")

        if data is None and source_image_path:
            with open(source_image_path, "rb") as src:
                data = src.read()

        if data is None:
            raise ValueError("No image data provided.")

        ext = self._determine_extension(original_filename or source_image_path)
        filename = f"product_{product_id}_{uuid.uuid4().hex}{ext}"
        dest_path = os.path.join(self.image_dir, filename)

        with open(dest_path, "wb") as dest_file:
            dest_file.write(data)

        current_images.append(filename)
        product.images = self._sanitize_image_references(current_images)
        product.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(product)

        return filename

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

        target = self._normalize_stored_path(image_path)
        if not target:
            return False

        current_images = list(product.images)
        matched = None
        for stored in current_images:
            if self._normalize_stored_path(stored) == target:
                matched = stored
                break

        if not matched:
            return False

        current_images.remove(matched)
        product.images = self._sanitize_image_references(current_images)
        product.updated_at = datetime.utcnow()

        absolute_path = self._resolve_absolute_path(matched)
        if os.path.exists(absolute_path):
            os.remove(absolute_path)

        self.db.commit()
        self.db.refresh(product)

        return True

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
