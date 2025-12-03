from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import os
import shutil

from api.dependencies import get_db
from services import ProductService, ImageSearchService
from schemas.product import Product
from config import Config

router = APIRouter()


class TextSearchRequest(BaseModel):
    query: str


class ImageSearchResult(BaseModel):
    product: Product
    similarity: float


@router.post("/search/text", response_model=List[Product])
async def search_text(request: TextSearchRequest, db: Session = Depends(get_db)):
    """Search products by text"""
    product_service = ProductService(db, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)
    products = product_service.search_products(query=request.query)
    return products


@router.post("/search/image", response_model=List[ImageSearchResult])
async def search_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Search products by image similarity"""
    try:
        # Initialize services
        product_service = ProductService(db, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)
        
        try:
            image_search_service = ImageSearchService(
                Config.GOOGLE_CREDENTIALS_PATH if Config.GOOGLE_CREDENTIALS_PATH else None
            )
        except:
            raise HTTPException(
                status_code=503,
                detail="Image search service unavailable. Google Vision API not configured."
            )
        
        # Save uploaded image
        img_path = os.path.join(Config.TEMP_DIR, "search_image.jpg")
        with open(img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get all products with images
        products = product_service.get_all_products()
        product_images = [
            (p.id, p.images[0])
            for p in products
            if p.images
        ]
        
        if not product_images:
            return []
        
        # Search similar products
        results = image_search_service.search_similar_products(
            img_path,
            product_images,
            top_k=5
        )
        
        # Clean up
        os.remove(img_path)
        
        # Format results
        formatted_results = []
        for product_id, similarity in results:
            product = product_service.get_product(product_id)
            if product:
                formatted_results.append({
                    "product": product,
                    "similarity": similarity
                })
        
        return formatted_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
