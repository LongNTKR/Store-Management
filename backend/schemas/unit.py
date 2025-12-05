from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UnitBase(BaseModel):
    """Base schema for Unit"""
    name: str = Field(..., min_length=1, max_length=50, description="Internal unit name (e.g., 'cai', 'kg')")
    display_name: str = Field(..., min_length=1, max_length=100, description="User-friendly display name (e.g., 'Cái', 'Kilogram')")
    allows_decimal: bool = Field(default=False, description="Whether this unit allows decimal quantities")
    step_size: float = Field(default=1.0, gt=0, description="Increment step size for UI controls")


class UnitCreate(UnitBase):
    """Schema for creating a new unit"""
    pass


class UnitUpdate(BaseModel):
    """Schema for updating an existing unit"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    allows_decimal: Optional[bool] = None
    step_size: Optional[float] = Field(None, gt=0)
    is_active: Optional[bool] = None


class Unit(UnitBase):
    """Schema for Unit response"""
    id: int
    is_active: bool = True
    is_system: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
