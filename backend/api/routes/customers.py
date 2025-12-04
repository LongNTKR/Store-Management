from fastapi import APIRouter, Depends, HTTPException, Body, Query
from typing import Any
from sqlalchemy.orm import Session
from api.dependencies import get_db
from schemas.customer import (
    Customer,
    CustomerCreate,
    CustomerUpdate,
    CustomerStats,
    CustomerBulkActionRequest
)
from schemas.common import PaginatedResponse
from services import CustomerService

router = APIRouter()


@router.get("/customers", response_model=PaginatedResponse[Customer])
async def get_customers(limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Get customers with pagination"""
    customer_service = CustomerService(db)
    items, total, has_more, next_offset = customer_service.get_customers_paginated(
        limit=limit,
        offset=offset,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/customers/search", response_model=PaginatedResponse[Customer])
async def search_customers(q: str, limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Search customers by query with pagination"""
    if not q or not q.strip():
        return {"items": [], "total": 0, "has_more": False, "next_offset": None}

    customer_service = CustomerService(db)
    items, total, has_more, next_offset = customer_service.search_customers_paginated(
        query=q,
        limit=limit,
        offset=offset,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/customers/trash/list", response_model=PaginatedResponse[Customer])
async def get_trash_customers(limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Get deleted customers with pagination"""
    customer_service = CustomerService(db)
    items, total, has_more, next_offset = customer_service.get_trash_customers_paginated(
        limit=limit,
        offset=offset,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/customers/trash/search", response_model=PaginatedResponse[Customer])
async def search_trash_customers(q: str, limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Search deleted customers with pagination"""
    if not q or not q.strip():
        return {"items": [], "total": 0, "has_more": False, "next_offset": None}

    customer_service = CustomerService(db)
    items, total, has_more, next_offset = customer_service.search_trash_customers_paginated(
        query=q,
        limit=limit,
        offset=offset,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get customer by ID"""
    customer_service = CustomerService(db)
    customer = customer_service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer"""
    customer_service = CustomerService(db)
    new_customer = customer_service.create_customer(
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        notes=customer.notes,
    )
    return new_customer


@router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: int, customer: CustomerUpdate, db: Session = Depends(get_db)):
    """Update customer information"""
    customer_service = CustomerService(db)
    updated_customer = customer_service.update_customer(
        customer_id=customer_id,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        notes=customer.notes,
    )
    if not updated_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return updated_customer


@router.delete("/customers/bulk")
async def bulk_delete_customers(
    payload: Any = Body(default=None),
    ids: list[int] | None = Query(default=None, alias="ids"),
    db: Session = Depends(get_db)
):
    """Bulk soft delete customers (accept ids via body or query)."""
    body_ids = []
    if isinstance(payload, dict):
        maybe_ids = payload.get("ids")
        if isinstance(maybe_ids, list):
            body_ids = [int(x) for x in maybe_ids if isinstance(x, (int, str)) and str(x).isdigit()]

    query_ids = [int(x) for x in ids] if ids else []
    customer_ids = body_ids or query_ids

    if not customer_ids:
        raise HTTPException(status_code=400, detail="Không có khách hàng để xóa")

    customer_service = CustomerService(db)
    result = customer_service.delete_customers(customer_ids)
    return {
        "message": f"{result['deleted']} khách hàng đã được chuyển vào Thùng rác.",
        "requested": result["requested"],
        "deleted": result["deleted"],
    }


@router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete a customer"""
    customer_service = CustomerService(db)
    success = customer_service.delete_customer(customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}


@router.get("/customers/{customer_id}/stats", response_model=CustomerStats)
async def get_customer_stats(customer_id: int, db: Session = Depends(get_db)):
    """Get customer statistics"""
    customer_service = CustomerService(db)
    stats = customer_service.get_customer_stats(customer_id)
    return stats


@router.post("/customers/restore/bulk")
async def restore_customers(
    payload: CustomerBulkActionRequest,
    db: Session = Depends(get_db)
):
    """Bulk restore deleted customers."""
    customer_service = CustomerService(db)
    result = customer_service.restore_customers(payload.ids)
    return {
        "message": f"{result['restored']} khách hàng đã được khôi phục.",
        "requested": result["requested"],
        "restored": result["restored"],
    }


@router.post("/customers/{customer_id}/restore")
async def restore_customer(customer_id: int, db: Session = Depends(get_db)):
    """Restore a deleted customer"""
    customer_service = CustomerService(db)
    success = customer_service.restore_customer(customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer restored successfully"}


@router.delete("/customers/{customer_id}/permanent")
async def permanently_delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Permanently delete a customer"""
    customer_service = CustomerService(db)
    success = customer_service.permanently_delete_customer(customer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer permanently deleted"}
