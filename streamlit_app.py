"""
Store Management System - Streamlit Version
A beautiful modern web interface for managing sales and products
"""

import streamlit as st
from datetime import datetime
import os
from PIL import Image
import pandas as pd

# Configure page
st.set_page_config(
    page_title="Quản Lý Bán Hàng",
    page_icon="🏪",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Import services
from database import get_db_manager, Product, Customer, Invoice
from services import (
    OCRService,
    ImageSearchService,
    ProductService,
    CustomerService,
    InvoiceService
)
from config import Config
from utils import format_currency, format_date, show_success, confirm_dialog

from ui.styles import load_css
from ui.search_component import instant_search

# Apply Global CSS
st.markdown(load_css(), unsafe_allow_html=True)

# Initialize database and services
@st.cache_resource
def init_services():
    """Initialize all services (cached to avoid re-initialization)"""
    db_manager = get_db_manager(Config.DATABASE_PATH)
    db_session = db_manager.get_session()

    try:
        ocr_service = OCRService(Config.GOOGLE_CREDENTIALS_PATH if Config.GOOGLE_CREDENTIALS_PATH else None)
        image_search_service = ImageSearchService(Config.GOOGLE_CREDENTIALS_PATH if Config.GOOGLE_CREDENTIALS_PATH else None)
    except Exception as e:
        st.warning(f"⚠️ Google Vision API không khả dụng: {e}")
        ocr_service = None
        image_search_service = None

    product_service = ProductService(db_session, Config.IMAGE_DIR)
    customer_service = CustomerService(db_session)
    invoice_service = InvoiceService(db_session, Config.INVOICE_DIR)

    services = {
        'db_session': db_session,
        'ocr_service': ocr_service,
        'image_search_service': image_search_service,
        'product_service': product_service,
        'customer_service': customer_service,
        'invoice_service': invoice_service,
    }

    return services

def show_splash_screen():
    """Display beautiful splash screen with blur effect"""
    splash_html = """
    <style>
        /* Hide sidebar while loading */
        [data-testid="stSidebar"] {
            display: none !important;
        }
        [data-testid="stHeader"] {
            display: none !important;
        }
    </style>
    <div class="splash-screen">
        <div class="splash-content">
            <div class="splash-logo">🏪</div>
            <div class="splash-title">Hệ Thống Quản Lý Bán Hàng</div>
            <div class="splash-subtitle">Đang khởi động...</div>
            <div class="splash-loader"></div>
            <div class="splash-dots">
                <div class="splash-dot"></div>
                <div class="splash-dot"></div>
                <div class="splash-dot"></div>
            </div>
        </div>
    </div>
    """
    st.markdown(splash_html, unsafe_allow_html=True)

def main():
    # Check if this is the first time initializing (services not cached yet)
    is_first_init = 'first_init_done' not in st.session_state
    
    # Create placeholder for splash screen
    splash_placeholder = st.empty()
    
    # Show splash screen only on first initialization
    if is_first_init:
        with splash_placeholder.container():
            show_splash_screen()
    
    # Initialize session state
    if 'show_add_product' not in st.session_state:
        st.session_state.show_add_product = False
    if 'show_add_customer' not in st.session_state:
        st.session_state.show_add_customer = False

    # Get services (cached, so fast on subsequent loads)
    services = init_services()
    
    # Mark first initialization as done
    if is_first_init:
        st.session_state.first_init_done = True
        splash_placeholder.empty()

    # Header
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("# 🏪 Hệ Thống Quản Lý Bán Hàng")
        st.markdown(f"**{Config.COMPANY_NAME}** | v{Config.APP_VERSION}")

    # Sidebar Navigation
    with st.sidebar:
        st.markdown("### 📋 MENU CHÍNH")
        page = st.radio(
            "Chọn chức năng:",
            ["🏠 Trang chủ", "📦 Sản phẩm", "📥 Nhập báo giá", "🔍 Tìm kiếm AI",
             "🧾 Hóa đơn", "👥 Khách hàng", "📊 Thống kê"],
            label_visibility="collapsed"
        )

    # Route to pages
    if page == "🏠 Trang chủ":
        show_home(services)
    elif page == "📦 Sản phẩm":
        show_products(services)
    elif page == "📥 Nhập báo giá":
        show_import(services)
    elif page == "🔍 Tìm kiếm AI":
        show_search(services)
    elif page == "🧾 Hóa đơn":
        show_invoices(services)
    elif page == "👥 Khách hàng":
        show_customers(services)
    elif page == "📊 Thống kê":
        show_stats(services)

def show_home(services):
    st.markdown("## 🏠 Trang Chủ")

    # Quick stats
    col1, col2, col3, col4 = st.columns(4)

    products = services['product_service'].get_all_products()
    customers = services['customer_service'].get_all_customers()
    invoices = services['invoice_service'].search_invoices()
    stats = services['invoice_service'].get_statistics()

    with col1:
        st.metric("📦 Sản phẩm", len(products))

    with col2:
        st.metric("👥 Khách hàng", len(customers))

    with col3:
        st.metric("🧾 Hóa đơn", len(invoices))

    with col4:
        st.metric("💰 Doanh thu", format_currency(stats['total_revenue']))

    st.markdown("---")

    # Recent invoices
    st.markdown("### 📋 Hóa Đơn Gần Đây")
    if invoices:
        recent = invoices[:5]
        df_data = []
        for inv in recent:
            df_data.append({
                "Số HĐ": inv.invoice_number,
                "Khách hàng": inv.customer_name or "N/A",
                "Tổng tiền": format_currency(inv.total),
                "Trạng thái": inv.status,
                "Ngày": format_date(inv.created_at, "%d/%m/%Y")
            })
        st.dataframe(pd.DataFrame(df_data), use_container_width=True)
    else:
        st.info("Chưa có hóa đơn nào")

    st.markdown("---")

    # Quick actions
    st.markdown("### ⚡ Hành Động Nhanh")
    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("➕ Thêm sản phẩm mới", use_container_width=True):
            add_product_dialog(services)

    with col2:
        if st.button("📥 Nhập báo giá", use_container_width=True):
            st.switch_page("pages/import.py")

    with col3:
        if st.button("➕ Tạo hóa đơn", use_container_width=True):
            st.info("Chức năng này sẽ được phát triển sớm")

@st.dialog("➕ Thêm Sản Phẩm Mới", width="large")
def add_product_dialog(services):
    """Modal dialog for adding new product"""
    with st.form("add_product_dialog_form", border=False):
        col1, col2 = st.columns(2)

        with col1:
            name = st.text_input("Tên sản phẩm *", placeholder="Ví dụ: Coca Cola")
            price = st.number_input("Giá (VNĐ) *", min_value=0.0, value=0.0)

        with col2:
            category = st.text_input("Danh mục", placeholder="Ví dụ: Đồ uống")
            unit = st.text_input("Đơn vị", value="cái")

        description = st.text_area("Mô tả", placeholder="Mô tả sản phẩm...")

        st.markdown("")  # Spacing
        col_save, col_cancel = st.columns(2)
        with col_save:
            save_button = st.form_submit_button("💾 Lưu sản phẩm", use_container_width=True, type="primary")
        with col_cancel:
            cancel_button = st.form_submit_button("❌ Hủy", use_container_width=True)

        if save_button:
            if name and price > 0:
                services['product_service'].create_product(
                    name=name,
                    price=price,
                    description=description if description else None,
                    category=category if category else None,
                    unit=unit
                )
                st.success("✅ Đã thêm sản phẩm mới!")
                st.rerun()
            else:
                st.error("❌ Vui lòng nhập tên và giá hợp lệ")

        if cancel_button:
            st.rerun()

@st.dialog("➕ Thêm Khách Hàng Mới", width="large")
def add_customer_dialog(services):
    """Modal dialog for adding new customer"""
    with st.form("add_customer_dialog_form", border=False):
        col1, col2 = st.columns(2)

        with col1:
            name = st.text_input("Tên khách hàng *", placeholder="Ví dụ: Nguyễn Văn A")
            phone = st.text_input("Số điện thoại", placeholder="Ví dụ: 0912345678")

        with col2:
            email = st.text_input("Email", placeholder="example@gmail.com")

        address = st.text_area("Địa chỉ", placeholder="Địa chỉ khách hàng")

        st.markdown("")  # Spacing
        col_save, col_cancel = st.columns(2)
        with col_save:
            save_button = st.form_submit_button("💾 Lưu khách hàng", use_container_width=True, type="primary")
        with col_cancel:
            cancel_button = st.form_submit_button("❌ Hủy", use_container_width=True)

        if save_button:
            if name:
                services['customer_service'].create_customer(
                    name=name,
                    phone=phone if phone else None,
                    email=email if email else None,
                    address=address if address else None
                )
                st.success("✅ Đã thêm khách hàng mới!")
                st.rerun()
            else:
                st.error("❌ Vui lòng nhập tên khách hàng")

        if cancel_button:
            st.rerun()

@st.dialog("✏️ Chỉnh Sửa Sản Phẩm", width="large")
def edit_product_dialog(product, services):
    """Modal dialog for editing product details"""
    with st.form("edit_product_form", border=False):
        col1, col2 = st.columns(2)

        with col1:
            name = st.text_input("Tên sản phẩm *", value=product.name, placeholder="Ví dụ: Coca Cola")
            price = st.number_input("Giá (VNĐ) *", min_value=0.0, value=float(product.price))

        with col2:
            category = st.text_input("Danh mục", value=product.category or "", placeholder="Ví dụ: Đồ uống")
            unit = st.text_input("Đơn vị", value=product.unit or "cái")

        description = st.text_area("Mô tả", value=product.description or "", placeholder="Mô tả sản phẩm...")

        st.markdown("")  # Spacing
        col_save, col_cancel = st.columns(2)
        with col_save:
            save_button = st.form_submit_button("💾 Lưu thay đổi", use_container_width=True, type="primary")
        with col_cancel:
            cancel_button = st.form_submit_button("❌ Hủy", use_container_width=True)

        if save_button:
            if name and price > 0:
                services['product_service'].update_product(
                    product_id=product.id,
                    name=name,
                    price=price,
                    description=description if description else None,
                    category=category if category else None,
                    unit=unit
                )
                st.success("✅ Đã cập nhật sản phẩm!")
                st.rerun()
            else:
                st.error("❌ Vui lòng nhập tên và giá hợp lệ")

        if cancel_button:
            st.rerun()

def show_products(services):
    # Header on its own line
    st.markdown("## 📦 Quản Lý Sản Phẩm")
    
    # Search box and Add button on same line
    col1, col2 = st.columns([5, 1])
    with col1:
        search_query, _ = instant_search(
            placeholder="Nhập tên sản phẩm...",
            key="product_search",
            label="🔍 Tìm kiếm sản phẩm"
        )
    with col2:
        if st.button("➕ Thêm mới", use_container_width=True, key="add_product_btn"):
            add_product_dialog(services)
    
    # Get products - search instantly
    if search_query:
        products = services['product_service'].search_products(query=search_query)
    else:
        products = services['product_service'].get_all_products()

    if not products:
        st.info("Chưa có sản phẩm nào" if not search_query else f"Không tìm thấy sản phẩm '{search_query}'")
    else:
        # Display products in grid with card layout
        for i in range(0, len(products), 3):
            cols = st.columns(3)
            for j, product in enumerate(products[i:i+3]):
                with cols[j]:
                    with st.container(border=True):
                        # Product name
                        st.markdown(f"### {product.name}")

                        # Product details
                        st.markdown(f"**Giá:** {format_currency(product.price)}")

                        if product.category:
                            st.caption(f"📁 {product.category}")

                        if product.unit:
                            st.caption(f"📦 Đơn vị: {product.unit}")

                        if product.description:
                            st.caption(f"📝 {product.description[:80]}{'...' if len(product.description) > 80 else ''}")

                        st.markdown("")  # Spacing

                        # Action buttons
                        col_edit, col_del = st.columns(2)
                        with col_edit:
                            if st.button("✏️ Sửa", key=f"edit_{product.id}", use_container_width=True):
                                edit_product_dialog(product, services)
                        with col_del:
                            if st.button("🗑️ Xóa", key=f"del_{product.id}", use_container_width=True):
                                services['product_service'].delete_product(product.id)
                                st.success("Đã xóa sản phẩm!")
                                st.rerun()

def show_import(services):
    st.markdown("## 📥 Nhập Bảng Báo Giá")

    st.info("""
    **Hướng dẫn:**
    1. Chọn file báo giá (ảnh, PDF, Excel, CSV)
    2. Hệ thống sẽ tự động đọc và phân tích
    3. Sản phẩm mới được thêm, giá cũ được cập nhật
    4. Xem kết quả chi tiết
    """)

    uploaded_file = st.file_uploader(
        "Chọn file báo giá",
        type=["jpg", "jpeg", "png", "pdf", "xlsx", "xls", "csv"]
    )

    if uploaded_file is not None:
        # Save uploaded file
        file_path = os.path.join(Config.TEMP_DIR, uploaded_file.name)
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())

        st.success(f"✅ Đã tải file: {uploaded_file.name}")

        if st.button("🚀 Bắt đầu nhập", use_container_width=True):
            with st.spinner("Đang xử lý file..."):
                if not services['ocr_service']:
                    st.error("❌ Google Vision API chưa được cấu hình. Chỉ hỗ trợ Excel/CSV.")

                    if uploaded_file.name.endswith(('.xlsx', '.xls', '.csv')):
                        try:
                            updated, added, errors = services['product_service'].import_from_file(
                                file_path,
                                services['ocr_service'],
                                update_existing=True,
                                add_new=True
                            )

                            col1, col2, col3 = st.columns(3)
                            with col1:
                                st.metric("✅ Cập nhật", updated)
                            with col2:
                                st.metric("➕ Thêm mới", added)
                            with col3:
                                st.metric("⚠️ Lỗi", len(errors))

                            if errors:
                                st.warning("Một số lỗi xảy ra:")
                                for error in errors[:5]:
                                    st.caption(f"- {error}")
                        except Exception as e:
                            st.error(f"❌ Lỗi: {str(e)}")
                else:
                    try:
                        updated, added, errors = services['product_service'].import_from_file(
                            file_path,
                            services['ocr_service'],
                            update_existing=True,
                            add_new=True
                        )

                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.metric("✅ Cập nhật", updated)
                        with col2:
                            st.metric("➕ Thêm mới", added)
                        with col3:
                            st.metric("⚠️ Lỗi", len(errors))

                        if errors:
                            st.warning("Một số lỗi xảy ra:")
                            for error in errors[:5]:
                                st.caption(f"- {error}")
                    except Exception as e:
                        st.error(f"❌ Lỗi: {str(e)}")

