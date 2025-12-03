# 📦 Hệ Thống Quản Lý Bán Hàng

Ứng dụng web hiện đại giúp quản lý bán hàng, tồn kho và khách hàng với tính năng AI thông minh. Chạy được trên Windows, Linux, macOS.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-1.32+-green.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Tính năng chính

### 🛍️ Quản lý sản phẩm
- ➕ Thêm, sửa, xóa sản phẩm
- 📸 Quản lý hình ảnh sản phẩm (nhiều ảnh cho mỗi sản phẩm)
- 💰 Theo dõi lịch sử thay đổi giá
- 🏷️ Phân loại sản phẩm theo danh mục
- 📊 Quản lý tồn kho

### 📥 Nhập báo giá thông minh (AI-Powered)
- 📷 **Đọc ảnh báo giá** - Chụp ảnh bảng giá → Tự động nhập
- 📄 **Đọc PDF** - Upload PDF báo giá → Trích xuất tự động
- 📊 **Đọc Excel/CSV** - Import trực tiếp từ bảng tính
- 🔄 **Cập nhật tự động**:
  - Sản phẩm đã có → Cập nhật giá mới
  - Sản phẩm mới → Thêm vào danh sách
- 📝 Ghi nhận lịch sử thay đổi giá

### 🔍 Tìm kiếm AI
- 📝 **Tìm theo text** - Gõ tên sản phẩm để tìm kiếm
- 🖼️ **Tìm theo hình ảnh** - Upload ảnh sản phẩm → Tìm sản phẩm tương tự
- 🎯 Độ chính xác cao với Google Vision AI
- 📊 Hiển thị độ tương đồng (similarity score)

### 🧾 Quản lý hóa đơn
- 📝 Tạo hóa đơn nhanh chóng
- 💾 Lưu trữ lịch sử đơn hàng
- 📄 **Xuất PDF** - Hóa đơn chuyên nghiệp, dễ in ấn
- 📊 **Xuất Excel** - Có thể chỉnh sửa, tính toán
- 💸 Quản lý thanh toán (đã thanh toán, chưa thanh toán, đã hủy)

### 👥 Quản lý khách hàng
- 📇 Lưu trữ thông tin khách hàng đầy đủ
- 📞 Thông tin liên hệ (SĐT, email, địa chỉ)
- 📊 Lịch sử mua hàng
- 💰 Thống kê chi tiêu của từng khách hàng

### 📊 Thống kê & Báo cáo
- 📈 Tổng sản phẩm, khách hàng, đơn hàng
- 💵 Doanh thu
- 📊 Báo cáo tổng quan kinh doanh

## 🎨 Giao diện

- ✅ Giao diện cực đẹp với **Streamlit** (Web-based)
- 🌈 Thiết kế hiện đại, responsive
- 📱 Hoạt động tốt trên Windows, Linux, macOS
- ⚡ Tự động cập nhật, không cần refresh
- 🎯 Navigation sidebar rõ ràng
- 💨 Hiệu suất cao, mượt mà

## 🛠️ Công nghệ sử dụng

