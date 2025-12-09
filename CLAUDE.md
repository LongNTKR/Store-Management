# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Store Management System is a bilingual (Vietnamese/English) web application for retail inventory, customer, invoice, and payment management with AI-powered features including OCR-based price list import and image-based product search. The system consists of:

1. **React Frontend** - Modern TypeScript/React SPA with Vite + TailwindCSS
2. **FastAPI Backend** - Python REST API with SQLAlchemy ORM (all backend code in `/backend/`)
3. **SQLite Database** - Local file-based storage
4. **AI Integration** - Google Cloud Vision (OCR), OpenAI/Gemini (price list analysis), sentence-transformers (image similarity)

## Development Commands

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Install dependencies
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
- APScheduler (background jobs)

**AI/ML Services:**
- Google Cloud Vision API (OCR, image search)
- OpenAI GPT-4V / Google Gemini (price list analysis)
- Sentence Transformers (embedding-based similarity)

### Directory Structure

```
Store-Management/
├── backend/                    # FastAPI REST API (ALL backend code)
│   ├── api/
│   │   ├── routes/            # API endpoints
│   │   │   ├── products.py    # Product CRUD
│   │   │   ├── customers.py   # Customer CRUD
│   │   │   ├── invoices.py    # Invoice CRUD
│   │   │   ├── payments.py    # Payment tracking
│   │   │   ├── debt_reports.py# Debt reports
│   │   │   ├── invoice_returns.py # Return management
│   │   │   ├── import_routes.py # File import (OCR)
│   │   │   ├── search.py      # Text/image search
│   │   │   ├── dashboard.py   # Dashboard stats
│   │   │   ├── ai_config.py   # AI provider config
│   │   │   └── units.py       # Unit management
│   │   ├── dependencies.py    # FastAPI dependencies
│   │   └── __init__.py
│   ├── schemas/               # Pydantic models (request/response)
│   ├── database/              # SQLAlchemy models & DB management
│   │   ├── models.py          # All database models
│   │   └── db_manager.py      # Database session management
│   ├── services/              # Business logic services
│   │   ├── product_service.py # Product CRUD + import
│   │   ├── customer_service.py# Customer operations
│   │   ├── invoice_service.py # Invoice generation (PDF/Excel)
│   │   ├── payment_service.py # Payment tracking
│   │   ├── invoice_return_service.py # Returns
│   │   ├── debt_report_service.py # Debt reporting
│   │   ├── ocr_service.py     # Google Vision OCR
│   │   ├── image_search.py    # Image similarity search
│   │   ├── ai_config_service.py # AI provider management
│   │   └── unit_service.py    # Unit management
│   ├── utils/                 # Utility modules
│   │   ├── encryption.py      # API key encryption
│   │   ├── password.py        # Password hashing
│   │   ├── fuzzy_matcher.py   # Vietnamese fuzzy search
│   │   ├── text_utils.py      # Text normalization
│   │   └── network.py         # Network utilities
│   ├── data/                  # Local data storage (auto-created)
│   │   ├── store_management.db# SQLite database
│   │   ├── images/products/   # Product images
│   │   ├── invoices/         # Generated PDF/Excel
│   │   └── temp/             # Temporary uploads
│   ├── config.py              # Backend configuration
│   ├── jobs.py                # Background jobs (APScheduler)
│   ├── main.py                # FastAPI app entry point
│   └── requirements.txt       # Backend dependencies
│
├── react-frontend/            # React SPA
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── layout/       # Layout components
│   │   │   ├── products/     # Product dialogs
│   │   │   ├── customers/    # Customer dialogs
│   │   │   ├── units/        # Unit management
│   │   │   ├── shared/       # Shared components
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── pages/           # Route pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── CustomersPage.tsx
│   │   │   ├── InvoicesPage.tsx
│   │   │   ├── StatsPage.tsx
│   │   │   ├── TrashPage.tsx
│   │   │   └── AIPage.tsx
│   │   ├── services/        # API client services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── types/           # TypeScript types
│   │   └── lib/            # Utilities
│   ├── package.json
│   └── vite.config.ts
│
└── .env                      # Environment configuration
```

### Database Schema

**Key Models** (backend/database/models.py):

