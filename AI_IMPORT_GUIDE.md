# Hướng Dẫn Sử Dụng Tính Năng AI Nhập Báo Giá

## Tổng Quan

Tính năng AI nhập báo giá cho phép bạn chụp ảnh danh sách sản phẩm và hệ thống sẽ tự động phân tích, nhận diện sản phẩm, sau đó cho phép bạn xem trước và chỉnh sửa trước khi nhập vào database.

### Các Tính Năng Chính

✅ **Multimodal AI Analysis**: Sử dụng GPT-4V, Grok Vision, hoặc Gemini Vision để đọc ảnh
✅ **Fallback Chain**: OpenAI → xAI → Google (tự động chuyển provider nếu thất bại)
✅ **Network Check**: Kiểm tra kết nối internet trước khi sử dụng
✅ **Preview Dialog**: Xem trước tất cả sản phẩm được phát hiện
✅ **Fuzzy Matching**: Tìm sản phẩm tương tự với độ chính xác 80%
✅ **Editable Preview**: Chỉnh sửa thông tin trước khi nhập
✅ **Smart Actions**: Create new / Update existing / Skip

---

## Bước 1: Chuẩn Bị

### 1.1. Cài Đặt Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Các dependencies mới đã được thêm:
- `openai>=1.0.0` - OpenAI GPT-4V
- `google-generativeai>=0.8.0` - Google Gemini Vision
- `rapidfuzz` - Fuzzy string matching (đã có sẵn)

### 1.2. Khởi Động Backend

```bash
cd backend
python main.py
```

Backend sẽ chạy tại: http://localhost:8000
API Docs: http://localhost:8000/docs

### 1.3. Khởi Động Frontend

```bash
cd react-frontend
npm run dev
```

Frontend sẽ chạy tại: http://localhost:5173

---

## Bước 2: Cấu Hình AI Providers

### 2.1. Truy Cập Trang AI

Vào trang **AI** trong ứng dụng

### 2.2. Thiết Lập Master Password (Lần Đầu)

1. Click "Thiết lập mật khẩu chủ"
2. Nhập mật khẩu (tối thiểu 8 ký tự)
3. Xác nhận mật khẩu
4. Lưu

**Lưu ý**: Mật khẩu này dùng để mã hóa/giải mã API keys. Không được quên!

### 2.3. Cấu Hình Provider (Ít Nhất 1 Provider)

#### Option 1: OpenAI (Khuyến nghị)
1. Vào tab "Cấu Hình AI"
2. Tìm **OpenAI**
3. Click "Cấu hình"
4. Nhập API Key từ https://platform.openai.com/api-keys
5. Chọn model: `gpt-4o` (multimodal)
6. Bật "Kích hoạt"
7. Lưu

#### Option 2: xAI (Grok)
1. Tìm **Grok (xAI)**
2. Click "Cấu hình"
3. Nhập API Key từ https://x.ai/
4. Chọn model: `grok-2-vision-1212`
5. Bật "Kích hoạt"
6. Lưu

#### Option 3: Google Gemini
1. Tìm **Google AI**
2. Click "Cấu hình"
3. Nhập API Key từ https://makersuite.google.com/app/apikey
4. Chọn model: `gemini-2.0-flash-exp`
5. Bật "Kích hoạt"
6. Lưu

**Thứ tự ưu tiên fallback**: OpenAI → xAI → Google

---

## Bước 3: Sử Dụng AI Import

### 3.1. Kiểm Tra Kết Nối

1. Vào tab **"Nhập Báo Giá"**
2. Card "Kiểm Tra Kết Nối" → Click **"Kiểm tra kết nối"**
3. Đảm bảo có icon xanh "Đã kết nối internet"

### 3.2. Kiểm Tra Provider Status

Card "Trạng Thái AI Providers" sẽ hiển thị:
- ✓ Sẵn sàng (màu xanh) - Provider có API key và enabled
- ✗ Chưa cấu hình (màu xám) - Provider chưa được cấu hình

**Yêu cầu**: Ít nhất 1 provider phải "Sẵn sàng"

### 3.3. Upload và Phân Tích Ảnh

