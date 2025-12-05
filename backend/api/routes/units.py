"""Unit API routes - RESTful endpoints for unit management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from api.dependencies import get_db
from schemas.unit import Unit, UnitCreate, UnitUpdate
from services.unit_service import UnitService

router = APIRouter(prefix="/api/units", tags=["units"])


@router.get("", response_model=List[Unit])
def get_units(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get all units.
    
    Args:
        include_inactive: Whether to include inactive units (default: False)
    
    Returns:
        List of units
    """
    return UnitService.get_units(db, include_inactive=include_inactive)


@router.get("/{unit_id}", response_model=Unit)
def get_unit(unit_id: int, db: Session = Depends(get_db)):
    """
    Get a specific unit by ID.
    
    Args:
        unit_id: ID of the unit to retrieve
    
    Returns:
        Unit details
    
    Raises:
        404: If unit not found
    """
    unit = UnitService.get_unit_by_id(db, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unit with ID {unit_id} not found"
        )
    return unit


@router.post("", response_model=Unit, status_code=status.HTTP_201_CREATED)
def create_unit(unit_data: UnitCreate, db: Session = Depends(get_db)):
    """
    Create a new unit.
    
    Args:
        unit_data: Unit creation data
    
    Returns:
        Created unit
    
    Raises:
        400: If unit with same name already exists
    """
    try:
        return UnitService.create_unit(db, unit_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{unit_id}", response_model=Unit)
def update_unit(
    unit_id: int,
    unit_data: UnitUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing unit.
    
    Args:
        unit_id: ID of the unit to update
        unit_data: Updated unit data
    
    Returns:
        Updated unit
    
    Raises:
        404: If unit not found
        400: If update violates constraints (e.g., duplicate name)
    """
    try:
        return UnitService.update_unit(db, unit_id, unit_data)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(unit_id: int, db: Session = Depends(get_db)):
    """
    Delete a unit (soft delete).
    
    Only custom units that are not in use can be deleted.
    System units cannot be deleted.
    
    Args:
        unit_id: ID of the unit to delete
    
    Raises:
        404: If unit not found
        400: If unit is a system unit or is in use by products
    """
    try:
        UnitService.delete_unit(db, unit_id)
    except ValueError as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )


@router.get("/{unit_id}/product-count", response_model=dict)
def get_product_count(unit_id: int, db: Session = Depends(get_db)):
    """
    Get the number of products using this unit.
    
    Args:
        unit_id: ID of the unit
    
    Returns:
        Dictionary with product count
    
    Raises:
        404: If unit not found
    """
    unit = UnitService.get_unit_by_id(db, unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unit with ID {unit_id} not found"
        )
    
    count = UnitService.get_product_count_by_unit(db, unit_id)
    return {"unit_id": unit_id, "product_count": count}
