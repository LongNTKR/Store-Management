# 📦 Hệ Thống Quản Lý Bán Hàng (FastAPI + React)

Ứng dụng web hiện đại quản lý sản phẩm, khách hàng, hóa đơn và báo giá với trợ giúp AI (OCR, tìm kiếm hình ảnh). Kiến trúc mới tách **FastAPI backend** và **React frontend** nhưng giữ nguyên chức năng cốt lõi.

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)
![React](https://img.shields.io/badge/React-19-orange.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Tính năng chính
- **Quản lý sản phẩm**: CRUD, danh mục, đơn vị, tồn kho, lịch sử giá, nhiều ảnh.
- **Nhập báo giá thông minh**: Excel/CSV (không cần OCR), ảnh/PDF qua Google Vision; tự cập nhật giá và thêm sản phẩm mới.
- **Tìm kiếm AI**: tìm theo text; tìm theo hình ảnh (similarity score) nếu cấu hình Vision.
- **Hóa đơn**: sinh số hóa đơn, lưu lịch sử, tải **PDF** / **Excel**, trạng thái thanh toán.
- **Khách hàng**: lưu thông tin, thống kê chi tiêu và số đơn.
- **Thống kê tổng quan**: doanh thu, số hóa đơn, trạng thái thanh toán, AOV.

## 🏗️ Kiến trúc & Công nghệ
- **Backend**: FastAPI, SQLAlchemy, SQLite, Pydantic, Uvicorn, ReportLab, OpenPyXL.
- **Frontend**: React 19 + TypeScript, Vite, TailwindCSS + shadcn/ui, TanStack Query, React Router, Axios.
- **AI** (tùy chọn): Google Cloud Vision (OCR & image search), sentence-transformers cho tìm kiếm hình ảnh.
- **Dữ liệu**: lưu local tại `backend/data` (database, ảnh sản phẩm, file hóa đơn, file tạm).

## 📁 Cấu trúc thư mục
```
Store-Management/
├── backend/                 # FastAPI REST API và toàn bộ logic backend
│   ├── api/                 # Routes FastAPI (products, customers, invoices, import, search)
│   ├── schemas/             # Pydantic models
│   ├── database/            # SQLAlchemy models + session
│   ├── services/            # Product/Customer/Invoice/OCR/ImageSearch services
│   ├── data/                # SQLite DB + assets (auto tạo)
│   ├── config.py            # Đọc .env, khai báo đường dẫn
│   ├── main.py              # Entry FastAPI
│   └── requirements.txt
├── react-frontend/          # React SPA (Vite)
│   ├── src/                 # Components, pages, hooks, services
│   ├── package.json
│   └── vite.config.ts
├── .env.example             # Biến môi trường backend mẫu
├── requirements.txt         # Legacy root (không còn dùng)
├── LICENSE
└── README.md
```

## 🖥️ Yêu cầu hệ thống
- Python 3.11+ (khuyến nghị dùng venv) • pip
- Node.js 18+ và npm
- Google Cloud Vision credentials (tùy chọn cho OCR / tìm kiếm ảnh)

## ⚡ Thiết lập nhanh (Dev)
1. **Clone** repo và tạo file môi trường:
   ```bash
   git clone <repository-url>
   cd Store-Management
   cp .env.example .env   # backend đọc file này
   ```
2. **Backend (FastAPI)**  
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate          # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   # Docs: http://localhost:8000/docs
   ```
   - Database tự tạo tại `backend/data/store_management.db`.
3. **Frontend (React)**  
   ```bash
   cd react-frontend
   npm install
   # (tùy chọn) echo "VITE_API_BASE_URL=http://localhost:8000" > .env
   npm run dev  # http://localhost:5173
   ```

## 🔧 Cấu hình môi trường
- File `.env` (đọc bởi `backend/config.py`):
  ```env
  COMPANY_NAME=Cửa Hàng Gia Đình
  DATABASE_PATH=backend/data/store_management.db
  GOOGLE_CREDENTIALS_PATH=path/to/credentials.json   # để trống nếu không dùng Vision
  IMAGE_DIR=backend/data/images/products
  INVOICE_DIR=backend/data/invoices
  TEMP_DIR=backend/data/temp
  DEFAULT_TAX_RATE=0
  DEFAULT_DISCOUNT=0
  IMAGE_SEARCH_TOP_K=5
  IMAGE_SEARCH_THRESHOLD=0.3
  ```
- Frontend: đặt `VITE_API_BASE_URL` nếu backend không chạy ở `http://localhost:8000`.

## 🌐 API chính
- `GET /api/products`, `GET /api/products/search?q=...`, `POST /api/products`, `PUT/DELETE /api/products/{id}`
- `GET /api/customers`, `GET /api/customers/search`, `POST/DELETE /api/customers`, `GET /api/customers/{id}/stats`
- `GET /api/invoices` (lọc `status`), `GET /api/invoices/{id}`, `GET /api/invoices/{id}/pdf`, `GET /api/invoices/{id}/excel`, `GET /api/stats`
- `POST /api/import/quotation` (multipart file: ảnh/PDF/Excel/CSV)
- `POST /api/search/text`, `POST /api/search/image`

## 🧭 Hướng dẫn sử dụng UI
- **Trang chủ**: chỉ số nhanh (sản phẩm/khách/hóa đơn/doanh thu), 5 hóa đơn gần nhất, hành động nhanh.
- **Sản phẩm**: tìm kiếm, thêm/sửa/xóa, xem giá và danh mục.
- **Nhập báo giá**: tải file báo giá; hệ thống trả về số bản ghi cập nhật/thêm mới và lỗi (nếu có).
- **Tìm kiếm AI**: tìm text hoặc upload ảnh để tìm sản phẩm tương tự (cần Vision cho tìm ảnh).
- **Hóa đơn**: lọc theo trạng thái, tải PDF/Excel từng hóa đơn.
- **Khách hàng**: thêm khách mới, xem thông tin liên hệ, thống kê số đơn và chi tiêu.
- **Thống kê**: tổng doanh thu, số hóa đơn, tỷ lệ thanh toán, doanh thu chờ xử lý, AOV.

## 💾 Dữ liệu & Backup
- Database và file nằm trong `backend/data/`. Thư mục được tự tạo.
- Backup nhanh (Linux/macOS):
  ```bash
  cp backend/data/store_management.db backend/data/store_management_backup_$(date +%Y%m%d).db
  ```
- Nếu không cấu hình Google Vision: import Excel/CSV hoạt động bình thường; import ảnh/PDF và tìm kiếm hình ảnh sẽ tắt.

## 📝 License
MIT License – xem `LICENSE`.
