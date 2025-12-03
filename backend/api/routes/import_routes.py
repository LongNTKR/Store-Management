from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os
import shutil

from api.dependencies import get_db
from services import ProductService, OCRService
from config import Config

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