def show_search(services):
    st.markdown("## 🔍 Tìm Kiếm AI")

    st.markdown("### 📝 Tìm Theo Tên")
    search_text, _ = instant_search(  # Ignore is_searching
        placeholder="🔍 Nhập tên sản phẩm để tìm kiếm...",
        key="ai_search",
        label="Tìm kiếm sản phẩm"
    )

    if search_text:
        results = services['product_service'].search_products(query=search_text)

        if results:
            st.markdown(f"### ✅ Tìm thấy {len(results)} kết quả")
            for product in results:
                with st.container(border=True):
                    col1, col2 = st.columns([3, 1])
                    with col1:
                        st.markdown(f"**{product.name}**")
                        st.markdown(f"Giá: {format_currency(product.price)}")
                    with col2:
                        st.metric("", "✓")
        else:
            st.info(f"Không tìm thấy sản phẩm '{search_text}'")

    st.markdown("---")
    st.markdown("### 📷 Tìm Theo Hình Ảnh")

    if not services['image_search_service']:
        st.warning("⚠️ Tính năng tìm kiếm hình ảnh yêu cầu Google Vision API")
    else:
        uploaded_image = st.file_uploader("Chọn ảnh sản phẩm:", type=["jpg", "jpeg", "png"])

        if uploaded_image is not None:
            image = Image.open(uploaded_image)

            col1, col2 = st.columns(2)
            with col1:
                st.image(image, caption="Ảnh tìm kiếm", use_container_width=True)

            with col2:
                if st.button("🔍 Tìm kiếm tương tự", use_container_width=True):
                    with st.spinner("Đang tìm kiếm..."):
                        # Save image temporarily
                        img_path = os.path.join(Config.TEMP_DIR, "search_image.jpg")
                        image.save(img_path)

                        # Get all products with images
                        products = services['product_service'].get_all_products()
                        product_images = []
                        for p in products:
                            if p.images:
                                product_images.append((p.id, p.images[0]))

                        if product_images:
                            try:
                                results = services['image_search_service'].search_similar_products(
                                    img_path,
                                    product_images,
                                    top_k=5
                                )

                                if results:
                                    st.markdown("### 🎯 Kết Quả Tương Tự")
                                    for product_id, similarity in results:
                                        product = services['product_service'].get_product(product_id)
                                        if product:
                                            with st.container(border=True):
                                                col1, col2 = st.columns([3, 1])
                                                with col1:
                                                    st.markdown(f"**{product.name}**")
                                                    st.markdown(f"Giá: {format_currency(product.price)}")
                                                with col2:
                                                    st.metric("Độ tương đồng", f"{similarity*100:.0f}%")
                                else:
                                    st.info("Không tìm thấy sản phẩm tương tự")
                            except Exception as e:
                                st.error(f"Lỗi tìm kiếm: {e}")
                        else:
                            st.info("Chưa có sản phẩm nào có hình ảnh")