1. Card "Nhập Báo Giá với AI"
2. Click **"Chọn File"** → chọn ảnh danh sách sản phẩm (.jpg, .png, .webp)
3. Click **"Phân tích ảnh"**
4. Nhập **Master Password** khi được yêu cầu
5. Chờ AI phân tích (10-30 giây)

**Lưu ý về ảnh**:
- Ảnh rõ nét, đủ sáng
- Chứa danh sách sản phẩm với tên và giá
- Có thể là ảnh chụp màn hình, bảng giá, hoặc bảng báo giá

### 3.4. Xem Trước và Chỉnh Sửa

Dialog "Xem Trước Danh Sách Nhập" sẽ hiển thị:

#### Summary Cards
- **Tổng cộng**: Số sản phẩm phát hiện được
- **Sản phẩm mới**: Sản phẩm chưa tồn tại trong DB
- **Cập nhật**: Sản phẩm đã tồn tại (trùng tên 100%)
- **Tương tự**: Sản phẩm có tên tương tự (độ chính xác ≥ 80%)

#### Preview Table

| Tên sản phẩm | Giá bán | Giá nhập | Trạng thái | Hành động |
|--------------|---------|----------|------------|-----------|
| Tên phát hiện | Giá | Giá nhập (optional) | Badge màu | Dropdown |

**Trạng thái**:
- 🟢 **Mới**: Sản phẩm hoàn toàn mới
- 🔵 **Cập nhật**: Trùng khớp chính xác (exact match)
- 🟠 **Tương tự**: Có sản phẩm tương tự (fuzzy match)

**Hành động**:
- **Tạo mới**: Tạo sản phẩm mới trong database
- **Cập nhật**: Cập nhật sản phẩm hiện có
- **Bỏ qua**: Không import sản phẩm này

#### Chỉnh Sửa Từng Item

1. Click **"Chỉnh sửa"** trên row cần sửa
2. Thay đổi:
   - Tên sản phẩm
   - Giá bán
   - Giá nhập
3. Click **"Xong"**

#### Xử Lý Sản Phẩm Tương Tự (Similar Match)

Nếu AI phát hiện sản phẩm tương tự:
1. Chọn action = **"Cập nhật"**
2. Dropdown thứ 2 sẽ hiện ra với danh sách gợi ý
3. Chọn sản phẩm muốn cập nhật (hiển thị % tương đồng)
4. Hoặc giữ **"Tạo mới"** nếu muốn tạo sản phẩm riêng

#### Bulk Actions

- **Chấp nhận tất cả**: Đặt tất cả về action mặc định (new → Create, exact → Update)
- **Bỏ qua tất cả**: Đặt tất cả về Skip

### 3.5. Xác Nhận và Import

1. Kiểm tra lại tất cả thông tin
2. Click **"Xác nhận nhập (X sản phẩm)"**
3. Chờ import hoàn tất (1-5 giây)
4. Xem kết quả:
   - ✅ Cập nhật: Số sản phẩm đã cập nhật
   - ➕ Thêm mới: Số sản phẩm mới thêm
   - ⏭️ Bỏ qua: Số sản phẩm đã bỏ qua
   - ⚠️ Lỗi: Số lỗi xảy ra

---

## Kiến Trúc Hệ Thống

### Backend Components

1. **AIProviderService** (`backend/services/ai_provider_service.py`)
   - Multimodal analysis với GPT-4V, Grok Vision, Gemini Vision
   - Fallback chain: OpenAI → xAI → Google
   - JSON response parsing & validation

2. **Network Checker** (`backend/utils/network.py`)
   - Kiểm tra kết nối internet
   - Ping Google DNS (8.8.8.8) và Cloudflare DNS (1.1.1.1)

3. **Fuzzy Matcher** (`backend/utils/fuzzy_matcher.py`)
   - Tìm sản phẩm tương tự với rapidfuzz
   - Threshold: 80%
   - Normalize Vietnamese text

4. **API Endpoints** (`backend/api/routes/import_routes.py`)
   - `GET /api/import/check-connection` - Network check
   - `POST /api/import/preview-ai` - AI analysis & preview
   - `POST /api/import/confirm` - Confirm & import

5. **Pydantic Schemas** (`backend/schemas/import_schemas.py`)
   - PreviewItem, PreviewResponse
   - ConfirmImportRequest, ImportResult
   - Type-safe request/response validation