- **Python 3.8+** - Ngôn ngữ lập trình
- **Streamlit** - Framework UI web (http://localhost:8501)
- **SQLAlchemy + SQLite** - Database ORM + Storage
- **Google Cloud Vision API** - OCR, Image Recognition
- **ReportLab** - Tạo PDF
- **OpenPyXL** - Xử lý Excel
- **Pillow** - Xử lý hình ảnh
- **Pandas** - Phân tích dữ liệu

## 📋 Yêu cầu hệ thống

- **OS**: Windows 10/11, Ubuntu/Debian, macOS
- **Python**: 3.8 trở lên
- **RAM**: 2GB trở lên
- **Ổ cứng**: 500MB trống

## 📁 Cấu trúc thư mục

```
Store-Management/
├── data/                          # 📁 Tất cả dữ liệu (local)
│   ├── store_management.db        # 🗄️ Database
│   ├── images/
│   │   └── products/              # 📷 Hình ảnh sản phẩm
│   ├── invoices/                  # 📄 Hóa đơn PDF/Excel
│   └── temp/                      # 🗂️ File tạm thời
│
├── database/
│   ├── models.py                  # SQLAlchemy models
│   └── db_manager.py              # Database manager
│
├── services/
│   ├── ocr_service.py             # Google Vision OCR
│   ├── image_search.py            # Image-based search
│   ├── product_service.py         # Product CRUD
│   ├── customer_service.py        # Customer management
│   └── invoice_service.py         # Invoice generation
│
├── ui/
│   └── app.py                     # Old CustomTkinter (deprecated)
│
├── utils/
│   └── helpers.py                 # Utility functions
│
├── streamlit_app.py               # Main Streamlit app ⭐
├── config.py                      # Configuration
├── main.py                        # Entry point
├── requirements.txt               # Dependencies
└── README.md                      # This file
```

## 🚀 Cài đặt & Chạy

### 🐧 UBUNTU / DEBIAN / LINUX

#### Bước 1: Clone Repository

```bash
git clone <repository-url>
cd Store-Management
```

#### Bước 2: Tạo Python Virtual Environment

```bash
# Cách 1: Dùng venv (khuyến nghị)
python3 -m venv venv
source venv/bin/activate

# Cách 2: Dùng conda
conda create -n store python=3.11
conda activate store
```

#### Bước 3: Cài đặt Dependencies

```bash
pip install -r requirements.txt
```

**Nếu gặp lỗi phụ thuộc, cài thêm:**
```bash
sudo apt-get update
sudo apt-get install python3-tk libgl1-mesa-glx
```

#### Bước 4: Cấu hình Google Cloud Vision API (Optional)

Nếu muốn dùng OCR & Image Search:

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới → Bật **Cloud Vision API**
3. Tạo **Service Account** → Tải **JSON credentials**
4. Copy file credentials vào thư mục project

#### Bước 5: Cấu hình môi trường

```bash
# Copy file mẫu
cp .env.example .env

# Chỉnh sửa (nếu cần)
nano .env
# Sửa: GOOGLE_CREDENTIALS_PATH=path/to/credentials.json
```

#### Bước 6: Chạy Ứng Dụng

**Cách 1: Chạy Streamlit trực tiếp (Khuyến nghị)**
```bash
streamlit run streamlit_app.py
```

**Cách 2: Chạy qua main.py**
```bash
python main.py
```

**Kết quả:** App mở ở `http://localhost:8501` tự động

#### Ubuntu Tips:
```bash
# Chạy nền (background)
streamlit run streamlit_app.py &

# Xem logs
streamlit run streamlit_app.py 2>&1 | tee app.log

# Thay đổi port
streamlit run streamlit_app.py --server.port 8502
```

---

### 🪟 WINDOWS 10/11

#### Bước 1: Clone Repository

```cmd
git clone <repository-url>
cd Store-Management
```

#### Bước 2: Tạo Python Virtual Environment

```cmd
REM Cách 1: Dùng venv
python -m venv venv
venv\Scripts\activate

REM Cách 2: Dùng conda
conda create -n store python=3.11
conda activate store
```

#### Bước 3: Cài đặt Dependencies

```cmd
pip install -r requirements.txt
```

#### Bước 4: Cấu hình Google Cloud Vision API (Optional)

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project → Bật **Cloud Vision API**
3. Service Account → Tải **credentials.json**
4. Lưu file vào thư mục project

#### Bước 5: Cấu hình môi trường

```cmd
REM Copy file cấu hình
copy .env.example .env

REM Chỉnh sửa (nếu cần) - dùng Notepad hoặc VS Code
notepad .env
```

Trong file `.env`:
```env
COMPANY_NAME=Cửa Hàng Của Bạn
GOOGLE_CREDENTIALS_PATH=path\to\credentials.json
```

#### Bước 6: Chạy Ứng Dụng

**Cách 1: Chạy Streamlit trực tiếp (Khuyến nghị)**
```cmd
streamlit run streamlit_app.py
```

**Cách 2: Chạy qua main.py**
```cmd
python main.py
```

**Kết quả:** Browser mở tự động ở `http://localhost:8501`

#### Windows Tips:
```cmd
REM Chạy với port khác
streamlit run streamlit_app.py --server.port 8502

REM Tắt cache nếu có lỗi
streamlit run streamlit_app.py --logger.level=debug

REM Tạo Shortcut trên Desktop
REM Chuột phải → New → Shortcut
REM Target: C:\path\to\python -m streamlit run C:\path\to\streamlit_app.py
```

---

## 📖 Hướng dẫn sử dụng

### 🌓 Đổi giao diện (Light/Dark Mode)

1. Nhấp icon **☰** (menu) ở **góc trên phải**
2. Chọn **Settings**
3. Chọn **Theme** → **Light** hoặc **Dark**

App sẽ tự động cập nhật!

---

### Trang Chủ
- Xem thống kê nhanh (sản phẩm, khách hàng, hóa đơn, doanh thu)
- Xem hóa đơn gần đây
- Các nút hành động nhanh

### Quản Lý Sản Phẩm
1. Click **Sản phẩm** ở sidebar
2. Tìm kiếm sản phẩm hoặc xem danh sách
3. Thêm mới bằng nút **➕ Thêm mới**
4. Chỉnh sửa/xóa từng sản phẩm

### Nhập Báo Giá
1. Click **Nhập báo giá**
2. Chọn file (ảnh/PDF/Excel/CSV)
3. Click **Bắt đầu nhập**
4. Hệ thống tự động:
   - Đọc và phân tích file
   - Cập nhật sản phẩm cũ
   - Thêm sản phẩm mới

### Tìm Kiếm AI
- **Text Search**: Gõ tên sản phẩm
- **Image Search**: Upload ảnh sản phẩm (cần Google API)

### Quản Lý Hóa Đơn
1. Click **Hóa đơn**
2. Lọc theo trạng thái
3. Xuất PDF, Excel, hoặc in

### Quản Lý Khách Hàng
1. Click **Khách hàng**
2. Tìm kiếm hoặc xem danh sách
3. Thêm khách hàng mới
4. Xem lịch sử mua hàng

### Thống Kê
1. Click **Thống kê**
2. Xem tổng quan (sản phẩm, khách, hóa đơn, doanh thu)
3. Biểu đồ thanh toán
4. Click **Cập nhật thống kê** để làm mới

---

## 🔧 Troubleshooting

### Lỗi Chung (Windows & Linux)

#### "ModuleNotFoundError: No module named..."
```bash
# Cài lại dependencies
pip install -r requirements.txt --upgrade
```

#### Port 8501 đang được sử dụng
```bash
# Dùng port khác
streamlit run streamlit_app.py --server.port 8502
```

#### Database không được tạo
Database sẽ tự động tạo lần đầu chạy app ở:
- **Windows**: `Store-Management\data\store_management.db`
- **Linux**: `~/Store-Management/data/store_management.db`

---

### 🐧 UBUNTU / LINUX Troubleshooting

#### "command not found: python3"
```bash
sudo apt-get install python3 python3-pip
```

#### "No module named 'tkinter'"
```bash
sudo apt-get install python3-tk
```

#### "libGL.so.1: cannot open shared object"
```bash
sudo apt-get install libgl1-mesa-glx
```

#### Tiếng Việt bị hỏng trên terminal
- Ứng dụng chạy trên web browser nên không ảnh hưởng
- Nếu cần, đảm bảo locale UTF-8: `locale -a | grep utf`

#### Streamlit không mở browser tự động
- Truy cập thủ công: `http://localhost:8501`

---

### 🪟 WINDOWS Troubleshooting

#### "python is not recognized"
- Thêm Python vào PATH:
  1. Settings → System → About → Advanced system settings
  2. Environment Variables → Path → Edit → Thêm Python folder
  3. Khởi động lại Command Prompt

#### "pip is not recognized"
```cmd
python -m pip install -r requirements.txt
```

#### Tiếng Việt bị hỏng
- Streamlit chạy trên web nên không ảnh hưởng
- Nếu cần, kiểm tra: Settings → Time & Language → Language

#### Permission Denied khi cài đặt
```cmd
REM Chạy Command Prompt as Administrator
pip install -r requirements.txt
```

#### Browser không mở tự động
- Mở thủ công: `http://localhost:8501`

---

## 🔐 Bảo mật

- ✅ Database lưu local (SQLite)
- ✅ Không lưu dữ liệu trên cloud
- ✅ Credentials trong file .env (git ignored)
- ⚠️ **Khuyến nghị**: Backup folder `data/` định kỳ

## 📦 Backup & Restore

### Backup toàn bộ dữ liệu:
```bash
# Linux/macOS
cp -r data/ data_backup_$(date +%Y%m%d)

# Windows
xcopy data\ data_backup_%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%\ /E
```

### Restore từ backup:
```bash
# Linux/macOS
cp -r data_backup_20240103/* data/

# Windows
xcopy data_backup_20240103\* data\ /E
```

---

## 🔄 Update & Upgrade

### Cập nhật code
```bash
git pull origin main
```

### Cập nhật dependencies
```bash
pip install -r requirements.txt --upgrade
```

### Database sẽ tự động migrate (nếu cần)

---

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón!

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

---

## 📝 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## ⭐ Hỗ trợ

Nếu ứng dụng hữu ích, hãy cho một ⭐ nhé!

---

**Made with ❤️ for small businesses in Vietnam**

**Cập nhật lần cuối**: 2025
