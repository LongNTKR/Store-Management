"""Background jobs for the Store Management API."""

import logging
from datetime import datetime
from sqlalchemy.orm import Session
from database import DatabaseManager
from config import Config
from services import ProductService, InvoiceService

logger = logging.getLogger(__name__)


def cleanup_old_deletions():
    """
    Background job to permanently delete products that have been in trash for 30+ days.
    Called automatically by APScheduler every day at 2 AM.
    """
    try:
        db_manager = DatabaseManager(Config.DATABASE_PATH)
        session = db_manager.get_session()

        product_service = ProductService(session, Config.IMAGE_DIR, Config.MAX_PRODUCT_IMAGES)
        count = product_service.cleanup_old_deletions(days_old=30)

        if count > 0:
            logger.info(f"Auto-cleanup: Permanently deleted {count} products from trash")
        else:
            logger.debug("Auto-cleanup: No products to delete")

        session.close()
    except Exception as e:
        logger.error(f"Error during auto-cleanup job: {str(e)}", exc_info=True)


def cleanup_processing_invoices(max_age_hours: int = 24):
    """
    Background job to remove 'processing' invoices older than the allowed window.
    """
    try:
        db_manager = DatabaseManager(Config.DATABASE_PATH)
        session = db_manager.get_session()

        invoice_service = InvoiceService(session, Config.INVOICE_DIR)
        deleted = invoice_service.cleanup_processing_invoices(max_age_hours=max_age_hours)

        if deleted > 0:
            logger.info(f"Auto-cleanup: Deleted {deleted} stale processing invoices older than {max_age_hours}h")
        else:
            logger.debug("Auto-cleanup: No stale processing invoices to remove")

        session.close()
    except Exception as e:
        logger.error(f"Error during processing-invoice cleanup job: {str(e)}", exc_info=True)