def show_invoices(services):
    st.markdown("## 🧾 Quản Lý Hóa Đơn")

    col1, col2 = st.columns([3, 1])
    with col2:
        status_filter = st.selectbox(
            "Lọc trạng thái:",
            ["Tất cả", "Chưa thanh toán", "Đã thanh toán", "Đã hủy"]
        )

    status_map = {
        "Tất cả": None,
        "Chưa thanh toán": "pending",
        "Đã thanh toán": "paid",
        "Đã hủy": "cancelled"
    }

    invoices = services['invoice_service'].search_invoices(status=status_map[status_filter])

    if not invoices:
        st.info("Chưa có hóa đơn nào")
    else:
        st.markdown(f"### 📋 Tổng: {len(invoices)} hóa đơn")

        for invoice in invoices:
            with st.container(border=True):
                col1, col2, col3, col4 = st.columns([2, 2, 1, 1])

                with col1:
                    st.markdown(f"**{invoice.invoice_number}**")
                    st.caption(format_date(invoice.created_at, "%d/%m/%Y %H:%M"))

                with col2:
                    st.markdown(f"👤 {invoice.customer_name or 'N/A'}")
                    st.markdown(f"💰 {format_currency(invoice.total)}")

                with col3:
                    status_color = {"pending": "🔴", "paid": "🟢", "cancelled": "⚫"}
                    st.markdown(f"{status_color.get(invoice.status, '⚪')} {invoice.status.upper()}")

                with col4:
                    col_pdf, col_excel, col_print = st.columns(3)
                    with col_pdf:
                        if st.button("PDF", key=f"pdf_{invoice.id}", use_container_width=True):
                            try:
                                pdf_path = services['invoice_service'].generate_pdf(invoice.id)
                                st.success(f"✅ PDF: {pdf_path}")
                            except Exception as e:
                                st.error(f"Lỗi: {e}")

                    with col_excel:
                        if st.button("XLS", key=f"xls_{invoice.id}", use_container_width=True):
                            try:
                                excel_path = services['invoice_service'].generate_excel(invoice.id)
                                st.success(f"✅ Excel: {excel_path}")
                            except Exception as e:
                                st.error(f"Lỗi: {e}")

