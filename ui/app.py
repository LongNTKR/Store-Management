"""Main application UI using CustomTkinter."""

import customtkinter as ctk
from tkinter import filedialog
from typing import Optional, List
from datetime import datetime
from PIL import Image, ImageTk
import os

from config import Config
from database import get_db_manager, Product, Customer, Invoice
from services import (
    OCRService,
    ImageSearchService,
    ProductService,
    CustomerService,
    InvoiceService
)
from utils import (
    format_currency,
    format_date,
    resize_image,
    show_error,
    show_success,
    show_info,
    confirm_dialog
)


class StoreManagementApp(ctk.CTk):
    """Main application window."""

    def __init__(self):
        super().__init__()

        # Window config
        self.title(f"{Config.APP_NAME} v{Config.APP_VERSION}")
        self.geometry("1400x800")

        # Set theme
        ctk.set_appearance_mode(Config.UI_COLOR_MODE)
        ctk.set_default_color_theme(Config.UI_THEME)

        # Initialize database
        self.db_manager = get_db_manager(Config.DATABASE_PATH)
        self.db_session = self.db_manager.get_session()

        # Initialize services
        try:
            self.ocr_service = OCRService(Config.GOOGLE_CREDENTIALS_PATH)
            self.image_search_service = ImageSearchService(Config.GOOGLE_CREDENTIALS_PATH)
        except Exception as e:
            show_error("Lỗi khởi tạo", f"Không thể khởi tạo Google Vision API: {e}")
            self.ocr_service = None
            self.image_search_service = None

        self.product_service = ProductService(self.db_session, Config.IMAGE_DIR)
        self.customer_service = CustomerService(self.db_session)
        self.invoice_service = InvoiceService(self.db_session, Config.INVOICE_DIR)

        # Create UI
        self.create_widgets()

        # Load initial data
        self.refresh_products()
        self.refresh_customers()

    def create_widgets(self):
        """Create main UI widgets."""

        # Configure grid
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Sidebar
        self.sidebar = ctk.CTkFrame(self, width=200, corner_radius=0)
        self.sidebar.grid(row=0, column=0, rowspan=4, sticky="nsew")
        self.sidebar.grid_rowconfigure(7, weight=1)

        # Logo/Title
        self.logo_label = ctk.CTkLabel(
            self.sidebar,
            text=Config.COMPANY_NAME,
            font=ctk.CTkFont(size=20, weight="bold")
        )
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))

        # Navigation buttons
        self.btn_products = ctk.CTkButton(
            self.sidebar,
            text="📦 Sản phẩm",
            command=lambda: self.show_page("products"),
            height=40
        )
        self.btn_products.grid(row=1, column=0, padx=20, pady=10, sticky="ew")

        self.btn_import = ctk.CTkButton(
            self.sidebar,
            text="📥 Nhập báo giá",
            command=lambda: self.show_page("import"),
            height=40
        )
        self.btn_import.grid(row=2, column=0, padx=20, pady=10, sticky="ew")

        self.btn_search = ctk.CTkButton(
            self.sidebar,
            text="🔍 Tìm kiếm AI",
            command=lambda: self.show_page("search"),
            height=40
        )
        self.btn_search.grid(row=3, column=0, padx=20, pady=10, sticky="ew")

        self.btn_invoices = ctk.CTkButton(
            self.sidebar,
            text="🧾 Hóa đơn",
            command=lambda: self.show_page("invoices"),
            height=40
        )
        self.btn_invoices.grid(row=4, column=0, padx=20, pady=10, sticky="ew")

        self.btn_customers = ctk.CTkButton(
            self.sidebar,
            text="👥 Khách hàng",
            command=lambda: self.show_page("customers"),
            height=40
        )
        self.btn_customers.grid(row=5, column=0, padx=20, pady=10, sticky="ew")

        self.btn_stats = ctk.CTkButton(
            self.sidebar,
            text="📊 Thống kê",
            command=lambda: self.show_page("stats"),
            height=40
        )
        self.btn_stats.grid(row=6, column=0, padx=20, pady=10, sticky="ew")

        # Theme toggle
        self.theme_label = ctk.CTkLabel(self.sidebar, text="Giao diện:")
        self.theme_label.grid(row=8, column=0, padx=20, pady=(10, 0))

        self.theme_switch = ctk.CTkSwitch(
            self.sidebar,
            text="Tối",
            command=self.toggle_theme
        )
        self.theme_switch.grid(row=9, column=0, padx=20, pady=(0, 20))

        # Main content area
        self.main_frame = ctk.CTkFrame(self, corner_radius=0)
        self.main_frame.grid(row=0, column=1, sticky="nsew", padx=10, pady=10)
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(0, weight=1)

        # Create pages
        self.pages = {}
        self.create_products_page()
        self.create_import_page()
        self.create_search_page()
        self.create_invoices_page()
        self.create_customers_page()
        self.create_stats_page()

        # Show first page
        self.show_page("products")

    def toggle_theme(self):
        """Toggle between light and dark theme."""
        if self.theme_switch.get():
            ctk.set_appearance_mode("dark")
        else:
            ctk.set_appearance_mode("light")

    def show_page(self, page_name: str):
        """Show specified page."""
        for name, page in self.pages.items():
            if name == page_name:
                page.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
            else:
                page.grid_forget()

    def create_products_page(self):
        """Create products management page."""
        page = ctk.CTkFrame(self.main_frame)
        page.grid_columnconfigure(0, weight=1)
        page.grid_rowconfigure(1, weight=1)

        # Title and buttons
        top_frame = ctk.CTkFrame(page)
        top_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)

        title = ctk.CTkLabel(
            top_frame,
            text="QUẢN LÝ SẢN PHẨM",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.pack(side="left", padx=10)

        btn_add = ctk.CTkButton(
            top_frame,
            text="➕ Thêm sản phẩm",
            command=self.add_product_dialog,
            height=40
        )
        btn_add.pack(side="right", padx=5)

        # Search box
        search_frame = ctk.CTkFrame(page)
        search_frame.grid(row=1, column=0, sticky="ew", padx=10, pady=(0, 10))

        self.product_search_entry = ctk.CTkEntry(
            search_frame,
            placeholder_text="Tìm kiếm sản phẩm...",
            width=300
        )
        self.product_search_entry.pack(side="left", padx=5, pady=5)

        btn_search = ctk.CTkButton(
            search_frame,
            text="🔍 Tìm",
            command=self.search_products,
            width=100
        )
        btn_search.pack(side="left", padx=5)

        # Products scrollable frame
        self.products_scroll = ctk.CTkScrollableFrame(page)
        self.products_scroll.grid(row=2, column=0, sticky="nsew", padx=10, pady=10)
        self.products_scroll.grid_columnconfigure(0, weight=1)

        self.pages["products"] = page

    def create_import_page(self):
        """Create price list import page."""
        page = ctk.CTkFrame(self.main_frame)
        page.grid_columnconfigure(0, weight=1)

        # Title
        title = ctk.CTkLabel(
            page,
            text="NHẬP BẢNG BÁO GIÁ",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.grid(row=0, column=0, padx=20, pady=20)

        # Instructions
        instructions = ctk.CTkTextbox(page, height=100, state="normal")
        instructions.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        instructions.insert("1.0",
            "Hướng dẫn:\n"
            "1. Chọn file báo giá từ nhà phân phối (ảnh, PDF, Excel, CSV)\n"
            "2. Hệ thống sẽ tự động đọc và phân tích danh sách sản phẩm\n"
            "3. Kiểm tra và xác nhận cập nhật\n"
            "4. Sản phẩm mới sẽ được thêm, giá cũ sẽ được cập nhật"
        )
        instructions.configure(state="disabled")

        # File selection
        file_frame = ctk.CTkFrame(page)
        file_frame.grid(row=2, column=0, padx=20, pady=20, sticky="ew")

        btn_select = ctk.CTkButton(
            file_frame,
            text="📁 Chọn file",
            command=self.select_import_file,
            height=50,
            font=ctk.CTkFont(size=16)
        )
        btn_select.pack(padx=10, pady=10)

        self.import_file_label = ctk.CTkLabel(
            file_frame,
            text="Chưa chọn file",
            font=ctk.CTkFont(size=12)
        )
        self.import_file_label.pack(padx=10, pady=5)

        # Import button
        self.btn_import_exec = ctk.CTkButton(
            page,
            text="🚀 Bắt đầu nhập",
            command=self.import_price_list,
            height=50,
            font=ctk.CTkFont(size=16),
            state="disabled"
        )
        self.btn_import_exec.grid(row=3, column=0, padx=20, pady=20)

        # Results
        self.import_results = ctk.CTkTextbox(page, height=300)
        self.import_results.grid(row=4, column=0, padx=20, pady=10, sticky="nsew")

        page.grid_rowconfigure(4, weight=1)
        self.pages["import"] = page
        self.selected_import_file = None

    def create_search_page(self):
        """Create AI search page."""
        page = ctk.CTkFrame(self.main_frame)
        page.grid_columnconfigure(0, weight=1)

        # Title
        title = ctk.CTkLabel(
            page,
            text="TÌM KIẾM SẢN PHẨM BẰNG AI",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.grid(row=0, column=0, padx=20, pady=20)

        # Text search
        text_frame = ctk.CTkFrame(page)
        text_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")

        ctk.CTkLabel(text_frame, text="Tìm theo tên:", font=ctk.CTkFont(size=14)).pack(
            anchor="w", padx=10, pady=(10, 5)
        )

        search_row = ctk.CTkFrame(text_frame)
        search_row.pack(fill="x", padx=10, pady=(0, 10))

        self.text_search_entry = ctk.CTkEntry(
            search_row,
            placeholder_text="Nhập tên sản phẩm...",
            height=40
        )
        self.text_search_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))

        btn_text_search = ctk.CTkButton(
            search_row,
            text="🔍 Tìm",
            command=self.text_search,
            height=40,
            width=100
        )
        btn_text_search.pack(side="right")

        # Image search
        image_frame = ctk.CTkFrame(page)
        image_frame.grid(row=2, column=0, padx=20, pady=10, sticky="ew")

        ctk.CTkLabel(image_frame, text="Tìm theo hình ảnh:", font=ctk.CTkFont(size=14)).pack(
            anchor="w", padx=10, pady=(10, 5)
        )

        btn_select_image = ctk.CTkButton(
            image_frame,
            text="📷 Chọn ảnh",
            command=self.select_search_image,
            height=40
        )
        btn_select_image.pack(padx=10, pady=10)

        self.search_image_label = ctk.CTkLabel(image_frame, text="Chưa chọn ảnh")
        self.search_image_label.pack(padx=10, pady=5)

        # Results
        results_label = ctk.CTkLabel(
            page,
            text="Kết quả tìm kiếm:",
            font=ctk.CTkFont(size=16, weight="bold")
        )
        results_label.grid(row=3, column=0, padx=20, pady=(20, 10), sticky="w")

        self.search_results_frame = ctk.CTkScrollableFrame(page)
        self.search_results_frame.grid(row=4, column=0, padx=20, pady=10, sticky="nsew")

        page.grid_rowconfigure(4, weight=1)
        self.pages["search"] = page
        self.selected_search_image = None

    def create_invoices_page(self):
        """Create invoices management page."""
        page = ctk.CTkFrame(self.main_frame)
        page.grid_columnconfigure(0, weight=1)
        page.grid_rowconfigure(2, weight=1)

        # Title
        top_frame = ctk.CTkFrame(page)
        top_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)

        title = ctk.CTkLabel(
            top_frame,
            text="QUẢN LÝ HÓA ĐƠN",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.pack(side="left", padx=10)

        btn_new = ctk.CTkButton(
            top_frame,
            text="➕ Tạo hóa đơn mới",
            command=self.create_invoice_dialog,
            height=40
        )
        btn_new.pack(side="right", padx=5)

        # Filter
        filter_frame = ctk.CTkFrame(page)
        filter_frame.grid(row=1, column=0, sticky="ew", padx=10, pady=10)

        ctk.CTkLabel(filter_frame, text="Trạng thái:").pack(side="left", padx=5)

        self.invoice_status_var = ctk.StringVar(value="all")
        status_menu = ctk.CTkOptionMenu(
            filter_frame,
            values=["Tất cả", "Chưa thanh toán", "Đã thanh toán", "Đã hủy"],
            variable=self.invoice_status_var,
            command=self.refresh_invoices
        )
        status_menu.pack(side="left", padx=5)

        # Invoices list
        self.invoices_scroll = ctk.CTkScrollableFrame(page)
        self.invoices_scroll.grid(row=2, column=0, sticky="nsew", padx=10, pady=10)

        self.pages["invoices"] = page

    def create_customers_page(self):
        """Create customers management page."""
        page = ctk.CTkFrame(self.main_frame)
        page.grid_columnconfigure(0, weight=1)
        page.grid_rowconfigure(2, weight=1)

        # Title
        top_frame = ctk.CTkFrame(page)
        top_frame.grid(row=0, column=0, sticky="ew", padx=10, pady=10)

        title = ctk.CTkLabel(
            top_frame,
            text="QUẢN LÝ KHÁCH HÀNG",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.pack(side="left", padx=10)

        btn_add = ctk.CTkButton(
            top_frame,
            text="➕ Thêm khách hàng",
            command=self.add_customer_dialog,
            height=40
        )
        btn_add.pack(side="right", padx=5)

        # Search
        search_frame = ctk.CTkFrame(page)
        search_frame.grid(row=1, column=0, sticky="ew", padx=10, pady=10)

        self.customer_search_entry = ctk.CTkEntry(
            search_frame,
            placeholder_text="Tìm khách hàng...",
            width=300
        )
        self.customer_search_entry.pack(side="left", padx=5)

        btn_search = ctk.CTkButton(
            search_frame,
            text="🔍 Tìm",
            command=self.search_customers,
            width=100
        )
        btn_search.pack(side="left", padx=5)

        # Customers list
        self.customers_scroll = ctk.CTkScrollableFrame(page)
        self.customers_scroll.grid(row=2, column=0, sticky="nsew", padx=10, pady=10)

        self.pages["customers"] = page

    def create_stats_page(self):
        """Create statistics page."""
        page = ctk.CTkFrame(self.main_frame)
        page.grid_columnconfigure(0, weight=1)

        # Title
        title = ctk.CTkLabel(
            page,
            text="THỐNG KÊ & BÁO CÁO",
            font=ctk.CTkFont(size=24, weight="bold")
        )
        title.grid(row=0, column=0, padx=20, pady=20)

        # Stats frame
        stats_frame = ctk.CTkFrame(page)
        stats_frame.grid(row=1, column=0, padx=20, pady=20, sticky="ew")
        stats_frame.grid_columnconfigure((0, 1, 2), weight=1)

        # Product stats
        self.stat_products = self.create_stat_card(
            stats_frame, "Tổng sản phẩm", "0", "📦"
        )
        self.stat_products.grid(row=0, column=0, padx=10, pady=10, sticky="ew")

        # Customer stats
        self.stat_customers = self.create_stat_card(
            stats_frame, "Tổng khách hàng", "0", "👥"
        )
        self.stat_customers.grid(row=0, column=1, padx=10, pady=10, sticky="ew")

        # Invoice stats
        self.stat_invoices = self.create_stat_card(
            stats_frame, "Tổng hóa đơn", "0", "🧾"
        )
        self.stat_invoices.grid(row=0, column=2, padx=10, pady=10, sticky="ew")

        # Revenue stats
        revenue_frame = ctk.CTkFrame(page)
        revenue_frame.grid(row=2, column=0, padx=20, pady=20, sticky="ew")

        self.stat_revenue = self.create_stat_card(
            revenue_frame, "Doanh thu", "0 VNĐ", "💰"
        )
        self.stat_revenue.pack(fill="both", expand=True, padx=10, pady=10)

        # Refresh button
        btn_refresh = ctk.CTkButton(
            page,
            text="🔄 Cập nhật thống kê",
            command=self.refresh_stats,
            height=40
        )
        btn_refresh.grid(row=3, column=0, padx=20, pady=20)

        self.pages["stats"] = page

    def create_stat_card(self, parent, title: str, value: str, icon: str):
        """Create a statistics card widget."""
        card = ctk.CTkFrame(parent)

        icon_label = ctk.CTkLabel(
            card,
            text=icon,
            font=ctk.CTkFont(size=40)
        )
        icon_label.pack(pady=(20, 10))

        value_label = ctk.CTkLabel(
            card,
            text=value,
            font=ctk.CTkFont(size=24, weight="bold")
        )
        value_label.pack()

        title_label = ctk.CTkLabel(
            card,
            text=title,
            font=ctk.CTkFont(size=14)
        )
        title_label.pack(pady=(5, 20))

        card.value_label = value_label  # Store reference for updates

        return card

    # Product methods
    def refresh_products(self):
        """Refresh products list."""
        # Clear current widgets
        for widget in self.products_scroll.winfo_children():
            widget.destroy()

        products = self.product_service.get_all_products()

        if not products:
            label = ctk.CTkLabel(
                self.products_scroll,
                text="Chưa có sản phẩm nào",
                font=ctk.CTkFont(size=16)
            )
            label.pack(pady=50)
            return

        for product in products:
            self.create_product_card(product)

    def create_product_card(self, product: Product):
        """Create a product card widget."""
        card = ctk.CTkFrame(self.products_scroll)
        card.pack(fill="x", padx=5, pady=5)

        # Product info
        info_frame = ctk.CTkFrame(card)
        info_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        name_label = ctk.CTkLabel(
            info_frame,
            text=product.name,
            font=ctk.CTkFont(size=16, weight="bold")
        )
        name_label.pack(anchor="w")

        price_label = ctk.CTkLabel(
            info_frame,
            text=format_currency(product.price),
            font=ctk.CTkFont(size=14),
            text_color="green"
        )
        price_label.pack(anchor="w")

        if product.description:
            desc_label = ctk.CTkLabel(
                info_frame,
                text=product.description[:100],
                font=ctk.CTkFont(size=12)
            )
            desc_label.pack(anchor="w")

        # Buttons
        btn_frame = ctk.CTkFrame(card)
        btn_frame.pack(side="right", padx=10, pady=10)

        btn_edit = ctk.CTkButton(
            btn_frame,
            text="✏️",
            width=40,
            command=lambda p=product: self.edit_product_dialog(p)
        )
        btn_edit.pack(side="left", padx=2)

        btn_delete = ctk.CTkButton(
            btn_frame,
            text="🗑️",
            width=40,
            fg_color="red",
            command=lambda p=product: self.delete_product(p)
        )
        btn_delete.pack(side="left", padx=2)

    def search_products(self):
        """Search products by text."""
        query = self.product_search_entry.get()

        # Clear current widgets
        for widget in self.products_scroll.winfo_children():
            widget.destroy()

        if not query:
            self.refresh_products()
            return

        products = self.product_service.search_products(query=query)

        if not products:
            label = ctk.CTkLabel(
                self.products_scroll,
                text=f"Không tìm thấy sản phẩm '{query}'",
                font=ctk.CTkFont(size=16)
            )
            label.pack(pady=50)
            return

        for product in products:
            self.create_product_card(product)

    def add_product_dialog(self):
        """Show dialog to add new product."""
        dialog = ctk.CTkToplevel(self)
        dialog.title("Thêm sản phẩm mới")
        dialog.geometry("500x600")

        # Name
        ctk.CTkLabel(dialog, text="Tên sản phẩm:").pack(padx=20, pady=(20, 5))
        name_entry = ctk.CTkEntry(dialog, width=400)
        name_entry.pack(padx=20, pady=5)

        # Price
        ctk.CTkLabel(dialog, text="Giá:").pack(padx=20, pady=(10, 5))
        price_entry = ctk.CTkEntry(dialog, width=400)
        price_entry.pack(padx=20, pady=5)

        # Description
        ctk.CTkLabel(dialog, text="Mô tả:").pack(padx=20, pady=(10, 5))
        desc_entry = ctk.CTkTextbox(dialog, width=400, height=100)
        desc_entry.pack(padx=20, pady=5)

        # Category
        ctk.CTkLabel(dialog, text="Danh mục:").pack(padx=20, pady=(10, 5))
        category_entry = ctk.CTkEntry(dialog, width=400)
        category_entry.pack(padx=20, pady=5)

        # Unit
        ctk.CTkLabel(dialog, text="Đơn vị:").pack(padx=20, pady=(10, 5))
        unit_entry = ctk.CTkEntry(dialog, width=400)
        unit_entry.insert(0, "cái")
        unit_entry.pack(padx=20, pady=5)

        def save_product():
            try:
                name = name_entry.get()
                price = float(price_entry.get())
                description = desc_entry.get("1.0", "end-1c")
                category = category_entry.get() or None
                unit = unit_entry.get()

                if not name or price <= 0:
                    show_error("Lỗi", "Vui lòng nhập tên và giá hợp lệ")
                    return

                self.product_service.create_product(
                    name=name,
                    price=price,
                    description=description,
                    category=category,
                    unit=unit
                )

                show_success("Thành công", "Đã thêm sản phẩm mới")
                dialog.destroy()
                self.refresh_products()

            except ValueError:
                show_error("Lỗi", "Giá không hợp lệ")

        btn_save = ctk.CTkButton(
            dialog,
            text="💾 Lưu",
            command=save_product,
            height=40
        )
        btn_save.pack(padx=20, pady=20)

    def edit_product_dialog(self, product: Product):
        """Show dialog to edit product."""
        # Similar to add_product_dialog but with pre-filled values
        show_info("Chỉnh sửa", f"Chức năng chỉnh sửa cho sản phẩm: {product.name}")

    def delete_product(self, product: Product):
        """Delete a product."""
        if confirm_dialog("Xác nhận xóa", f"Bạn có chắc muốn xóa sản phẩm '{product.name}'?"):
            self.product_service.delete_product(product.id)
            show_success("Thành công", "Đã xóa sản phẩm")
            self.refresh_products()

    # Import methods
    def select_import_file(self):
        """Select file for import."""
        filename = filedialog.askopenfilename(
            title="Chọn file báo giá",
            filetypes=[
                ("All supported", "*.jpg *.jpeg *.png *.pdf *.xlsx *.xls *.csv"),
                ("Images", "*.jpg *.jpeg *.png"),
                ("PDF", "*.pdf"),
                ("Excel", "*.xlsx *.xls"),
                ("CSV", "*.csv")
            ]
        )

        if filename:
            self.selected_import_file = filename
            self.import_file_label.configure(text=os.path.basename(filename))
            self.btn_import_exec.configure(state="normal")

    def import_price_list(self):
        """Import price list from file."""
        if not self.selected_import_file:
            return

        if not self.ocr_service:
            show_error("Lỗi", "Chưa cấu hình Google Vision API")
            return

        self.import_results.delete("1.0", "end")
        self.import_results.insert("1.0", "Đang xử lý...\n")

        try:
            updated, added, errors = self.product_service.import_from_file(
                self.selected_import_file,
                self.ocr_service,
                update_existing=True,
                add_new=True
            )

            result_text = f"✅ Hoàn thành!\n\n"
            result_text += f"Đã cập nhật: {updated} sản phẩm\n"
            result_text += f"Đã thêm mới: {added} sản phẩm\n"

            if errors:
                result_text += f"\n❌ Lỗi ({len(errors)}):\n"
                for error in errors[:10]:  # Show first 10 errors
                    result_text += f"- {error}\n"

            self.import_results.delete("1.0", "end")
            self.import_results.insert("1.0", result_text)

            show_success("Thành công", f"Đã nhập {added + updated} sản phẩm")
            self.refresh_products()

        except Exception as e:
            self.import_results.delete("1.0", "end")
            self.import_results.insert("1.0", f"❌ Lỗi: {str(e)}")
            show_error("Lỗi", f"Không thể nhập file: {str(e)}")

    # Search methods
    def text_search(self):
        """Search products by text."""
        query = self.text_search_entry.get()

        # Clear results
        for widget in self.search_results_frame.winfo_children():
            widget.destroy()

        if not query:
            return

        products = self.product_service.search_products(query=query)

        if not products:
            label = ctk.CTkLabel(
                self.search_results_frame,
                text="Không tìm thấy kết quả",
                font=ctk.CTkFont(size=16)
            )
            label.pack(pady=50)
            return

        for product in products:
            self.create_search_result_card(product, 1.0)

    def select_search_image(self):
        """Select image for search."""
        filename = filedialog.askopenfilename(
            title="Chọn ảnh sản phẩm",
            filetypes=[("Images", "*.jpg *.jpeg *.png")]
        )

        if filename:
            self.selected_search_image = filename
            self.search_image_label.configure(text=os.path.basename(filename))
            self.image_search()

    def image_search(self):
        """Search products by image."""
        if not self.selected_search_image or not self.image_search_service:
            return

        # Clear results
        for widget in self.search_results_frame.winfo_children():
            widget.destroy()

        # Get all products with images
        products = self.product_service.get_all_products()
        product_images = []

        for product in products:
            if product.images:
                product_images.append((product.id, product.images[0]))

        if not product_images:
            show_info("Thông báo", "Chưa có sản phẩm nào có hình ảnh để so sánh")
            return

        try:
            results = self.image_search_service.search_similar_products(
                self.selected_search_image,
                product_images,
                top_k=Config.IMAGE_SEARCH_TOP_K,
                threshold=Config.IMAGE_SEARCH_THRESHOLD
            )

            if not results:
                label = ctk.CTkLabel(
                    self.search_results_frame,
                    text="Không tìm thấy sản phẩm tương tự",
                    font=ctk.CTkFont(size=16)
                )
                label.pack(pady=50)
                return

            for product_id, similarity in results:
                product = self.product_service.get_product(product_id)
                if product:
                    self.create_search_result_card(product, similarity)

        except Exception as e:
            show_error("Lỗi", f"Lỗi khi tìm kiếm: {str(e)}")

    def create_search_result_card(self, product: Product, similarity: float):
        """Create search result card."""
        card = ctk.CTkFrame(self.search_results_frame)
        card.pack(fill="x", padx=5, pady=5)

        # Product info
        info_frame = ctk.CTkFrame(card)
        info_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        name_label = ctk.CTkLabel(
            info_frame,
            text=product.name,
            font=ctk.CTkFont(size=16, weight="bold")
        )
        name_label.pack(anchor="w")

        price_label = ctk.CTkLabel(
            info_frame,
            text=format_currency(product.price),
            font=ctk.CTkFont(size=14),
            text_color="green"
        )
        price_label.pack(anchor="w")

        similarity_label = ctk.CTkLabel(
            info_frame,
            text=f"Độ tương đồng: {similarity*100:.1f}%",
            font=ctk.CTkFont(size=12),
            text_color="blue"
        )
        similarity_label.pack(anchor="w")

    # Invoice methods
    def refresh_invoices(self, *args):
        """Refresh invoices list."""
        # Clear current widgets
        for widget in self.invoices_scroll.winfo_children():
            widget.destroy()

        status_map = {
            "Tất cả": None,
            "Chưa thanh toán": "pending",
            "Đã thanh toán": "paid",
            "Đã hủy": "cancelled"
        }

        status = status_map.get(self.invoice_status_var.get())
        invoices = self.invoice_service.search_invoices(status=status)

        if not invoices:
            label = ctk.CTkLabel(
                self.invoices_scroll,
                text="Chưa có hóa đơn nào",
                font=ctk.CTkFont(size=16)
            )
            label.pack(pady=50)
            return

        for invoice in invoices:
            self.create_invoice_card(invoice)

    def create_invoice_card(self, invoice: Invoice):
        """Create invoice card."""
        card = ctk.CTkFrame(self.invoices_scroll)
        card.pack(fill="x", padx=5, pady=5)

        # Invoice info
        info_frame = ctk.CTkFrame(card)
        info_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        number_label = ctk.CTkLabel(
            info_frame,
            text=f"Số HĐ: {invoice.invoice_number}",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        number_label.pack(anchor="w")

        customer_label = ctk.CTkLabel(
            info_frame,
            text=f"Khách: {invoice.customer_name or 'N/A'}",
            font=ctk.CTkFont(size=12)
        )
        customer_label.pack(anchor="w")

        total_label = ctk.CTkLabel(
            info_frame,
            text=format_currency(invoice.total),
            font=ctk.CTkFont(size=14),
            text_color="green"
        )
        total_label.pack(anchor="w")

        date_label = ctk.CTkLabel(
            info_frame,
            text=format_date(invoice.created_at),
            font=ctk.CTkFont(size=10)
        )
        date_label.pack(anchor="w")

        # Buttons
        btn_frame = ctk.CTkFrame(card)
        btn_frame.pack(side="right", padx=10, pady=10)

        btn_pdf = ctk.CTkButton(
            btn_frame,
            text="PDF",
            width=60,
            command=lambda i=invoice: self.export_invoice_pdf(i)
        )
        btn_pdf.pack(side="left", padx=2)

        btn_excel = ctk.CTkButton(
            btn_frame,
            text="Excel",
            width=60,
            command=lambda i=invoice: self.export_invoice_excel(i)
        )
        btn_excel.pack(side="left", padx=2)

        btn_print = ctk.CTkButton(
            btn_frame,
            text="🖨️",
            width=40,
            command=lambda i=invoice: self.print_invoice(i)
        )
        btn_print.pack(side="left", padx=2)

    def create_invoice_dialog(self):
        """Show dialog to create new invoice."""
        show_info("Tạo hóa đơn", "Chức năng tạo hóa đơn đang được phát triển")

    def export_invoice_pdf(self, invoice: Invoice):
        """Export invoice to PDF."""
        try:
            pdf_path = self.invoice_service.generate_pdf(invoice.id, Config.COMPANY_NAME)
            show_success("Thành công", f"Đã xuất PDF: {pdf_path}")
        except Exception as e:
            show_error("Lỗi", f"Không thể xuất PDF: {str(e)}")

    def export_invoice_excel(self, invoice: Invoice):
        """Export invoice to Excel."""
        try:
            excel_path = self.invoice_service.generate_excel(invoice.id, Config.COMPANY_NAME)
            show_success("Thành công", f"Đã xuất Excel: {excel_path}")
        except Exception as e:
            show_error("Lỗi", f"Không thể xuất Excel: {str(e)}")

    def print_invoice(self, invoice: Invoice):
        """Print invoice."""
        try:
            self.invoice_service.print_invoice(invoice.id, Config.COMPANY_NAME)
        except Exception as e:
            show_error("Lỗi", f"Không thể in hóa đơn: {str(e)}")

    # Customer methods
    def refresh_customers(self):
        """Refresh customers list."""
        # Clear current widgets
        for widget in self.customers_scroll.winfo_children():
            widget.destroy()

        customers = self.customer_service.get_all_customers()

        if not customers:
            label = ctk.CTkLabel(
                self.customers_scroll,
                text="Chưa có khách hàng nào",
                font=ctk.CTkFont(size=16)
            )
            label.pack(pady=50)
            return

        for customer in customers:
            self.create_customer_card(customer)

    def create_customer_card(self, customer: Customer):
        """Create customer card."""
        card = ctk.CTkFrame(self.customers_scroll)
        card.pack(fill="x", padx=5, pady=5)

        # Customer info
        info_frame = ctk.CTkFrame(card)
        info_frame.pack(side="left", fill="both", expand=True, padx=10, pady=10)

        name_label = ctk.CTkLabel(
            info_frame,
            text=customer.name,
            font=ctk.CTkFont(size=16, weight="bold")
        )
        name_label.pack(anchor="w")

        phone_label = ctk.CTkLabel(
            info_frame,
            text=f"📞 {customer.phone or 'N/A'}",
            font=ctk.CTkFont(size=12)
        )
        phone_label.pack(anchor="w")

        if customer.email:
            email_label = ctk.CTkLabel(
                info_frame,
                text=f"📧 {customer.email}",
                font=ctk.CTkFont(size=12)
            )
            email_label.pack(anchor="w")

        # Buttons
        btn_frame = ctk.CTkFrame(card)
        btn_frame.pack(side="right", padx=10, pady=10)

        btn_edit = ctk.CTkButton(
            btn_frame,
            text="✏️",
            width=40,
            command=lambda c=customer: self.edit_customer_dialog(c)
        )
        btn_edit.pack(side="left", padx=2)

        btn_delete = ctk.CTkButton(
            btn_frame,
            text="🗑️",
            width=40,
            fg_color="red",
            command=lambda c=customer: self.delete_customer(c)
        )
        btn_delete.pack(side="left", padx=2)

    def search_customers(self):
        """Search customers."""
        query = self.customer_search_entry.get()

        # Clear current widgets
        for widget in self.customers_scroll.winfo_children():
            widget.destroy()

        if not query:
            self.refresh_customers()
            return

        customers = self.customer_service.search_customers(query)

        if not customers:
            label = ctk.CTkLabel(
                self.customers_scroll,
                text=f"Không tìm thấy khách hàng '{query}'",
                font=ctk.CTkFont(size=16)
            )
            label.pack(pady=50)
            return

        for customer in customers:
            self.create_customer_card(customer)

    def add_customer_dialog(self):
        """Show dialog to add new customer."""
        show_info("Thêm khách hàng", "Chức năng thêm khách hàng đang được phát triển")

    def edit_customer_dialog(self, customer: Customer):
        """Show dialog to edit customer."""
        show_info("Chỉnh sửa", f"Chỉnh sửa khách hàng: {customer.name}")

    def delete_customer(self, customer: Customer):
        """Delete a customer."""
        if confirm_dialog("Xác nhận xóa", f"Bạn có chắc muốn xóa khách hàng '{customer.name}'?"):
            self.customer_service.delete_customer(customer.id)
            show_success("Thành công", "Đã xóa khách hàng")
            self.refresh_customers()

    # Stats methods
    def refresh_stats(self):
        """Refresh statistics."""
        # Product count
        products = self.product_service.get_all_products()
        self.stat_products.value_label.configure(text=str(len(products)))

        # Customer count
        customers = self.customer_service.get_all_customers()
        self.stat_customers.value_label.configure(text=str(len(customers)))

        # Invoice stats
        stats = self.invoice_service.get_statistics()
        self.stat_invoices.value_label.configure(text=str(stats['total_invoices']))
        self.stat_revenue.value_label.configure(text=format_currency(stats['total_revenue']))

        show_success("Thành công", "Đã cập nhật thống kê")

    def on_closing(self):
        """Handle window closing."""
        self.db_session.close()
        self.destroy()


if __name__ == "__main__":
    app = StoreManagementApp()
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
