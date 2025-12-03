from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProductBase(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    category: Optional[str] = None
    unit: str = "cái"
    stock_quantity: int = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    stock_quantity: Optional[int] = None


class Product(ProductBase):
    id: int
    image_paths: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True