1. **Product**
   - Core: id, name, normalized_name, price, import_price, description, category
   - Unit: unit_id (FK to Unit table), unit (deprecated string field)
   - Stock: stock_quantity (Float for decimal support)
   - Images: image_paths (comma-separated)
   - Metadata: created_at, updated_at, is_active, deleted_at
   - Update tracking: price_updated_at, import_price_updated_at, info_updated_at
   - Relationships: unit_ref, invoice_items, price_history

2. **Customer**
   - Core: id, name, normalized_name, phone, normalized_phone, email, normalized_email, address, notes
   - Metadata: created_at, updated_at, is_active, deleted_at
   - Relationships: invoices, payments
   - Method: get_total_debt(db_session) - calculates outstanding debt

3. **Invoice**
   - Core: id, invoice_number, customer_id
   - Customer snapshot: customer_name, normalized_customer_name, customer_phone, normalized_customer_phone, customer_address
   - Financial: subtotal, discount, tax, total
   - Payment tracking: paid_amount, refunded_amount, remaining_amount
   - Status: status (pending/paid/cancelled), payment_method
   - Metadata: notes, created_at, updated_at, exported_at
   - Relationships: customer, items, payment_allocations, returns
   - Properties: payment_status, is_fully_paid, is_partially_paid, total_returned_amount, net_amount, net_payment_amount

4. **InvoiceItem**
   - Core: id, invoice_id, product_id
   - Product snapshot: product_name, product_price, quantity (Float), unit
   - Calculated: subtotal
   - Relationships: invoice, product

5. **Payment**
   - Core: id, payment_number (PAY-YYYYMMDD-XXXX), customer_id
   - Financial: amount, payment_method
   - Metadata: payment_date, notes, created_at, updated_at, created_by
   - Relationships: customer, allocations

6. **PaymentAllocation**
   - Core: id, payment_id, invoice_id
   - Details: amount, allocation_date, notes
   - Relationships: payment, invoice

7. **InvoiceReturn**
   - Core: id, return_number (RET-YYYYMMDD-XXXX), invoice_id, refund_payment_id
   - Details: reason, refund_amount, is_full_return
   - Status: status (pending_refund/refunded)
   - Metadata: created_at, created_by, notes, exported_at
   - Relationships: invoice, return_items, refund_payment

8. **InvoiceReturnItem**
   - Core: id, invoice_return_id, invoice_item_id, product_id
   - Snapshot: product_name, product_price, unit
   - Details: quantity_returned, subtotal, restore_inventory
   - Relationships: invoice_return, invoice_item, product

9. **Unit**
   - Core: id, name, display_name
   - Rules: allows_decimal, step_size
   - Flags: is_active, is_system (system units cannot be deleted)
   - Metadata: created_at, updated_at
   - Relationships: products

10. **PriceHistory**
    - Core: id, product_id, old_price, new_price
    - Metadata: changed_at, reason
    - Relationships: product

11. **AIConfiguration**
    - Core: id, provider, display_name, api_key_encrypted, selected_model
    - Flags: is_enabled
    - Metadata: created_at, updated_at

12. **MasterPassword**
    - Core: id, password_hash (bcrypt)
    - Metadata: created_at, updated_at

**Key Design Patterns:**
- Soft deletes via `is_active` and `deleted_at` fields
- Product/customer snapshots in invoices for historical accuracy
- Normalized fields (normalized_name, normalized_phone) for Vietnamese fuzzy search
- Price tracking with reason logging
- Comma-separated image paths (legacy pattern)
- All timestamps use Vietnam timezone (UTC+7)
- Payment allocation system for tracking partial payments across multiple invoices
- Invoice return system with refund tracking and inventory restoration

### Service Layer Architecture

**Service Pattern:** All business logic lives in `backend/services/` directory, shared across the application.

**Key Services:**

1. **ProductService** (product_service.py)
   - CRUD operations with soft delete
   - Price change tracking (auto-records to PriceHistory)
   - Image management (add/remove with filesystem cleanup)
   - Import from files (Excel/CSV/Image/PDF with OCR)
   - Search with filters (query, category, price range)
   - Trash management (soft delete, restore, permanent delete)
   - Auto-cleanup of old deletions (30+ days)

2. **CustomerService** (customer_service.py)
   - CRUD operations with soft delete
   - Debt calculation and statistics
   - Trash management
   - Vietnamese fuzzy search

3. **InvoiceService** (invoice_service.py)
   - Invoice CRUD with auto-generated invoice numbers
   - PDF generation (ReportLab)
   - Excel export (OpenPyXL)
   - Revenue statistics by date range
   - Status tracking (pending/paid/cancelled)
   - Export tracking (exported_at timestamp)
   - Auto-cleanup of stale processing invoices

