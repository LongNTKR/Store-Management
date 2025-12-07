import sys
import os
import random
from datetime import datetime

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

from database.db_manager import get_db_manager
from database.models import Product, Unit
try:
    from unidecode import unidecode
except ImportError:
    # Fallback if unidecode not installed, though it should be
    def unidecode(s):
        return s

def create_products():
    print("Initializing database connection...")
    db_path = os.path.join(backend_dir, "data", "store_management.db")
    print(f"Database path: {db_path}")
    db_manager = get_db_manager(db_path)
    session = db_manager.get_session()
    
    try:
        # Get units
        units = session.query(Unit).all()
        if not units:
            print("No units found. Seeding default units...")
            # Seed default units
            now = datetime.now()
            default_units = [
                # Integer units
                ('cai', 'Cái', False, 1.0, True),
                ('chiec', 'Chiếc', False, 1.0, True),
                ('hop', 'Hộp', False, 1.0, True),
                ('tui', 'Túi', False, 1.0, True),
                ('goi', 'Gói', False, 1.0, True),
                ('lon', 'Lon', False, 1.0, True),
                ('chai', 'Chai', False, 1.0, True),
                ('bo', 'Bộ', False, 1.0, True),
                ('thung', 'Thùng', False, 1.0, True),
                ('tap', 'Tập', False, 1.0, True),
                # Decimal units
                ('kg', 'Kilogram (kg)', True, 0.1, True),
                ('g', 'Gram (g)', True, 1.0, True),
                ('met', 'Mét (m)', True, 0.1, True),
            ]
            
            new_units = []
            for name, display_name, allows_decimal, step_size, is_system in default_units:
                unit = Unit(
                    name=name,
                    display_name=display_name,
                    allows_decimal=allows_decimal,
                    step_size=step_size,
                    is_active=True,
                    is_system=is_system,
                    created_at=now,
                    updated_at=now
                )
                new_units.append(unit)
            
            session.add_all(new_units)
            session.commit()
            print(f"Seeded {len(new_units)} units.")
            units = session.query(Unit).all()

        unit_map = {u.name: u.id for u in units}
        # Fallback to 'cai' if specific units don't exist, or first available
        default_unit_id = unit_map.get('cai') or units[0].id

        categories = [
            "Điện tử", "Gia dụng", "Văn phòng phẩm", "Thực phẩm", 
            "Thời trang", "Mỹ phẩm", "Đồ chơi", "Nội thất"
        ]
        
        adjectives = [
            "Cao cấp", "Giá rẻ", "Chính hãng", "Nhập khẩu", "Siêu bền", 
            "Thông minh", "Mini", "Khổng lồ", "Đa năng", "Tiết kiệm điện",
            "Mới nhất", "Bán chạy", "Limited", "Premium", "Quyến rũ"
        ]
        
        products_data = {
            "Điện tử": ["Điện thoại", "Laptop", "Tai nghe", "Sạc dự phòng", "Chuột không dây", "Bàn phím cơ", "Loa Bluetooth", "Màn hình", "Camera", "Micro"],
            "Gia dụng": ["Nồi cơm điện", "Máy xay sinh tố", "Ấm siêu tốc", "Bàn là", "Quạt điện", "Đèn LED", "Ổ cắm điện", "Máy lọc nước", "Máy hút bụi", "Lò vi sóng"],
            "Văn phòng phẩm": ["Bút bi", "Sổ tay", "Giấy A4", "Kẹp ghim", "Bút nhớ", "Băng dính", "Kéo", "Dao rọc giấy", "Hồ dán", "Bìa hồ sơ"],
            "Thực phẩm": ["Mì tôm", "Gạo ST25", "Nước mắm", "Dầu ăn", "Bánh quy", "Kẹo dẻo", "Nước ngọt", "Cà phê", "Trà", "Sữa tươi"],
            "Thời trang": ["Áo thun", "Quần Jean", "Giày Sneaker", "Tất cổ ngắn", "Mũ lưỡi trai", "Kính râm", "Thắt lưng", "Ví da", "Đồng hồ", "Balo"],
            "Mỹ phẩm": ["Son môi", "Kem chống nắng", "Sữa rửa mặt", "Nước hoa hồng", "Dầu gội đầu", "Sữa tắm", "Mặt nạ", "Kem dưỡng ẩm", "Serum", "Tẩy trang"],
            "Nội thất": ["Ghế xoay", "Bàn làm việc", "Kệ sách", "Tủ quần áo", "Sofa", "Đèn ngủ", "Thảm trải sàn", "Gương đứng", "Khung tranh", "Đồng hồ treo tường"],
             "Đồ chơi": ["Lego", "Búp bê", "Xe điều khiển", "Rubik", "Cờ vua", "Gấu bông", "Bộ lắp ráp"]
        }

        new_products = []
        
        print("Generating 100 products...")
        for i in range(100):
            category = random.choice(categories)
            base_name_list = products_data.get(category, ["Sản phẩm"])
            base_name = random.choice(base_name_list)
            adj = random.choice(adjectives)
            
            # Create a unique-ish name
            name = f"{base_name} {adj} {random.randint(100, 999)}"
            
            # Prices
            import_price = round(random.uniform(10000, 5000000), -3) # Round to thousands
            if import_price == 0: import_price = 10000
            
            margin = random.uniform(1.1, 1.5)
            price = round(import_price * margin, -3)
            
            # Unit
            # Try to match unit to category roughly
            unit_id = default_unit_id
            if category == "Thực phẩm":
                unit_id = unit_map.get('goi') or unit_map.get('hop') or unit_map.get('chai') or default_unit_id
            elif category == "Gia dụng":
                unit_id = unit_map.get('cai') or unit_map.get('chiec') or default_unit_id
            elif category == "Văn phòng phẩm":
                 unit_id = unit_map.get('cai') or unit_map.get('chiec') or unit_map.get('hop') or default_unit_id
            
            # Normalized name for search
            normalized_name = unidecode(name).lower()

            product = Product(
                name=name,
                normalized_name=normalized_name,
                price=price,
                import_price=import_price,
                description=f"Mô tả cho sản phẩm {name}. Sản phẩm thuộc danh mục {category}, chất lượng {adj.lower()}. Bảo hành chính hãng.",
                category=category,
                unit_id=unit_id,
                stock_quantity=random.randint(0, 500),
                image_paths="", # Empty for now
                is_active=True,
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            new_products.append(product)

        session.add_all(new_products)
        session.commit()
        print(f"Successfully added {len(new_products)} products.")
        
    except Exception as e:
        print(f"Error during execution: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    create_products()
