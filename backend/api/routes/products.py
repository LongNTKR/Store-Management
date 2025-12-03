from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from api.dependencies import get_db
from schemas.product import Product, ProductCreate, ProductUpdate
from services import ProductService
from config import Config

router = APIRouter()


@router.get("/products", response_model=List[Product])
async def get_products(db: Session = Depends(get_db)):
    """Get all products"""
    product_service = ProductService(db, Config.IMAGE_DIR)
    products = product_service.get_all_products()
    return products


@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get product by ID"""
    product_service = ProductService(db, Config.IMAGE_DIR)
    product = product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/search", response_model=List[Product])
async def search_products(q: str, db: Session = Depends(get_db)):
    """Search products by query"""
    product_service = ProductService(db, Config.IMAGE_DIR)
    products = product_service.search_products(query=q)
    return products


@router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    product_service = ProductService(db, Config.IMAGE_DIR)
    new_product = product_service.create_product(
        name=product.name,
        price=product.price,
        description=product.description,
        category=product.category,
        unit=product.unit,
    )
    return new_product


@router.put("/products/{product_id}", response_model=Product)
async def update_product(
    product_id: int, 
    product_update: ProductUpdate, 
    db: Session = Depends(get_db)
):
    """Update a product"""
    product_service = ProductService(db, Config.IMAGE_DIR)
    
    # Build update dict from non-None fields
    update_data = {
        k: v 
        for k, v in product_update.model_dump().items() 
        if v is not None
    }
    
    updated_product = product_service.update_product(product_id, **update_data)
    if not updated_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return updated_product


@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product"""
    product_service = ProductService(db, Config.IMAGE_DIR)
    success = product_service.delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}
