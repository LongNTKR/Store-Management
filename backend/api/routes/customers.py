from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from api.dependencies import get_db
from schemas.customer import Customer, CustomerCreate, CustomerStats
from services import CustomerService

router = APIRouter()


@router.get("/customers", response_model=List[Customer])
async def get_customers(db: Session = Depends(get_db)):
    """Get all customers"""
    customer_service = CustomerService(db)
    customers = customer_service.get_all_customers()
    return customers


@router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Get customer by ID"""
    customer_service = CustomerService(db)
    customer = customer_service.get_customer(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/customers/search", response_model=List[Customer])
async def search_customers(q: str, db: Session = Depends(get_db)):
    """Search customers by query"""
    customer_service = CustomerService(db)
    customers = customer_service.search_customers(query=q)
    return customers


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
