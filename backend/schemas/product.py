from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
from datetime import datetime, timedelta
import pytz


class ProductBase(BaseModel):
    name: str
    price: Optional[float] = None
    import_price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "cái"
    stock_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    import_price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock_quantity: Optional[int] = None


class Product(ProductBase):
    id: int
    images: List[str] = []
    image_paths: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    deleted_at: Optional[datetime] = None
    
    # Update tracking timestamps
    price_updated_at: Optional[datetime] = None
    import_price_updated_at: Optional[datetime] = None
    info_updated_at: Optional[datetime] = None

    @computed_field
    @property
    def is_new(self) -> bool:
        """Check if product was created within the last 3 days."""
        return self._is_within_3_days(self.created_at)
    
    @computed_field
    @property
    def recently_updated_price(self) -> bool:
        """Check if price was updated within the last 3 days."""
        if not self.price_updated_at:
            return False
        return self._is_within_3_days(self.price_updated_at)
    
    @computed_field
    @property
    def recently_updated_import_price(self) -> bool:
        """Check if import_price was updated within the last 3 days."""
        if not self.import_price_updated_at:
            return False
        return self._is_within_3_days(self.import_price_updated_at)
    
    @computed_field
    @property
    def recently_updated_info(self) -> bool:
        """Check if product info was updated within the last 3 days."""
        if not self.info_updated_at:
            return False
        return self._is_within_3_days(self.info_updated_at)
    
    def _is_within_3_days(self, timestamp: datetime) -> bool:
        """Helper to check if timestamp is within 3 days."""
        VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')
        now = datetime.now(VN_TZ)
        
        # Ensure timezone-aware
        ts = timestamp
        if ts.tzinfo is None:
            ts = VN_TZ.localize(ts)
        
        # Calculate age in days
        age = now - ts
        return age < timedelta(days=3)

    class Config:
        from_attributes = True


class ProductImageDeleteRequest(BaseModel):
    path: str = Field(..., description="Stored image filename to remove")


class ProductBulkActionRequest(BaseModel):
    ids: List[int] = Field(..., min_length=1, description="List of product IDs to apply the action to")