### Frontend Components

1. **PriceListPreviewDialog** (`react-frontend/src/components/products/PriceListPreviewDialog.tsx`)
   - Preview table với editable rows
   - Match status badges
   - Suggested matches dropdown
   - Bulk actions

2. **AIPage** (`react-frontend/src/pages/AIPage.tsx`)
   - Network status check
   - Provider status display
   - AI import flow orchestration
   - Master password verification

3. **Import Service** (`react-frontend/src/services/import.ts`)
   - API client cho AI import endpoints
   - Type-safe với TypeScript

4. **Types** (`react-frontend/src/types/import.ts`)
   - TypeScript interfaces matching backend schemas

### Fallback Logic

```
User uploads image
    ↓
Try OpenAI GPT-4V
    ↓ (if no API key OR API fails OR invalid result)
Try xAI Grok Vision
    ↓ (if no API key OR API fails OR invalid result)
Try Google Gemini Vision
    ↓ (if all fail)
Error: "Tất cả AI providers đều thất bại"
```

---

## Testing Scenarios

### Test Case 1: Basic Import (Happy Path)

1. Cấu hình OpenAI provider
2. Upload ảnh có 3 sản phẩm mới
3. Verify preview hiển thị 3 items với status "Mới"
4. Click "Xác nhận nhập"
5. Verify: added=3, updated=0, skipped=0, errors=0

### Test Case 2: Update Existing Products

1. Tạo sẵn 2 sản phẩm: "Bàn gỗ" (100k), "Ghế gỗ" (50k)
2. Upload ảnh có "Bàn gỗ" (120k), "Ghế gỗ" (60k)
3. Verify preview hiển thị 2 items với status "Cập nhật"
4. Verify giá cũ hiển thị ở dưới
5. Click "Xác nhận nhập"
6. Verify: updated=2, added=0

### Test Case 3: Fuzzy Matching

1. Tạo sản phẩm "Bàn gỗ sồi"
2. Upload ảnh có "Ban go soi" (không dấu)
3. Verify preview hiển thị status "Tương tự"
4. Verify suggested matches hiển thị "Bàn gỗ sồi" (score ~85%)
5. Chọn action "Cập nhật" → chọn "Bàn gỗ sồi"
6. Click "Xác nhận nhập"
7. Verify sản phẩm "Bàn gỗ sồi" được cập nhật

### Test Case 4: Fallback Chain

1. Cấu hình cả 3 providers: OpenAI (disabled), xAI (enabled), Google (enabled)
2. Upload ảnh
3. Verify: Provider used = "grok" (vì OpenAI disabled)
4. Disable xAI, chỉ giữ Google
5. Upload ảnh khác
6. Verify: Provider used = "google"

### Test Case 5: Edit Before Confirm

1. Upload ảnh
2. Trong preview, click "Chỉnh sửa" trên item đầu tiên
3. Thay đổi tên từ "Ban go" → "Bàn gỗ"
4. Thay đổi giá từ 100000 → 120000
5. Click "Xong"
6. Click "Xác nhận nhập"
7. Verify sản phẩm được tạo với tên và giá đã chỉnh sửa

### Test Case 6: Bulk Skip

1. Upload ảnh có 5 sản phẩm
2. Click "Bỏ qua tất cả"
3. Verify tất cả items có action = "skip"
4. Verify button "Xác nhận nhập" hiển thị (0 sản phẩm)
5. Click "Chấp nhận tất cả"
6. Verify button hiển thị (5 sản phẩm)

### Test Case 7: Network Check

1. Disconnect internet
2. Click "Kiểm tra kết nối"
3. Verify: icon đỏ + message "Mất kết nối internet"
4. Reconnect internet
5. Click "Kiểm tra kết nối"
6. Verify: icon xanh + message "Đã kết nối internet"

### Test Case 8: No Providers Configured

1. Xóa/disable tất cả providers
2. Upload ảnh
3. Click "Phân tích ảnh"
4. Verify error: "Vui lòng cấu hình ít nhất một AI provider"

---

## Troubleshooting

### Issue 1: "Mật khẩu chính không đúng"

**Giải pháp**: Nhập đúng master password đã thiết lập. Nếu quên, cần reset database (xóa bảng MasterPassword).

