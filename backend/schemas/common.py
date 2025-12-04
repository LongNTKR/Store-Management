from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    has_more: bool
    next_offset: Optional[int] = None
