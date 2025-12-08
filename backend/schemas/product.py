from pydantic import BaseModel, Field, computed_field, model_validator
from typing import Optional, List, Any
from datetime import datetime, timedelta
import pytz
from schemas.unit import Unit


class ProductBase(BaseModel):
    name: str
    price: Optional[float] = None
    import_price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_id: int  # Foreign key to units table
    stock_quantity: float = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    import_price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit_id: Optional[int] = None  # Foreign key to units table
    stock_quantity: Optional[float] = None


class Product(BaseModel):
    # Note: Not inheriting from ProductBase to customize unit field
    id: int
    name: str
    price: Optional[float] = None
    import_price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Unit  # Nested unit object from relationship
    stock_quantity: float = 0
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
    
    @model_validator(mode='before')
    @classmethod
    def populate_unit_from_relationship(cls, data: Any) -> Any:
        """Map unit_ref relationship to unit field for Pydantic serialization."""
        # Handle both dict and ORM object
        if isinstance(data, dict):
            # If unit_ref exists in dict, map it to unit
            if 'unit_ref' in data and data['unit_ref']:
                data['unit'] = data['unit_ref']
        else:
            # For ORM objects, check unit_ref attribute
            if hasattr(data, 'unit_ref') and data.unit_ref:
                # Convert ORM object to dict and set unit from unit_ref
                if not hasattr(data, '__dict__'):
                    return data
                data_dict = {k: v for k, v in data.__dict__.items() if not k.startswith('_')}
                data_dict['unit'] = data.unit_ref
                return data_dict
        return data

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