def show_customers(services):
    st.markdown("## 👥 Quản Lý Khách Hàng")

    col1, col2 = st.columns([3, 1])
    with col1:
        search_customer, _ = instant_search(  # Ignore is_searching
            placeholder="🔍 Tìm kiếm khách hàng...",
            key="customer_search",
            label="Tìm kiếm khách hàng"
        )
    with col2:
        if st.button("➕ Thêm mới", use_container_width=True):
            add_customer_dialog(services)

    # Get customers - search instantly
    if search_customer:
        customers = services['customer_service'].search_customers(search_customer)
    else:
        customers = services['customer_service'].get_all_customers()

    if not customers:
        st.info("Chưa có khách hàng nào")
    else:
        st.markdown(f"### Tổng: {len(customers)} khách hàng")

        for customer in customers:
            with st.container(border=True):
                col1, col2, col3 = st.columns([2, 2, 1])

                with col1:
                    st.markdown(f"**{customer.name}**")
                    if customer.phone:
                        st.caption(f"📞 {customer.phone}")
                    if customer.email:
                        st.caption(f"📧 {customer.email}")

                with col2:
                    if customer.address:
                        st.caption(f"📍 {customer.address}")

                    stats = services['customer_service'].get_customer_stats(customer.id)
                    st.caption(f"💰 Tổng chi tiêu: {format_currency(stats['total_spent'])}")

                with col3:
                    col_edit, col_del = st.columns(2)
                    with col_edit:
                        if st.button("✏️", key=f"edit_cust_{customer.id}", use_container_width=True):
                            st.info("Chỉnh sửa sẽ được phát triển")
                    with col_del:
                        if st.button("🗑️", key=f"del_cust_{customer.id}", use_container_width=True):
                            services['customer_service'].delete_customer(customer.id)
                            st.success("Đã xóa khách hàng!")
                            st.rerun()

