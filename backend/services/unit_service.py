"""Unit service layer - handles business logic for unit operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from database.models import Unit, Product
from schemas.unit import UnitCreate, UnitUpdate


class UnitService:
    """Service class for managing units."""

    @staticmethod
    def get_units(db: Session, include_inactive: bool = False) -> List[Unit]:
        """Get all units, optionally including inactive ones."""
        query = db.query(Unit)
        if not include_inactive:
            query = query.filter(Unit.is_active == True)
        return query.order_by(Unit.name).all()

    @staticmethod
    def get_unit_by_id(db: Session, unit_id: int) -> Optional[Unit]:
        """Get a unit by ID."""
        return db.query(Unit).filter(Unit.id == unit_id).first()

    @staticmethod
    def get_unit_by_name(db: Session, name: str) -> Optional[Unit]:
        """Get a unit by name."""
        return db.query(Unit).filter(Unit.name == name).first()

    @staticmethod
    def create_unit(db: Session, unit_data: UnitCreate) -> Unit:
        """Create a new unit."""
        # Check if unit with same name already exists
        existing = UnitService.get_unit_by_name(db, unit_data.name)
        if existing:
            raise ValueError(f"Unit with name '{unit_data.name}' already exists")

        unit = Unit(
            name=unit_data.name,
            display_name=unit_data.display_name,
            allows_decimal=unit_data.allows_decimal,
            step_size=unit_data.step_size,
            is_active=True,
            is_system=False  # User-created units are never system units
        )

        try:
            db.add(unit)
            db.commit()
            db.refresh(unit)
            return unit
        except IntegrityError as e:
            db.rollback()
            raise ValueError(f"Failed to create unit: {str(e)}")

    @staticmethod
    def update_unit(db: Session, unit_id: int, unit_data: UnitUpdate) -> Unit:
        """Update an existing unit."""
        unit = UnitService.get_unit_by_id(db, unit_id)
        if not unit:
            raise ValueError(f"Unit with ID {unit_id} not found")

        # If this is a system unit, restrict what can be updated
        if unit.is_system:
            # System units can only have is_active toggled
            if unit_data.is_active is not None:
                unit.is_active = unit_data.is_active
        else:
            # Custom units can be fully updated
            if unit_data.name is not None:
                # Check if new name conflicts with existing unit
                existing = UnitService.get_unit_by_name(db, unit_data.name)
                if existing and existing.id != unit_id:
                    raise ValueError(f"Unit with name '{unit_data.name}' already exists")
                unit.name = unit_data.name

            if unit_data.display_name is not None:
                unit.display_name = unit_data.display_name

            if unit_data.allows_decimal is not None:
                unit.allows_decimal = unit_data.allows_decimal

            if unit_data.step_size is not None:
                unit.step_size = unit_data.step_size

            if unit_data.is_active is not None:
                unit.is_active = unit_data.is_active

        try:
            db.commit()
            db.refresh(unit)
            return unit
        except IntegrityError as e:
            db.rollback()
            raise ValueError(f"Failed to update unit: {str(e)}")

    @staticmethod
    def delete_unit(db: Session, unit_id: int) -> bool:
        """
        Delete a unit (soft delete by setting is_active=False).
        Only non-system units that are not in use can be deleted.
        """
        unit = UnitService.get_unit_by_id(db, unit_id)
        if not unit:
            raise ValueError(f"Unit with ID {unit_id} not found")

        # Cannot delete system units
        if unit.is_system:
            raise ValueError("Cannot delete system units")

        # Check if unit is in use by any products
        product_count = db.query(Product).filter(Product.unit_id == unit_id).count()
        if product_count > 0:
            raise ValueError(f"Cannot delete unit '{unit.name}' because it is used by {product_count} product(s)")

        # Soft delete
        unit.is_active = False
        db.commit()
        return True

    @staticmethod
    def get_product_count_by_unit(db: Session, unit_id: int) -> int:
        """Get the number of products using this unit."""
        return db.query(Product).filter(Product.unit_id == unit_id).count()
