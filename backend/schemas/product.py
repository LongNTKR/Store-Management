from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ProductBase(BaseModel):
    name: str
    price: float
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

    class Config:
        from_attributes = True


class ProductImageDeleteRequest(BaseModel):
    path: str = Field(..., description="Stored image filename to remove")


class ProductBulkActionRequest(BaseModel):
    ids: List[int] = Field(..., min_length=1, description="List of product IDs to apply the action to")
