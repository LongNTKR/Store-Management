from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerStats(BaseModel):
    total_spent: float
    total_orders: int


class CustomerBulkActionRequest(BaseModel):
    ids: List[int] = Field(..., min_length=1, description="List of customer IDs to apply the action to")
