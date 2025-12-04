from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from api.dependencies import get_db
from schemas.product import (
    Product,
    ProductCreate,
    ProductUpdate,
    ProductImageDeleteRequest,
    ProductBulkActionRequest,
)
from schemas.common import PaginatedResponse
from services import ProductService
from config import Config

router = APIRouter()


def _get_product_service(db: Session) -> ProductService:
    """Helper to consistently build the product service."""
    return ProductService(db, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)


@router.get("/products", response_model=PaginatedResponse[Product])
async def get_products(
    limit: int = 30,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get products with pagination (default 30 per page)."""
    product_service = _get_product_service(db)
    items, total, has_more, next_offset = product_service.get_products_page(
        limit=limit,
        offset=offset,
        is_active=True,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/products/search", response_model=PaginatedResponse[Product])
async def search_products(q: str, limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Search products by query with pagination."""
    if not q or not q.strip():
        return {"items": [], "total": 0, "has_more": False, "next_offset": None}

    product_service = _get_product_service(db)
    items, total, has_more, next_offset = product_service.search_products_page(
        query=q,
        limit=limit,
        offset=offset,
        is_active=True,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/products/autocomplete", response_model=List[Product])
async def autocomplete_products(q: str, db: Session = Depends(get_db)):
    """Get autocomplete suggestions for product search (fast, limited results)"""
    if not q or len(q.strip()) < 1:
        return []

    product_service = _get_product_service(db)
    # Search with limit for fast response
    products = product_service.search_products(query=q)
    # Return top 10 most relevant
    return products[:10]


@router.get("/products/trash", response_model=PaginatedResponse[Product])
async def get_trash(limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Get deleted products (trash) with pagination."""
    product_service = _get_product_service(db)
    items, total, has_more, next_offset = product_service.get_deleted_products_page(
        limit=limit,
        offset=offset,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/products/trash/search", response_model=PaginatedResponse[Product])
async def search_trash(q: str, limit: int = 30, offset: int = 0, db: Session = Depends(get_db)):
    """Search deleted products (trash) with advanced multi-tier search and pagination."""
    if not q or not q.strip():
        return {"items": [], "total": 0, "has_more": False, "next_offset": None}

    product_service = _get_product_service(db)
    items, total, has_more, next_offset = product_service.search_products_page(
        query=q,
        limit=limit,
        offset=offset,
        is_active=False,
    )
    return {
        "items": items,
        "total": total,
        "has_more": has_more,
        "next_offset": next_offset,
    }


@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get product by ID"""
    product_service = _get_product_service(db)
    product = product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product"""
    product_service = _get_product_service(db)
    new_product = product_service.create_product(
        name=product.name,
        price=product.price,
        import_price=product.import_price,
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
    product_service = _get_product_service(db)
    
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


@router.post("/products/{product_id}/images", response_model=Product)
async def upload_product_images(
    product_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """Upload one or multiple images for a product."""
    if not files:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất 1 ảnh hợp lệ.")

    product_service = _get_product_service(db)
    product = product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        for upload in files:
            contents = await upload.read()
            if not contents:
                continue
            product_service.add_product_image(
                product_id=product_id,
                data=contents,
                original_filename=upload.filename
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        for upload in files:
            await upload.close()

    return product_service.get_product(product_id)


@router.delete("/products/{product_id}/images", response_model=Product)
async def delete_product_image(
    product_id: int,
    payload: ProductImageDeleteRequest,
    db: Session = Depends(get_db)
):
    """Delete a specific product image."""
    if not payload.path:
        raise HTTPException(status_code=400, detail="Thiếu thông tin ảnh cần xóa.")

    product_service = _get_product_service(db)
    product = product_service.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    removed = product_service.remove_product_image(product_id, payload.path)
    if not removed:
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh cần xóa.")

    return product_service.get_product(product_id)


@router.delete("/products/bulk")
async def bulk_delete_products(
    payload: ProductBulkActionRequest,
    db: Session = Depends(get_db)
):
    """Bulk soft delete products."""
    product_service = _get_product_service(db)
    result = product_service.delete_products(payload.ids)
    return {
        "message": f"{result['deleted']} sản phẩm đã được chuyển vào Thùng rác.",
        "requested": result["requested"],
        "deleted": result["deleted"],
    }


@router.delete("/products/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Soft delete a product (moves to trash, can be restored within 30 days)"""
    product_service = _get_product_service(db)
    success = product_service.delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully. Can be restored from trash within 30 days."}


@router.post("/products/{product_id}/restore", response_model=Product)
async def restore_product(product_id: int, db: Session = Depends(get_db)):
    """Restore a deleted product from trash"""
    product_service = _get_product_service(db)
    restored = product_service.restore_product(product_id)
    if not restored:
        raise HTTPException(status_code=404, detail="Product not found in trash")
    return restored


@router.post("/products/restore/bulk")
async def restore_products(
    payload: ProductBulkActionRequest,
    db: Session = Depends(get_db)
):
    """Bulk restore deleted products."""
    product_service = _get_product_service(db)
    result = product_service.restore_products(payload.ids)
    return {
        "message": f"{result['restored']} sản phẩm đã được khôi phục.",
        "requested": result["requested"],
        "restored": result["restored"],
    }


@router.delete("/products/{product_id}/permanent")
async def permanently_delete_product(product_id: int, db: Session = Depends(get_db)):
    """Permanently delete a product (cannot be undone)"""
    product_service = _get_product_service(db)
    success = product_service.permanently_delete_product(product_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product permanently deleted"}


@router.delete("/products/permanent/bulk")
async def permanently_delete_products(
    payload: ProductBulkActionRequest,
    db: Session = Depends(get_db)
):
    """Bulk permanently delete products."""
    product_service = _get_product_service(db)
    result = product_service.permanently_delete_products(payload.ids)
    return {
        "message": f"{result['deleted']} sản phẩm đã bị xóa vĩnh viễn.",
        "requested": result["requested"],
        "deleted": result["deleted"],
    }