### Issue 2: "Không có AI provider nào khả dụng"

**Nguyên nhân**: Chưa cấu hình provider hoặc tất cả providers đều disabled.
**Giải pháp**: Vào tab "Cấu Hình AI" → cấu hình ít nhất 1 provider → bật "Kích hoạt".

### Issue 3: "Tất cả AI providers đều thất bại"

**Nguyên nhân**:
- API keys không hợp lệ
- Hết quota/credit
- Network issue

**Giải pháp**:
1. Kiểm tra API keys còn hợp lệ
2. Kiểm tra quota/billing
3. Kiểm tra kết nối internet
4. Xem chi tiết lỗi trong errors list

### Issue 4: "Không tìm thấy sản phẩm nào"

**Nguyên nhân**:
- Ảnh không rõ
- Ảnh không chứa danh sách sản phẩm
- AI không nhận diện được format

**Giải pháp**:
1. Chụp ảnh rõ hơn
2. Đảm bảo ảnh có tên và giá sản phẩm
3. Thử provider khác (fallback)
4. Thử chụp từng phần nhỏ hơn

### Issue 5: Import errors

**Xem chi tiết lỗi** trong card "Một số lỗi xảy ra" sau khi import.
Thường gặp:
- Thiếu thông tin bắt buộc (tên, giá)
- Giá không hợp lệ (âm, không phải số)
- Product ID không tồn tại (khi update)

---

## API Documentation

### GET /api/import/check-connection

**Response**:
```json
{
  "connected": true,
  "message": "Kết nối internet thành công (via Google DNS)"
}
```

### POST /api/import/preview-ai

**Request** (multipart/form-data):
- `file`: Image file
- `master_password`: Master password string

**Response**:
```json
{
  "items": [
    {
      "detected_name": "Bàn gỗ",
      "detected_price": 100000,
      "detected_import_price": 80000,
      "match_status": "new",
      "suggested_action": "create",
      "suggested_matches": []
    }
  ],
  "summary": {
    "total": 1,
    "new_count": 1,
    "update_count": 0,
    "similar_count": 0
  },
  "provider_used": "openai",
  "errors": []
}
```

### POST /api/import/confirm

**Request** (JSON):
```json
{
  "items": [
    {
      "action": "create",
      "name": "Bàn gỗ",
      "price": 100000,
      "import_price": 80000
    }
  ],
  "master_password": "your_master_password"
}
```

**Response**:
```json
{
  "updated": 0,
  "added": 1,
  "skipped": 0,
  "errors": []
}
```

---

## Files Created/Modified

### Backend
- ✅ `backend/utils/network.py` - Network connectivity check
- ✅ `backend/utils/fuzzy_matcher.py` - Fuzzy string matching
- ✅ `backend/services/ai_provider_service.py` - AI provider service với fallback
- ✅ `backend/schemas/import_schemas.py` - Pydantic schemas
- ✅ `backend/api/routes/import_routes.py` - 3 new endpoints
- ✅ `backend/requirements.txt` - Added openai, google-generativeai

### Frontend
- ✅ `react-frontend/src/types/import.ts` - TypeScript types
- ✅ `react-frontend/src/services/import.ts` - API service client
- ✅ `react-frontend/src/components/ui/badge.tsx` - Badge component
- ✅ `react-frontend/src/components/products/PriceListPreviewDialog.tsx` - Preview dialog
- ✅ `react-frontend/src/pages/AIPage.tsx` - Updated import tab

---

## Next Steps

Để mở rộng tính năng:

1. **Support PDF/Excel**: Thêm xử lý file PDF và Excel vào AI import flow
2. **Auto-categorization**: AI tự động phân loại sản phẩm vào category
3. **Multi-language**: Support tiếng Anh, tiếng Trung
4. **Batch import**: Import nhiều ảnh cùng lúc
5. **Import history**: Lưu lịch sử import để rollback
6. **AI suggestions**: AI gợi ý sửa lỗi chính tả, normalize names

---

## Support

Nếu gặp vấn đề, vui lòng cung cấp:
1. Screenshot lỗi
2. Browser console logs (F12)
3. Backend logs
4. Sample image (nếu có thể)

Chúc sử dụng thành công! 🎉