def show_stats(services):
    st.markdown("## 📊 Thống Kê & Báo Cáo")

    # Get statistics
    products = services['product_service'].get_all_products()
    customers = services['customer_service'].get_all_customers()
    stats = services['invoice_service'].get_statistics()

    # Main metrics
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("📦 Sản phẩm", len(products), delta=None)

    with col2:
        st.metric("👥 Khách hàng", len(customers), delta=None)

    with col3:
        st.metric("🧾 Hóa đơn", stats['total_invoices'], delta=None)

    with col4:
        st.metric("💰 Doanh thu", format_currency(stats['total_revenue']), delta=None)

    st.markdown("---")

    # Detailed stats
    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 💳 Trạng Thái Thanh Toán")
        payment_data = {
            "Đã thanh toán": stats['paid_invoices'],
            "Chưa thanh toán": stats['pending_invoices'],
            "Đã hủy": stats['cancelled_invoices']
        }
        st.bar_chart(payment_data)

    with col2:
        st.markdown("### 📈 Thông Số Chính")
        st.info(f"""
        **Đơn hàng trung bình:** {format_currency(stats['average_order_value'])}

        **Doanh thu chờ xử lý:** {format_currency(stats['pending_revenue'])}

        **Tỷ lệ hoàn thành:** {stats['paid_invoices']}/{stats['total_invoices']} ({int(stats['paid_invoices']/max(stats['total_invoices'], 1)*100)}%)
        """)

if __name__ == "__main__":
    main()
