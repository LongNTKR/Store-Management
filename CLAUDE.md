# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Store Management System is a modern bilingual (Vietnamese/English) web application for retail inventory, customer, and invoice management with AI-powered features including OCR-based price list import and image-based product search. The system consists of:

1. **React Frontend** - Modern TypeScript/React SPA with Vite + TailwindCSS
2. **FastAPI Backend** - Python REST API with SQLAlchemy ORM (all backend code consolidated in `/backend/`)
3. **SQLite Database** - Local file-based storage for products, customers, invoices
4. **Google Cloud Vision Integration** - OCR and image similarity search (optional)

## Development Commands

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
pip install -r requirements.txt

# Run FastAPI server (development with hot reload)
python main.py
# OR
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# API docs available at:
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### Frontend Development

```bash
# Navigate to frontend directory
cd react-frontend

# Install dependencies
npm install

# Run development server (hot reload)
npm run dev
# Runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Full Stack Development

```bash
# Terminal 1: Backend
cd backend && python main.py

# Terminal 2: Frontend
cd react-frontend && npm run dev
```

### Database Operations

```bash
# Database is auto-created at: backend/data/store_management.db
# No migrations needed - SQLAlchemy handles schema automatically

# Backup database
cp backend/data/store_management.db backend/data/store_management_backup_$(date +%Y%m%d).db

# Reset database (deletes all data!)
rm backend/data/store_management.db
```

## Architecture Overview

### Technology Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui components
- TanStack Query (data fetching/caching)
- Zustand (state management)
- React Router (routing)
- Axios (HTTP client)

**Backend:**
- FastAPI (web framework)
- SQLAlchemy (ORM)
- Pydantic (validation/serialization)
- Uvicorn (ASGI server)

**AI/ML Services:**
- Google Cloud Vision API (OCR, image search)
- Sentence Transformers (embedding-based similarity)

### Directory Structure

```
Store-Management/
├── backend/                    # FastAPI REST API (ALL backend code consolidated here)
│   ├── api/
│   │   ├── routes/            # API endpoints
│   │   │   ├── products.py    # Product CRUD
│   │   │   ├── customers.py   # Customer CRUD
│   │   │   ├── invoices.py    # Invoice CRUD
│   │   │   ├── import_routes.py # File import (OCR)
│   │   │   └── search.py      # Text/image search
│   │   ├── dependencies.py    # FastAPI dependencies
│   │   └── __init__.py
│   ├── schemas/               # Pydantic models (request/response)
│   ├── database/              # SQLAlchemy models & DB management
│   │   ├── models.py          # SQLAlchemy models
│   │   └── db_manager.py      # Database session management
│   ├── services/              # Business logic services
│   │   ├── product_service.py # Product CRUD + import logic
│   │   ├── customer_service.py# Customer operations
│   │   ├── invoice_service.py # Invoice generation (PDF/Excel)
│   │   ├── ocr_service.py     # Google Vision OCR
│   │   └── image_search.py    # Image similarity search
│   ├── data/                  # Local data storage
│   │   ├── store_management.db# SQLite database
│   │   ├── images/products/   # Product images
│   │   ├── invoices/         # Generated PDF/Excel
│   │   └── temp/             # Temporary uploads
│   ├── config.py              # Backend configuration
│   ├── main.py                # FastAPI app entry point
│   └── requirements.txt       # Complete backend dependencies
│
├── react-frontend/            # React SPA
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── layout/       # Layout components
│   │   │   ├── products/     # Product dialogs
│   │   │   ├── customers/    # Customer dialogs
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── pages/           # Route pages
│   │   ├── services/        # API client services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── lib/            # Utilities
│   ├── package.json
│   └── vite.config.ts
│
├── CLAUDE.md                  # This file - project guidance
└── README.md                  # Project documentation
```

### Database Schema

**SQLAlchemy Models** (backend/database/models.py):

1. **Product**
   - Core: id, name, price, description, category, unit
   - Stock: stock_quantity
   - Images: image_paths (comma-separated)
   - Metadata: created_at, updated_at, is_active
   - Relationships: invoice_items, price_history

2. **Customer**
   - Core: id, name, phone, email, address
   - Metadata: notes, created_at, updated_at, is_active
   - Relationships: invoices

3. **Invoice**
   - Core: id, invoice_number, customer_id
   - Customer snapshot: customer_name, customer_phone, customer_address
   - Financial: subtotal, discount, tax, total
   - Status: status (pending/paid/cancelled), payment_method
   - Metadata: notes, created_at, updated_at
   - Relationships: customer, items

4. **InvoiceItem**
   - Core: id, invoice_id, product_id
   - Product snapshot: product_name, product_price, quantity, unit
   - Calculated: subtotal
   - Relationships: invoice, product

5. **PriceHistory**
   - Core: id, product_id, old_price, new_price
   - Metadata: changed_at, reason
   - Relationships: product

**Key Design Patterns:**
- Soft deletes via `is_active` flag
- Product/customer snapshots in invoices for historical accuracy
- Price tracking with reason logging
- Comma-separated image paths (legacy pattern)

### Service Layer Architecture

**Service Pattern:** All business logic lives in `/services` directory, shared between Streamlit UI, FastAPI backend, and future integrations.

**Key Services:**

1. **ProductService** (product_service.py)
   - CRUD operations with soft delete
   - Price change tracking (auto-records to PriceHistory)
   - Image management (add/remove with filesystem cleanup)
   - Import from files (Excel/CSV/Image/PDF)
   - Search with filters (query, category, price range)
   - Category management

2. **OCRService** (ocr_service.py)
   - Google Vision API integration
   - Text extraction from images/PDFs
   - Price list parsing with regex
   - Auto-detection of product names and prices

3. **InvoiceService** (invoice_service.py)
   - Invoice CRUD with number generation
   - PDF generation (ReportLab)
   - Excel export (OpenPyXL)
   - Revenue statistics by date range

4. **ImageSearchService** (image_search.py)
   - Feature extraction with sentence-transformers
   - Similarity search using embeddings
   - Returns ranked products by visual similarity

### API Layer (FastAPI)

**Backend Structure:** FastAPI app in `backend/` with all backend code consolidated in one directory.

**Consolidated Architecture:**
- All backend code (config, database, services) is now located in `/backend/`
- No symlinks - all files are real copies for clean architecture
- Database and data files stored in `/backend/data/`
- Complete dependencies in `/backend/requirements.txt`

**API Endpoints:**

```python
# Products
GET    /api/products              # List all products
GET    /api/products/{id}         # Get product by ID
GET    /api/products/search?q=    # Search products
POST   /api/products              # Create product
PUT    /api/products/{id}         # Update product
DELETE /api/products/{id}         # Delete (soft) product

