"""Pydantic schemas for AI-powered import functionality."""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# Enums
MatchStatusType = Literal['new', 'exact_match', 'similar_match']
ActionType = Literal['create', 'update', 'skip']


class SuggestedMatch(BaseModel):
    """Suggested product match from fuzzy matching."""
    product_id: int
    product_name: str
    current_price: float
    current_import_price: Optional[float] = None
    similarity_score: float = Field(..., ge=0, le=100, description="Similarity score 0-100")


class DetectedProduct(BaseModel):
    """Product detected by AI from image."""
    name: str = Field(
        ...,
        min_length=1,
        description="Tên sản phẩm đầy đủ, chính xác như trong ảnh. Giữ nguyên chữ hoa/thường, số, ký tự đặc biệt. VD: 'Coca Cola 330ml', 'Bánh Oreo Vani 137g'. Field BẮT BUỘC duy nhất."
    )
    import_price: Optional[float] = Field(
        None,
        ge=0,
        description="Giá nhập/giá sỉ/giá vốn. CHỈ lấy SỐ, loại bỏ ký hiệu tiền tệ (đ, VND, vnđ, ₫) và dấu phân cách. VD: '25.000đ' → 25000. QUAN TRỌNG: Nếu bảng giá chỉ có 1 cột giá KHÔNG ghi rõ loại → mặc định điền vào đây (giả định là giá nhập)."
    )
    price: Optional[float] = Field(
        None,
        gt=0,
        description="Giá bán lẻ (tùy chọn). CHỈ điền nếu bảng giá GHI RÕ 'giá bán' hoặc có 2 cột giá (giá nhập + giá bán). Áp dụng quy tắc giống import_price. VD: '35.000đ' → 35000"
    )
    unit: Optional[str] = Field(
        None,
        description="Đơn vị tính (tùy chọn). VD: cái, chiếc, hộp, kg, gram, lít, ml, thùng, bịch, chai, lon. Thường nằm cạnh tên hoặc số lượng"
    )
    category: Optional[str] = Field(
        None,
        description="Danh mục/nhóm sản phẩm (tùy chọn). Lấy từ tiêu đề phần nếu ảnh có phân nhóm. VD: 'Đồ uống', 'Bánh kẹo', 'Gia vị'"
    )


class PreviewItem(BaseModel):
    """Preview item with match information."""
    # Detected data
    detected_name: str
    detected_price: float
    detected_import_price: Optional[float] = None
    detected_unit: Optional[str] = None
    detected_category: Optional[str] = None

    # Match status
    match_status: MatchStatusType
    existing_product_id: Optional[int] = None
    existing_product_name: Optional[str] = None
    existing_price: Optional[float] = None
    existing_import_price: Optional[float] = None

    # Fuzzy match suggestions (for 'similar_match' status)
    suggested_matches: List[SuggestedMatch] = Field(default_factory=list)

    # Default action suggested by system
    suggested_action: ActionType


class PreviewSummary(BaseModel):
    """Summary statistics for preview."""
    total: int = Field(..., ge=0)
    new_count: int = Field(..., ge=0)
    update_count: int = Field(..., ge=0)
    similar_count: int = Field(..., ge=0)


class PreviewResponse(BaseModel):
    """Response for preview endpoint."""
    items: List[PreviewItem]
    summary: PreviewSummary
    provider_used: str = Field(..., description="AI provider that succeeded (openai, grok, google)")
    errors: List[str] = Field(default_factory=list, description="Errors from failed providers")


class ConfirmImportItem(BaseModel):
    """Item to import after user confirmation."""
    action: ActionType
    product_id: Optional[int] = Field(None, description="Required if action=update")

    # Product data (user may have edited these)
    name: str = Field(..., min_length=1)
    price: float = Field(..., gt=0)
    import_price: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = None
    category: Optional[str] = None


class ConfirmImportRequest(BaseModel):
    """Request for confirm import endpoint."""
    items: List[ConfirmImportItem] = Field(..., min_items=1)


class ImportResult(BaseModel):
    """Result of import operation."""
    updated: int = Field(..., ge=0, description="Number of products updated")
    added: int = Field(..., ge=0, description="Number of products added")
    skipped: int = Field(..., ge=0, description="Number of items skipped")
    errors: List[str] = Field(default_factory=list, description="List of errors")


class NetworkCheckResponse(BaseModel):
    """Response for network check endpoint."""
    connected: bool
    message: str