4. **PaymentService** (payment_service.py)
   - Payment recording with auto-generated payment numbers
   - Payment allocation across multiple invoices
   - Payment history tracking
   - Debt reduction calculation

5. **InvoiceReturnService** (invoice_return_service.py)
   - Return creation with auto-generated return numbers
   - Partial and full return support
   - Inventory restoration
   - Refund tracking via Payment system
   - Return PDF generation

6. **DebtReportService** (debt_report_service.py)
   - Customer debt aggregation
   - Overdue invoice tracking
   - Debt aging reports

7. **OCRService** (ocr_service.py)
   - Google Vision API integration
   - Text extraction from images/PDFs
   - Price list parsing with regex
   - AI-powered price extraction (OpenAI/Gemini)
   - Auto-detection of product names and prices

8. **ImageSearchService** (image_search.py)
   - Feature extraction with sentence-transformers
   - Similarity search using embeddings
   - Returns ranked products by visual similarity

9. **AIConfigService** (ai_config_service.py)
   - AI provider management (OpenAI, Gemini, Grok, Claude, DeepSeek, Qwen)
   - Encrypted API key storage
   - Master password protection
   - Model selection and configuration

10. **UnitService** (unit_service.py)
    - Unit CRUD operations
    - System unit protection
    - Decimal/integer unit handling

### API Layer (FastAPI)

**Backend Structure:** FastAPI app in `backend/` with all backend code in one directory.

**Key API Endpoints:**

```python
# Dashboard
GET    /api/stats                    # Dashboard statistics

# Products
GET    /api/products                 # List products with pagination
GET    /api/products/{id}            # Get product by ID
GET    /api/products/search?q=       # Search products
POST   /api/products                 # Create product
PUT    /api/products/{id}            # Update product
DELETE /api/products/{id}            # Soft delete product
GET    /api/trash/products           # Get trashed products
POST   /api/products/{id}/restore    # Restore from trash
DELETE /api/products/{id}/permanent  # Permanent delete

# Customers
GET    /api/customers                # List customers
GET    /api/customers/{id}           # Get customer by ID
GET    /api/customers/{id}/stats     # Get customer statistics
POST   /api/customers                # Create customer
PUT    /api/customers/{id}           # Update customer
DELETE /api/customers/{id}           # Soft delete customer
GET    /api/trash/customers          # Get trashed customers

# Invoices
GET    /api/invoices                 # List invoices (filter by status)
GET    /api/invoices/{id}            # Get invoice by ID
POST   /api/invoices                 # Create invoice
PUT    /api/invoices/{id}            # Update invoice
DELETE /api/invoices/{id}            # Delete invoice
GET    /api/invoices/{id}/pdf        # Generate PDF
GET    /api/invoices/{id}/excel      # Generate Excel
POST   /api/invoices/{id}/cancel     # Cancel invoice

# Payments
GET    /api/payments                 # List payments
GET    /api/payments/{id}            # Get payment details
POST   /api/payments                 # Record payment
DELETE /api/payments/{id}            # Delete payment

# Debt Reports
GET    /api/debt-reports             # Get debt summary
GET    /api/debt-reports/customers   # Customer debt list

# Invoice Returns
GET    /api/invoice-returns          # List returns
GET    /api/invoice-returns/{id}     # Get return details
POST   /api/invoice-returns          # Create return
PUT    /api/invoice-returns/{id}     # Update return status
GET    /api/invoice-returns/{id}/pdf # Generate return PDF

# Import
POST   /api/import/quotation         # Import price list (multipart/form-data)

# Search
POST   /api/search/text              # Text search
POST   /api/search/image             # Image similarity search

# AI Configuration
GET    /api/ai/config                # Get AI configurations
POST   /api/ai/config                # Save AI configuration
POST   /api/ai/master-password       # Set master password
POST   /api/ai/verify-password       # Verify master password
GET    /api/ai/models                # Get available models

# Units
GET    /api/units                    # List units
POST   /api/units                    # Create unit
PUT    /api/units/{id}               # Update unit
DELETE /api/units/{id}               # Delete unit (if not system)
```

**CORS Configuration:**
- Allowed origins: `*` (all origins for development)
- All methods and headers allowed

