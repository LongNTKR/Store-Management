from database import get_db_manager
from config import Config

db_manager = get_db_manager(Config.DATABASE_PATH)


def get_db():
    """Dependency to get database session"""
    session = db_manager.get_session()
    try:
        yield session
    finally:
        session.close()
