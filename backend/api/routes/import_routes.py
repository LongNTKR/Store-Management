from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
import os
import shutil
from typing import List

from api.dependencies import get_db
from services import ProductService, OCRService
from services.ai_provider_service import AIProviderService
from services.ai_config_service import AIConfigService
from database.models import Product
from config import Config
from schemas.import_schemas import (
    NetworkCheckResponse,
    PreviewResponse,
    PreviewItem,
    PreviewSummary,
    ConfirmImportRequest,
    ImportResult,
    SuggestedMatch,
)
from utils.network import check_internet_connectivity
from utils.fuzzy_matcher import find_similar_products, is_exact_match

router = APIRouter()


@router.post("/import/quotation")
async def import_quotation(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import quotation from file (image/PDF/Excel/CSV)"""
    file_path = os.path.join(Config.TEMP_DIR, os.path.basename(file.filename))

    try:
        # Initialize services
        product_service = ProductService(db, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)

        try:
            ocr_service = OCRService(Config.GOOGLE_CREDENTIALS_PATH if Config.GOOGLE_CREDENTIALS_PATH else None)
        except Exception:
            ocr_service = None

        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process file
        updated, added, errors = product_service.import_from_file(
            file_path,
            ocr_service,
            update_existing=True,
            add_new=True
        )

        return {
            "updated": updated,
            "added": added,
            "errors": errors
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.remove(file_path)
        except FileNotFoundError:
            pass


@router.get("/import/check-connection", response_model=NetworkCheckResponse)
async def check_connection():
    """Check internet connectivity before using AI import."""
    result = check_internet_connectivity()
    return NetworkCheckResponse(
        connected=result["connected"],
        message=result["message"]
    )


@router.post("/import/preview-ai", response_model=PreviewResponse)
async def preview_ai_import(
    file: UploadFile = File(..., description="Image file to analyze"),
    db: Session = Depends(get_db)
):
    """
    Preview AI-powered price list import from image.
    Analyzes image with AI (OpenAI -> xAI -> Google fallback) and returns detected products
    with match information for user review.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ file hình ảnh (JPG, PNG, WEBP)"
        )

    try:
        # Read image data
        image_data = await file.read()

        # Analyze image with AI
        ai_service = AIProviderService(db)
        result = ai_service.analyze_price_list_image(image_data)

        detected_products = result["products"]
        provider_used = result["provider_used"]
        errors = result["errors"]

        # Get all active products for matching
        all_products = db.query(Product).filter(Product.is_active == True).all()

        # Process each detected product
        preview_items: List[PreviewItem] = []

        for detected in detected_products:
            detected_name = detected.get('name', '').strip()
            
            # Only name is required, prices are optional
            if not detected_name:
                continue

            # Parse and validate detected_price (optional)
            detected_price = detected.get('price')
            if detected_price is not None:
                try:
                    detected_price = float(detected_price)
                except (ValueError, TypeError):
                    detected_price = None
            
            # Parse and validate import_price (optional)
            detected_import_price = detected.get('import_price')
            if detected_import_price is not None:
                try:
                    detected_import_price = float(detected_import_price)
                except (ValueError, TypeError):
                    detected_import_price = None

            detected_unit = detected.get('unit')
            detected_category = detected.get('category')

            # Check for exact match
            exact_match = None
            for product in all_products:
                if is_exact_match(detected_name, product.name):
                    exact_match = product
                    break

            if exact_match:
                # Exact match found
                preview_items.append(PreviewItem(
                    detected_name=detected_name,
                    detected_price=detected_price,
                    detected_import_price=detected_import_price,
                    detected_unit=detected_unit,
                    detected_category=detected_category,
                    match_status='exact_match',
                    existing_product_id=exact_match.id,
                    existing_product_name=exact_match.name,
                    existing_price=exact_match.price,
                    existing_import_price=exact_match.import_price,
                    suggested_matches=[],
                    suggested_action='update'
                ))
            else:
                # No exact match - try fuzzy matching
                similar_products = find_similar_products(
                    detected_name,
                    all_products,
                    threshold=80,
                    limit=5
                )

                if similar_products:
                    # Similar matches found
                    suggested_matches = [
                        SuggestedMatch(
                            product_id=product.id,
                            product_name=product.name,
                            current_price=product.price,
                            current_import_price=product.import_price,
                            similarity_score=score
                        )
                        for product, score in similar_products
                    ]

                    preview_items.append(PreviewItem(
                        detected_name=detected_name,
                        detected_price=detected_price,
                        detected_import_price=detected_import_price,
                        detected_unit=detected_unit,
                        detected_category=detected_category,
                        match_status='similar_match',
                        existing_product_id=None,
                        existing_product_name=None,
                        existing_price=None,
                        existing_import_price=None,
                        suggested_matches=suggested_matches,
                        suggested_action='create'  # Default to create, user can choose to update similar
                    ))
                else:
                    # No matches - completely new product
                    preview_items.append(PreviewItem(
                        detected_name=detected_name,
                        detected_price=detected_price,
                        detected_import_price=detected_import_price,
                        detected_unit=detected_unit,
                        detected_category=detected_category,
                        match_status='new',
                        existing_product_id=None,
                        existing_product_name=None,
                        existing_price=None,
                        existing_import_price=None,
                        suggested_matches=[],
                        suggested_action='create'
                    ))

        # Calculate summary
        new_count = sum(1 for item in preview_items if item.match_status == 'new')
        update_count = sum(1 for item in preview_items if item.match_status == 'exact_match')
        similar_count = sum(1 for item in preview_items if item.match_status == 'similar_match')

        summary = PreviewSummary(
            total=len(preview_items),
            new_count=new_count,
            update_count=update_count,
            similar_count=similar_count
        )

        return PreviewResponse(
            items=preview_items,
            summary=summary,
            provider_used=provider_used,
            errors=errors
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xử lý ảnh: {str(e)}")


@router.post("/import/confirm", response_model=ImportResult)
async def confirm_import(
    request: ConfirmImportRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm and execute import from preview data.
    User can modify detected data and choose action (create/update/skip) for each item.
    """

    product_service = ProductService(db, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)

    updated_count = 0
    added_count = 0
    skipped_count = 0
    errors: List[str] = []

    for item in request.items:
        try:
            if item.action == 'skip':
                skipped_count += 1
                continue

            # Map unit string to unit_id (find or create)
            unit_id = None
            if item.unit:
                from database.models import Unit
                # Try to find existing unit by name
                unit = db.query(Unit).filter(Unit.name == item.unit.lower()).first()
                if not unit:
                    # Create new unit if not found
                    from database.models import get_vn_time
                    unit = Unit(
                        name=item.unit.lower(),
                        display_name=item.unit.capitalize(),
                        allows_decimal=False,  # Default to integer
                        step_size=1.0,
                        is_active=True,
                        is_system=False,
                        created_at=get_vn_time(),
                        updated_at=get_vn_time()
                    )
                    db.add(unit)
                    db.flush()  # Get the ID without committing
                unit_id = unit.id
            else:
                # Default to unit ID 1 (typically "cái")
                unit_id = 1

            if item.action == 'create':
                # Create new product
                product_service.create_product(
                    name=item.name,
                    price=item.price,
                    import_price=item.import_price,
                    unit_id=unit_id,
                    category=item.category,
                    description=None,
                    stock_quantity=0
                )
                added_count += 1

            elif item.action == 'update':
                if not item.product_id:
                    errors.append(f"{item.name}: Thiếu product_id cho hành động update")
                    continue

                # Get existing product
                existing = product_service.get_product(item.product_id)
                if not existing:
                    errors.append(f"{item.name}: Không tìm thấy sản phẩm ID {item.product_id}")
                    continue

                # Update product
                product_service.update_product(
                    product_id=item.product_id,
                    name=item.name,
                    price=item.price,
                    import_price=item.import_price,
                    unit_id=unit_id,
                    category=item.category
                )
                updated_count += 1

        except Exception as e:
            errors.append(f"{item.name}: {str(e)}")
            continue

    return ImportResult(
        updated=updated_count,
        added=added_count,
        skipped=skipped_count,
        errors=errors
    )
