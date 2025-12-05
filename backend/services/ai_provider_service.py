"""
AI Provider Service for multimodal price list analysis.
Supports OpenAI GPT-4V, xAI Grok, and Google Gemini Vision with fallback chain.
"""
import json
import base64
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
import logging

from services.ai_config_service import AIConfigService
from schemas.import_schemas import DetectedProduct

logger = logging.getLogger(__name__)


class AIProviderService:
    """Service for analyzing price list images using AI providers with fallback."""

    # Provider priority order (OpenAI -> Google Gemini -> xAI Grok)
    PROVIDER_PRIORITY = ['openai', 'google', 'grok']

    @staticmethod
    def _generate_system_prompt() -> str:
        """Generate system prompt from DetectedProduct schema."""
        # Get JSON schema from Pydantic model
        schema = DetectedProduct.model_json_schema()
        properties = schema.get('properties', {})
        required_fields = schema.get('required', [])

        # Build field descriptions
        field_descriptions = []
        for field_name, field_info in properties.items():
            description = field_info.get('description', '')
            field_type = field_info.get('type', 'any')
            is_required = field_name in required_fields
            required_text = "BẮT BUỘC" if is_required else "TÙY CHỌN"

            field_descriptions.append(f"  \"{field_name}\": {field_type}  // {required_text} - {description}")

        schema_text = "{\n" + "\n".join(field_descriptions) + "\n}"

        # Build complete prompt
        prompt = f"""Bạn là một AI chuyên gia phân tích bảng giá nhập hàng và danh sách sản phẩm từ hình ảnh.
Nhiệm vụ: Trích xuất TẤT CẢ thông tin sản phẩm từ hình ảnh một cách chính xác và đầy đủ.

=== PRODUCT SCHEMA ===
Mỗi sản phẩm cần có cấu trúc JSON như sau:
{schema_text}

=== QUY TẮC XỬ LÝ GIÁ (QUAN TRỌNG!) ===

1. **Chỉ có TÊN SẢN PHẨM (name) là BẮT BUỘC**

2. **Nếu bảng giá có 1 cột giá KHÔNG ghi rõ loại:**
   → Điền vào `import_price` (giả định là giá nhập)
   → Bỏ qua `price`

3. **Nếu bảng giá có 2 cột giá hoặc ghi rõ:**
   - Cột "Giá nhập"/"Giá sỉ"/"Giá vốn" → `import_price`
   - Cột "Giá bán"/"Giá lẻ" → `price`

4. **Nếu không có giá nào:**
   → Chỉ cần có tên sản phẩm, bỏ qua cả 2 field giá

=== YÊU CẦU ĐẦU RA ===

✓ Trả về JSON array chứa TẤT CẢ sản phẩm tìm được
✓ Chỉ trả về JSON thuần túy, KHÔNG thêm text giải thích, markdown, hoặc code block
✓ Nếu không tìm thấy sản phẩm nào: trả về []
✓ Đảm bảo JSON hợp lệ (valid JSON syntax)

=== VÍ DỤ OUTPUT ===

[
  {{
    "name": "Nước ngọt Coca Cola 330ml",
    "import_price": 8500,
    "price": 10000,
    "unit": "lon",
    "category": "Đồ uống"
  }},
  {{
    "name": "Bánh Oreo vị Vani 137g",
    "import_price": 25000,
    "unit": "hộp"
  }},
  {{
    "name": "Gạo ST25",
    "import_price": 95000,
    "unit": "kg"
  }},
  {{
    "name": "Dầu ăn Simply"
  }}
]

=== LƯU Ý QUAN TRỌNG ===
- Đọc kỹ TOÀN BỘ hình ảnh, không bỏ sót sản phẩm nào
- Ưu tiên độ chính xác: tên phải khớp 100% với ảnh
- MẶC ĐỊNH: Giá trong bảng giá nhập → import_price (trừ khi ghi rõ là giá bán)
- Xử lý cả bảng giá ngang/dọc, nhiều cột, có hoặc không có đường kẻ
- Bỏ qua header/footer không phải sản phẩm (tiêu đề bảng, ghi chú, logo)
- Có thể có sản phẩm chỉ có tên mà không có giá"""

        return prompt

    def __init__(self, db: Session):
        """
        Initialize AI Provider Service.

        Args:
            db: Database session for accessing AI configs
        """
        self.db = db

    def _encode_image_base64(self, image_data: bytes) -> str:
        """Encode image bytes to base64 string."""
        return base64.b64encode(image_data).decode('utf-8')

    def _get_available_providers(self) -> List[Tuple[str, str, str]]:
        """
        Get list of available providers with their API keys.

        Returns:
            List of tuples: (provider_name, api_key, selected_model)
        """
        available = []

        for provider in self.PROVIDER_PRIORITY:
            try:
                config = AIConfigService.get_config_by_provider(self.db, provider)

                if not config:
                    logger.info(f"Provider {provider} not configured")
                    continue

                if not config.is_enabled:
                    logger.info(f"Provider {provider} is disabled")
                    continue

                if not config.api_key_encrypted:
                    logger.info(f"Provider {provider} has no API key")
                    continue

                # Decrypt API key (Internal use)
                api_key = AIConfigService.get_decrypted_api_key_internal(
                    self.db, provider
                )

                available.append((provider, api_key, config.selected_model))
                logger.info(f"Provider {provider} is available")

            except Exception as e:
                logger.warning(f"Error checking provider {provider}: {str(e)}")
                continue

        return available

    def _analyze_with_openai(
        self,
        image_data: bytes,
        api_key: str,
        model: Optional[str] = None
    ) -> List[Dict]:
        """
        Analyze image with OpenAI GPT-4V.

        Args:
            image_data: Image bytes
            api_key: OpenAI API key
            model: Model to use (default: gpt-4o)

        Returns:
            List of detected products

        Raises:
            Exception: If API call fails
        """
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        model = model or "gpt-4o"

        # Encode image
        base64_image = self._encode_image_base64(image_data)

        try:
            # Simple API call - following OpenAI docs exactly
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": self._generate_system_prompt() + "\n\nHãy phân tích hình ảnh này và trích xuất danh sách sản phẩm. Trả về JSON format."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                }
                            }
                        ]
                    }
                ],
                max_completion_tokens=16384  # High limit for many products
            )

            # Parse response
            content = response.choices[0].message.content
            data = json.loads(content)

            # Handle different response formats
            if isinstance(data, list):
                products = data
            elif isinstance(data, dict):
                products = (
                    data.get('products') or
                    data.get('items') or
                    data.get('data') or
                    []
                )
            else:
                products = []

            logger.info(f"OpenAI detected {len(products)} products")
            return products

        except Exception as e:
            logger.error(f"OpenAI analysis failed: {str(e)}")
            raise

    def _analyze_with_grok(
        self,
        image_data: bytes,
        api_key: str,
        model: Optional[str] = None
    ) -> List[Dict]:
        """
        Analyze image with xAI Grok Vision.

        Args:
            image_data: Image bytes
            api_key: xAI API key
            model: Model to use (default: grok-2-vision-1212)

        Returns:
            List of detected products

        Raises:
            Exception: If API call fails
        """
        from openai import OpenAI

        # xAI uses OpenAI-compatible API
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.x.ai/v1"
        )
        model = model or "grok-2-vision-1212"

        # Encode image
        base64_image = self._encode_image_base64(image_data)

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": self._generate_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Hãy phân tích hình ảnh này và trích xuất danh sách sản phẩm."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=8192,  # High limit for many products (Grok uses legacy parameter)
                # Note: Some models don't support custom temperature, using default
                timeout=30.0
            )

            # Parse response
            content = response.choices[0].message.content

            # Try to extract JSON from response
            # Grok might return JSON directly or wrapped in text
            if content.strip().startswith('['):
                products = json.loads(content)
            elif content.strip().startswith('{'):
                data = json.loads(content)
                products = (
                    data.get('products') or
                    data.get('items') or
                    data.get('data') or
                    []
                )
            else:
                # Try to find JSON in text
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    products = json.loads(json_match.group())
                else:
                    products = []

            logger.info(f"Grok detected {len(products)} products")
            return products

        except Exception as e:
            logger.error(f"Grok analysis failed: {str(e)}")
            raise

    def _analyze_with_google(
        self,
        image_data: bytes,
        api_key: str,
        model: Optional[str] = None
    ) -> List[Dict]:
        """
        Analyze image with Google Gemini Vision.

        Args:
            image_data: Image bytes
            api_key: Google API key
            model: Model to use (default: gemini-2.0-flash-exp)

        Returns:
            List of detected products

        Raises:
            Exception: If API call fails
        """
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = model or "gemini-2.0-flash-exp"

        try:
            # Create model
            model_instance = genai.GenerativeModel(model)

            # Prepare image
            import io
            from PIL import Image
            image = Image.open(io.BytesIO(image_data))

            # Generate content
            response = model_instance.generate_content(
                [
                    self._generate_system_prompt() + "\n\nHãy phân tích hình ảnh này và trích xuất danh sách sản phẩm.",
                    image
                ],
                generation_config=genai.GenerationConfig(
                    max_output_tokens=8192,  # High limit for many products
                    response_mime_type="application/json",  # Force JSON output
                ),
                request_options={"timeout": 30.0}
            )

            # Parse response
            content = response.text.strip()

            # Try to extract JSON
            if content.startswith('['):
                products = json.loads(content)
            elif content.startswith('{'):
                data = json.loads(content)
                products = (
                    data.get('products') or
                    data.get('items') or
                    data.get('data') or
                    []
                )
            else:
                # Try to find JSON in text
                import re
                json_match = re.search(r'\[.*\]', content, re.DOTALL)
                if json_match:
                    products = json.loads(json_match.group())
                else:
                    products = []

            logger.info(f"Google Gemini detected {len(products)} products")
            return products

        except Exception as e:
            logger.error(f"Google Gemini analysis failed: {str(e)}")
            raise

    def _validate_products(self, products: List[Dict]) -> bool:
        """
        Validate detected products.

        Args:
            products: List of product dicts

        Returns:
            True if valid (at least 1 product with name and price), False otherwise
        """
        if not products or not isinstance(products, list):
            return False

        # Check if at least one product has required fields
        for product in products:
            if isinstance(product, dict):
                name = product.get('name', '').strip()
                price = product.get('price')

                if name and price is not None:
                    try:
                        float(price)
                        return True
                    except (ValueError, TypeError):
                        continue

        return False

    def analyze_price_list_image(
        self,
        image_data: bytes
    ) -> Dict[str, any]:
        """
        Analyze price list image with fallback chain.

        Tries providers in order: OpenAI -> xAI -> Google
        Falls back to next provider if:
        - No API key configured
        - API call fails
        - Invalid result (no products detected)

        Args:
            image_data: Image file bytes

        Returns:
            Dict with keys:
            - products: List[Dict] of detected products
            - provider_used: str provider name that succeeded
            - errors: List[str] errors from failed providers

        Raises:
            ValueError: If no providers available or all providers failed
        """
        # Get available providers
        available_providers = self._get_available_providers()

        if not available_providers:
            raise ValueError(
                "Không có AI provider nào khả dụng. "
                "Vui lòng cấu hình ít nhất một provider trong Cấu Hình AI."
            )

        errors = []

        # Try each provider in order
        for provider, api_key, selected_model in available_providers:
            try:
                logger.info(f"Trying provider: {provider}")

                # Call appropriate analyzer
                if provider == 'openai':
                    products = self._analyze_with_openai(image_data, api_key, selected_model)
                elif provider == 'grok':
                    products = self._analyze_with_grok(image_data, api_key, selected_model)
                elif provider == 'google':
                    products = self._analyze_with_google(image_data, api_key, selected_model)
                else:
                    logger.warning(f"Unknown provider: {provider}")
                    continue

                # Validate results
                if self._validate_products(products):
                    logger.info(f"Success with provider: {provider}")
                    return {
                        "products": products,
                        "provider_used": provider,
                        "errors": errors
                    }
                else:
                    error_msg = f"{provider}: Không tìm thấy sản phẩm hợp lệ trong ảnh"
                    logger.warning(error_msg)
                    errors.append(error_msg)

            except Exception as e:
                error_msg = f"{provider}: {str(e)}"
                logger.error(f"Provider {provider} failed: {str(e)}")
                errors.append(error_msg)
                continue

        # All providers failed
        raise ValueError(
            f"Tất cả AI providers đều thất bại:\n" + "\n".join(errors)
        )