# Customers
GET    /api/customers             # List all customers
GET    /api/customers/{id}        # Get customer by ID
POST   /api/customers             # Create customer
PUT    /api/customers/{id}        # Update customer
DELETE /api/customers/{id}        # Delete (soft) customer

# Invoices
GET    /api/invoices              # List all invoices
GET    /api/invoices/{id}         # Get invoice by ID
POST   /api/invoices              # Create invoice
PUT    /api/invoices/{id}         # Update invoice status
DELETE /api/invoices/{id}         # Delete invoice
POST   /api/invoices/{id}/pdf     # Generate PDF
POST   /api/invoices/{id}/excel   # Generate Excel

# Import
POST   /api/import/price-list     # Import from file (multipart/form-data)

# Search
POST   /api/search/text           # Text search
POST   /api/search/image          # Image similarity search
```

**CORS Configuration:**
- Allowed origins: `http://localhost:5173` (Vite), `http://localhost:3000` (alt frontend)
- All methods and headers allowed for local development

### Frontend Architecture

**React Stack:** Modern functional components with hooks, TypeScript for type safety.

**Key Patterns:**

1. **API Services** (src/services/)
   - Axios-based clients
   - Centralized error handling
   - Base URL from `VITE_API_BASE_URL` env var (defaults to http://localhost:8000)

2. **Component Structure:**
   - `components/layout/` - App shell (Layout.tsx)
   - `components/ui/` - shadcn/ui primitives (button, dialog, input, etc.)
   - `components/products/` - Product-specific dialogs (Add/Edit)
   - `components/customers/` - Customer-specific dialogs
   - `pages/` - Route-level page components

3. **State Management:**
   - TanStack Query for server state (caching, invalidation)
   - Zustand for client state (if needed)
   - React Hook Form for form state

4. **Routing:**
   - React Router for SPA navigation
   - Route structure mirrors page components

### Configuration System

**Backend Config** (backend/config.py):
- Single source of truth for backend paths and settings
- Loads from `.env` file (dotenv)
- Auto-creates required directories on import
- All backend logic consolidated in `/backend/` directory

**Key Environment Variables:**
```bash
# Company
COMPANY_NAME="Cửa Hàng Gia Đình"

# Database
DATABASE_PATH="backend/data/store_management.db"

# Google Cloud Vision (optional)
GOOGLE_CREDENTIALS_PATH="path/to/credentials.json"

# Directories
IMAGE_DIR="backend/data/images/products"
INVOICE_DIR="backend/data/invoices"
TEMP_DIR="backend/data/temp"

# Invoice defaults
DEFAULT_TAX_RATE="0"
DEFAULT_DISCOUNT="0"

# Image search
IMAGE_SEARCH_TOP_K="5"
IMAGE_SEARCH_THRESHOLD="0.3"
```

### Google Cloud Vision Integration (Optional)

**Setup:**
1. Create Google Cloud project
2. Enable Cloud Vision API
3. Create service account → download JSON credentials
4. Set `GOOGLE_CREDENTIALS_PATH` in `.env`

**Features Enabled:**
- OCR text extraction from images/PDFs
- Price list parsing (auto-detects product name + price patterns)
- Image-based product search (visual similarity)

**Fallback Behavior:**
- Excel/CSV import works without Google API (pandas-based)
- Image/PDF import requires Google API

## Important Implementation Patterns

### Product Import Flow

**Multi-format Support:** Products can be imported from Excel, CSV, images, or PDFs.

**Import Logic** (ProductService.import_from_file):
1. **File Type Detection:** By extension (.xlsx, .csv, .jpg, .pdf, etc.)
2. **Excel/CSV:** Direct pandas parsing without OCR
   - Auto-detects columns (name/product/item, price/cost/giá)
   - Handles Vietnamese column names
3. **Image/PDF:** Google Vision OCR → text extraction → regex parsing
4. **Price List Parsing:** Extracts (name, price) pairs
5. **Update Strategy:**
   - Existing products (by name match) → update price + log to PriceHistory
   - New products → create with detected info

**Usage Pattern:**
```python
from services import ProductService
from database.db_manager import DatabaseManager

db = DatabaseManager(Config.DATABASE_PATH)
session = db.get_session()
product_service = ProductService(session, Config.IMAGE_DIR)

updated, added, errors = product_service.import_from_file(
    file_path="uploads/price_list.xlsx",
    update_existing=True,
    add_new=True
)
```

### Price Change Tracking

**Automatic Logging:** Every price update creates a PriceHistory record.

**Pattern:**
```python
# In ProductService.update_product()
if price is not None and price != product.price:
    self._record_price_change(product, price, reason="Manual update")
    product.price = price
```

**View History:**
```python
history = product_service.get_price_history(product_id)
# Returns list of PriceHistory ordered by changed_at DESC
```

### Invoice Generation

**PDF Generation** (ReportLab):
- Vietnamese font support required
- Company header with logo (if available)
- Line items table with subtotals
- Tax and discount calculations
- Total in bold

**Excel Export** (OpenPyXL):
- Editable spreadsheet format
- Formulas for calculations
- Vietnamese column headers

**Snapshots:** Invoices store customer and product details at time of creation (not FK references) for historical accuracy.

### Soft Delete Pattern

**Implementation:** All main entities (Product, Customer) use `is_active` flag instead of hard deletes.

**Pattern:**
```python
def delete_product(self, product_id: int) -> bool:
    product = self.get_product(product_id)
    product.is_active = False
    self.db.commit()
    return True
```

**Rationale:**
- Preserves invoice history integrity
- Allows data recovery
- Maintains referential integrity

**Permanent Delete:** Available via `permanently_delete_product()` for admin operations.

## Common Development Tasks

### Adding a New API Endpoint

1. **Define Pydantic schema** in `backend/schemas/`
2. **Add route handler** in `backend/api/routes/`
3. **Use dependency injection** for database session:
   ```python
   @router.get("/endpoint")
   async def handler(db: Session = Depends(get_db)):
       service = SomeService(db)
       return service.do_something()
   ```
4. **Register router** in `backend/main.py`

### Adding a New React Page

1. **Create page component** in `react-frontend/src/pages/`
2. **Add route** in `App.tsx`
3. **Create API service** in `react-frontend/src/services/` if needed
4. **Add navigation link** in Layout component

### Extending Database Schema

1. **Update SQLAlchemy model** in `backend/database/models.py`
2. **Add relationship** if needed (use `back_populates`)
3. **Update service layer** with new CRUD operations in `backend/services/`
4. **Restart app** - SQLAlchemy auto-creates columns
5. **Update Pydantic schemas** in `backend/schemas/` for API validation

### Adding Image Upload

1. **Backend:** Use FastAPI's `UploadFile` type
2. **Save to temp:** `Config.TEMP_DIR` for processing
3. **Move to permanent storage:** Use service method (e.g., `add_product_image`)
4. **Store path in DB:** Relative path from IMAGE_DIR
5. **Frontend:** Use `FormData` with multipart/form-data

## Troubleshooting

### Database Issues

**Locked Database:**
- Close all active sessions/connections
- Restart backend server

**Schema Mismatch:**
- Delete `data/store_management.db` (WARNING: loses all data)
- Restart app to recreate with fresh schema

### Google Vision API Errors

**Authentication Failed:**
- Verify `GOOGLE_CREDENTIALS_PATH` points to valid JSON
- Check service account has Cloud Vision API enabled

**Quota Exceeded:**
- Check Google Cloud Console quotas
- Consider rate limiting or caching

### CORS Errors

**Frontend can't reach backend:**
- Verify backend is running on port 8000
- Check CORS origins in `backend/main.py` include frontend URL
- Ensure frontend proxy is not interfering

### Frontend Build Errors

**Module not found:**
- Run `npm install` to ensure all dependencies installed
- Check import paths use `@/` alias for src directory

**Type errors:**
- Update TypeScript types in `src/types/`
- Ensure API response matches expected schema