**Background Jobs:**
- Product auto-cleanup: Runs daily at 2 AM, permanently deletes products in trash for 30+ days
- Invoice cleanup: Runs hourly, deletes stale processing invoices (24+ hours old)

### Frontend Architecture

**React Stack:** Modern functional components with hooks, TypeScript for type safety.

**Key Patterns:**

1. **API Services** (src/services/)
   - Axios-based clients
   - Centralized error handling
   - Base URL from `VITE_API_BASE_URL` env var (defaults to http://localhost:8000)
   - Services: api.ts, products.ts, customers.ts, import.ts, search.ts, aiConfig.ts, units.ts

2. **Component Structure:**
   - `components/layout/` - App shell (Layout.tsx)
   - `components/ui/` - shadcn/ui primitives (button, dialog, input, etc.)
   - `components/products/` - Product-specific dialogs (Add/Edit/Details)
   - `components/customers/` - Customer-specific dialogs
   - `components/units/` - Unit management dialog
   - `components/shared/` - Shared components (SearchHighlight)
   - `pages/` - Route-level page components

3. **State Management:**
   - TanStack Query for server state (caching, invalidation)
   - Zustand for client state (if needed)
   - React Hook Form for form state

4. **Custom Hooks:**
   - useProducts - Product operations
   - useCustomers - Customer operations
   - useDashboard - Dashboard stats
   - useUnits - Unit operations
   - useTrash - Trash management
   - useDebounce - Debounced values
   - useInfiniteScroll - Infinite scrolling
   - use-toast - Toast notifications

5. **Routing:**
   - React Router for SPA navigation
   - Routes: /, /products, /customers, /invoices, /stats, /trash, /ai

### Configuration System

**Backend Config** (backend/config.py):
- Single source of truth for backend paths and settings
- Loads from `.env` file (dotenv)
- Auto-creates required directories on import
- Initializes encryption manager if SECRET_KEY is provided

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
MAX_PRODUCT_IMAGES="5"
MAX_PAGE_SIZE="50"

# Invoice defaults
DEFAULT_TAX_RATE="0"
DEFAULT_DISCOUNT="0"

# Search
IMAGE_SEARCH_TOP_K="5"
IMAGE_SEARCH_THRESHOLD="0.3"

# Security (for AI config encryption)
SECRET_KEY=""  # Must be 32+ characters if provided

# UI
UI_THEME="blue"  # blue, green, dark-blue
UI_COLOR_MODE="light"  # light, dark, system
```

**Frontend Config:**
- `VITE_API_BASE_URL` - Backend API URL (defaults to http://localhost:8000)

### AI Integration

**Google Cloud Vision (Optional):**
- OCR text extraction from images/PDFs
- Image-based product search (visual similarity)
- Setup requires Google Cloud project with Vision API enabled and service account credentials

**AI Provider Management:**
- Supports multiple AI providers: OpenAI, Google Gemini, Grok (X.AI), Claude (Anthropic), DeepSeek, Qwen
- Used for intelligent price list parsing from images
- API keys stored encrypted in database
- Protected by master password
- Model selection per provider

**Fallback Behavior:**
- Excel/CSV import works without AI (pandas-based)
- Image/PDF import requires either Google Vision or configured AI provider

## Important Implementation Patterns

### Product Import Flow

**Multi-format Support:** Products can be imported from Excel, CSV, images, or PDFs.

**Import Logic** (ProductService.import_from_file):
1. **File Type Detection:** By extension (.xlsx, .csv, .jpg, .pdf, etc.)
2. **Excel/CSV:** Direct pandas parsing without OCR
   - Auto-detects columns (name/product/item, price/cost/giá)
   - Handles Vietnamese column names
3. **Image/PDF:**
   - Option 1: Google Vision OCR → text extraction → regex parsing
   - Option 2: AI provider (OpenAI/Gemini) → structured extraction
4. **Price List Parsing:** Extracts (name, price, import_price) tuples
5. **Update Strategy:**
   - Existing products (by fuzzy name match) → update price + log to PriceHistory
   - New products → create with detected info

### Price Change Tracking

**Automatic Logging:** Every price update creates a PriceHistory record.

**Pattern:**
```python
# In ProductService.update_product()
if price is not None and price != product.price:
    self._record_price_change(product, price, reason="Manual update")
    product.price = price
    product.price_updated_at = get_vn_time()
```

### Soft Delete Pattern

**Implementation:** All main entities (Product, Customer) use `deleted_at` timestamp instead of hard deletes.

**Pattern:**
```python
def delete_product(self, product_id: int) -> bool:
    product = self.get_product(product_id)
    product.deleted_at = get_vn_time()
    self.db.commit()
    return True
```

**Rationale:**
- Preserves invoice history integrity
- Allows data recovery via trash page
- Maintains referential integrity
- Auto-cleanup after 30 days (configurable)

**Permanent Delete:** Available via trash page for immediate cleanup.

### Vietnamese Search and Normalization

**Normalization Pattern:**
- All text fields have corresponding `normalized_*` fields
- Normalization removes Vietnamese diacritics (unidecode)
- Phone numbers normalized to digits-only
- Email normalized to lowercase

**Fuzzy Matching:**
- Uses rapidfuzz library for similarity scoring
- Handles common Vietnamese spelling variations
- Configurable similarity threshold

### Payment Allocation System

**Multi-Invoice Payments:**
- Single payment can be allocated across multiple invoices
- PaymentAllocation tracks amount per invoice
- Invoice.remaining_amount automatically updated
- Supports partial payments and overpayments

### Invoice Return System

**Return Flow:**
1. Create InvoiceReturn with reason and return items
2. Optionally restore inventory (restore_inventory flag per item)
3. Calculate refund amount based on returned items
4. Create refund Payment (negative amount represents cash out)
5. Link refund Payment to InvoiceReturn
6. Update invoice remaining_amount and refunded_amount
7. Change return status to 'refunded'

**Accounting:**
- Invoice.paid_amount: Total cash received
- Invoice.refunded_amount: Total cash returned
- Invoice.net_payment_amount: paid_amount - refunded_amount (actual cash flow)
- Invoice.total_returned_amount: Sum of return refund amounts
- Invoice.net_amount: total - total_returned_amount

### Background Job System

**APScheduler Integration:**
- Scheduler starts on app lifespan startup
- Jobs run in background threads
- Automatic cleanup tasks

**Cleanup Jobs:**
1. **cleanup_old_deletions**: Runs daily at 2 AM
   - Permanently deletes products in trash for 30+ days
   - Removes associated images from filesystem

2. **cleanup_processing_invoices**: Runs hourly
   - Deletes invoices stuck in 'processing' status for 24+ hours
   - Prevents database clutter from incomplete operations

### Database Timezone Handling

**Vietnam Timezone (UTC+7):**
- All DateTime fields use `get_vn_time()` default
- Consistent timezone across all timestamps
- No DST (Daylight Saving Time) complications

### Image Management

**Product Images:**
- Stored in `backend/data/images/products/`
- Comma-separated paths in `Product.image_paths`
- Max 5 images per product (configurable via MAX_PRODUCT_IMAGES)
- File cleanup on product permanent delete
- Served via FastAPI static file mount at `/images/products/`

### Invoice Generation

**PDF Generation (ReportLab):**
- Vietnamese font support
- Company header with logo (if available)
- Line items table with subtotals
- Tax and discount calculations
- Return tracking with net amounts
- Payment history
- Total in bold

**Excel Export (OpenPyXL):**
- Editable spreadsheet format
- Formulas for calculations
- Vietnamese column headers

**Export Tracking:**
- First export timestamp stored in `exported_at`
- Prevents cancellation of exported invoices (business rule)
- Debt only counted for exported invoices

## Troubleshooting

### Database Issues

**Locked Database:**
- Close all active sessions/connections
- Restart backend server
- SQLite only supports one writer at a time

**Schema Updates:**
- SQLAlchemy auto-creates new columns on model changes
- For breaking changes, backup database first
- No migration system currently implemented

### AI/OCR Issues

**Google Vision API Errors:**
- Verify `GOOGLE_CREDENTIALS_PATH` points to valid JSON
- Check service account has Cloud Vision API enabled
- Check Google Cloud Console quotas

**AI Provider Errors:**
- Verify API key is correctly saved (encrypted)
- Check provider is enabled in AI configuration
- Verify model selection is valid for provider
- Check network connectivity and API rate limits

### CORS Errors

**Frontend can't reach backend:**
- Verify backend is running on port 8000
- Check CORS origins in `backend/main.py`
- Ensure frontend uses correct API base URL

### Background Jobs Not Running

**Scheduler Issues:**
- Check logs for scheduler startup message
- Verify no exceptions during job execution
- Jobs run in background - check logs for results
- Scheduler shuts down gracefully on app shutdown
