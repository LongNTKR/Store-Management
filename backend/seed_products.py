"""
Script to seed 100 sample products into the database
Run: cd backend && python seed_products.py
"""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from database.db_manager import DatabaseManager
from database.models import Product
from config import Config
from datetime import datetime


def create_sample_products():
    """Create 100 diverse sample products"""

    # Product categories with Vietnamese names
    products_data = []

    # 1. Văn phòng phẩm (15 products)
    van_phong_pham = [
        ("Bút bi Thiên Long TL-079", 3000, "Cây", "Bút bi màu xanh, mực gel mượt mà", "Văn phòng phẩm", 200),
        ("Vở kẻ ngang 200 trang", 15000, "Quyển", "Vở học sinh kẻ ngang, giấy trắng", "Văn phòng phẩm", 150),
        ("Bút chì 2B Thiên Long", 2500, "Cây", "Bút chì gỗ 2B cho học sinh", "Văn phòng phẩm", 300),
        ("Tẩy trắng Thiên Long ER-04", 4000, "Cái", "Tẩy không để lại vết bẩn", "Văn phòng phẩm", 180),
        ("Thước kẻ nhựa 30cm", 5000, "Cái", "Thước kẻ trong suốt, có chia vạch chính xác", "Văn phòng phẩm", 120),
        ("Bộ com-pa 4 món", 35000, "Bộ", "Bộ dụng cụ học tập toán học", "Văn phòng phẩm", 80),
        ("Bìa còng 2 kẹp A4", 12000, "Cái", "Bìa nhựa đựng tài liệu", "Văn phòng phẩm", 100),
        ("Giấy A4 70gsm Double A", 85000, "Ream", "500 tờ giấy trắng chất lượng cao", "Văn phòng phẩm", 50),
        ("Kéo văn phòng inox", 18000, "Cái", "Kéo cắt giấy sắc bén", "Văn phòng phẩm", 90),
        ("Hồ dán UHU 40ml", 15000, "Chai", "Hồ dán đa năng không độc hại", "Văn phòng phẩm", 110),
        ("Băng keo trong 2.4cm", 8000, "Cuộn", "Băng dính trong suốt 50m", "Văn phòng phẩm", 140),
        ("Bấm kim số 10", 25000, "Cái", "Dập ghim văn phòng bền đẹp", "Văn phòng phẩm", 70),
        ("Hộp 1000 ghim số 10", 6000, "Hộp", "Ghim bấm tài liệu", "Văn phòng phẩm", 160),
        ("Bút dạ quang Stabilo", 12000, "Cây", "Bút highlight màu vàng", "Văn phòng phẩm", 130),
        ("Xóa bảng trắng BoardMarker", 10000, "Cây", "Bút viết bảng trắng, mực dễ xóa", "Văn phòng phẩm", 95),
    ]

    # 2. Đồ gia dụng (15 products)
    do_gia_dung = [
        ("Chén sứ trắng cao cấp", 25000, "Cái", "Chén ăn cơm sứ trắng", "Đồ gia dụng", 200),
        ("Bát tô sứ hoa văn", 35000, "Cái", "Bát ăn phở, bún size lớn", "Đồ gia dụng", 150),
        ("Dĩa sứ tròn 20cm", 28000, "Cái", "Dĩa ăn sứ trắng", "Đồ gia dụng", 180),
        ("Muỗng inox cao cấp", 8000, "Cái", "Muỗng ăn cơm inox 304", "Đồ gia dụng", 250),
        ("Đũa gỗ mun 25cm", 15000, "Đôi", "Đũa gỗ tự nhiên an toàn", "Đồ gia dụng", 140),
        ("Ly thủy tinh 350ml", 18000, "Cái", "Ly uống nước trong suốt", "Đồ gia dụng", 170),
        ("Bình nước thủy tinh 1.5L", 65000, "Cái", "Bình đựng nước có nắp", "Đồ gia dụng", 80),
        ("Thớt nhựa kháng khuẩn", 45000, "Cái", "Thớt cắt thực phẩm an toàn", "Đồ gia dụng", 90),
        ("Dao bếp inox 20cm", 55000, "Cái", "Dao thái thịt, rau củ sắc bén", "Đồ gia dụng", 75),
        ("Nồi inox 3 đáy 24cm", 350000, "Cái", "Nồi nấu cơm, canh cao cấp", "Đồ gia dụng", 45),
        ("Chảo chống dính 26cm", 280000, "Cái", "Chảo nhôm chống dính Teflon", "Đồ gia dụng", 60),
        ("Xoong inox có quai 18cm", 120000, "Cái", "Xoong nấu đa năng", "Đồ gia dụng", 70),
        ("Rổ inox tròn 30cm", 35000, "Cái", "Rổ rửa rau củ quả", "Đồ gia dụng", 100),
        ("Khăn lau bếp vải mềm", 12000, "Cái", "Khăn lau đa năng", "Đồ gia dụng", 200),
        ("Hộp nhựa đựng thực phẩm 1L", 25000, "Cái", "Hộp bảo quản an toàn", "Đồ gia dụng", 130),
    ]

    # 3. Mỹ phẩm (12 products)
    my_pham = [
        ("Sữa rửa mặt Senka 100g", 68000, "Tuýp", "Sữa rửa mặt tạo bọt trắng da", "Mỹ phẩm", 85),
        ("Kem dưỡng da Nivea 100ml", 95000, "Hộp", "Kem dưỡng ẩm ban đêm", "Mỹ phẩm", 70),
        ("Nước hoa hồng Hadalabo 170ml", 125000, "Chai", "Toner cân bằng độ pH", "Mỹ phẩm", 60),
        ("Son dưỡng môi Lipice 4g", 35000, "Thỏi", "Son dưỡng môi giữ ẩm", "Mỹ phẩm", 110),
        ("Kem chống nắng Anessa 60ml", 380000, "Tuýp", "Chống nắng SPF50+ PA++++", "Mỹ phẩm", 45),
        ("Sữa tắm Dove 530ml", 115000, "Chai", "Sữa tắm dưỡng ẩm hương hoa", "Mỹ phẩm", 90),
        ("Dầu gội Clear 630ml", 128000, "Chai", "Dầu gội sạch gàu", "Mỹ phẩm", 75),
        ("Dầu xả Sunsilk 320ml", 85000, "Chai", "Dầu xả mềm mượt tóc", "Mỹ phẩm", 80),
        ("Mặt nạ giấy Mediheal", 25000, "Miếng", "Mặt nạ dưỡng da cấp ẩm", "Mỹ phẩm", 150),
        ("Nước tẩy trang Bioderma 100ml", 145000, "Chai", "Nước tẩy trang nhẹ dịu", "Mỹ phẩm", 55),
        ("Kem đánh răng PS 200g", 32000, "Tuýp", "Kem đánh răng bảo vệ nướu", "Mỹ phẩm", 140),
        ("Bàn chải đánh răng Oral-B", 28000, "Cái", "Bàn chải lông mềm", "Mỹ phẩm", 120),
    ]

    # 4. Thực phẩm (13 products)
    thuc_pham = [
        ("Gạo ST25 túi 5kg", 185000, "Túi", "Gạo thơm ngon chất lượng cao", "Thực phẩm", 50),
        ("Dầu ăn Simply 1L", 48000, "Chai", "Dầu ăn từ đậu nành", "Thực phẩm", 80),
        ("Nước mắm Nam Ngư 650ml", 35000, "Chai", "Nước mắm truyền thống", "Thực phẩm", 100),
        ("Mì gói Hao Hao tôm chua cay", 3000, "Gói", "Mì ăn liền hương vị Việt", "Thực phẩm", 300),
        ("Trứng gà tươi", 35000, "Vỉ 10", "Trứng gà sạch an toàn", "Thực phẩm", 70),
        ("Sữa tươi Vinamilk hộp 1L", 38000, "Hộp", "Sữa tươi tiệt trùng", "Thực phẩm", 90),
        ("Đường trắng Biên Hòa 1kg", 22000, "Gói", "Đường tinh luyện cao cấp", "Thực phẩm", 110),
        ("Muối i-ốt 500g", 8000, "Gói", "Muối ăn bổ sung i-ốt", "Thực phẩm", 150),
        ("Bột ngọt Ajinomoto 400g", 28000, "Gói", "Bột ngọt từ mía", "Thực phẩm", 95),
        ("Nước tương Chinsu 500ml", 18000, "Chai", "Nước tương đậm đặc", "Thực phẩm", 120),
        ("Tương ớt Cholimex 270g", 15000, "Chai", "Tương ớt cay đậm đà", "Thực phẩm", 140),
        ("Bánh quy Cosy 378g", 45000, "Hộp", "Bánh quy bơ giòn tan", "Thực phẩm", 85),
        ("Snack khoai tây Lays 56g", 12000, "Gói", "Snack vị tự nhiên", "Thực phẩm", 200),
    ]

    # 5. Đồ chơi (10 products)
    do_choi = [
        ("Búp bê Barbie cơ bản", 180000, "Cái", "Búp bê thời trang cho bé gái", "Đồ chơi", 40),
        ("Xe ô tô mô hình 1:64", 35000, "Cái", "Xe mô hình Hot Wheels", "Đồ chơi", 120),
        ("Lego Classic 300 chi tiết", 450000, "Hộp", "Bộ xếp hình sáng tạo", "Đồ chơi", 30),
        ("Rubik 3x3 cao cấp", 65000, "Cái", "Rubik xoay mượt, tốc độ cao", "Đồ chơi", 75),
        ("Bóng đá size 5", 150000, "Quả", "Bóng đá thi đấu chuyên nghiệp", "Đồ chơi", 50),
        ("Cầu lông Yonex Mavis", 45000, "Quả", "Cầu lông nhựa bền", "Đồ chơi", 100),
        ("Bộ cờ vua gỗ cao cấp", 280000, "Bộ", "Cờ vua gỗ có bàn", "Đồ chơi", 25),
        ("Tranh xếp hình 1000 mảnh", 120000, "Hộp", "Puzzle phong cảnh đẹp", "Đồ chơi", 35),
        ("Búp bê Teddy bear 40cm", 195000, "Cái", "Gấu bông mềm mại dễ thương", "Đồ chơi", 45),
        ("Slime ma thuật 100g", 25000, "Hộp", "Chất nhờn ma thuật an toàn", "Đồ chơi", 150),
    ]

    # 6. Điện tử & phụ kiện (12 products)
    dien_tu = [
        ("Cáp sạc iPhone Lightning 1m", 85000, "Sợi", "Cáp sạc chính hãng MFi", "Điện tử", 100),
        ("Cáp sạc Type-C 1.5m", 45000, "Sợi", "Cáp sạc nhanh 3A", "Điện tử", 120),
        ("Tai nghe Bluetooth TWS", 280000, "Cái", "Tai nghe không dây true wireless", "Điện tử", 60),
        ("Sạc dự phòng 10000mAh", 350000, "Cái", "Pin sạc dự phòng 2 cổng", "Điện tử", 50),
        ("Chuột không dây Logitech", 180000, "Cái", "Chuột wireless tĩnh âm", "Điện tử", 75),
        ("Bàn phím cơ Gaming RGB", 650000, "Cái", "Bàn phím cơ học LED đa màu", "Điện tử", 35),
        ("Webcam HD 720p", 420000, "Cái", "Webcam học online, làm việc", "Điện tử", 45),
        ("USB 3.0 32GB SanDisk", 135000, "Cái", "USB tốc độ cao", "Điện tử", 90),
        ("Thẻ nhớ microSD 64GB", 185000, "Cái", "Thẻ nhớ Class 10 U3", "Điện tử", 70),
        ("Hub USB 4 cổng 3.0", 125000, "Cái", "Bộ chia USB tốc độ cao", "Điện tử", 55),
        ("Giá đỡ điện thoại để bàn", 45000, "Cái", "Giá đỡ điều chỉnh góc độ", "Điện tử", 110),
        ("Ốp lưng iPhone 13 silicon", 65000, "Cái", "Ốp lưng mềm chống sốc", "Điện tử", 85),
    ]

    # 7. Quần áo & thời trang (12 products)
    quan_ao = [
        ("Áo thun nam basic trơn", 89000, "Cái", "Áo thun cotton 100% form rộng", "Quần áo", 150),
        ("Áo polo nữ cổ bẻ", 125000, "Cái", "Áo polo thể thao năng động", "Quần áo", 100),
        ("Quần jean nam skinny", 285000, "Cái", "Quần jean co giãn ôm dáng", "Quần áo", 80),
        ("Váy nữ dáng xòe", 195000, "Cái", "Váy midi hoa nhí dễ thương", "Quần áo", 70),
        ("Áo sơ mi nam dài tay", 165000, "Cái", "Áo sơ mi công sở lịch sự", "Quần áo", 90),
        ("Quần short thể thao", 95000, "Cái", "Quần short tập gym, chạy bộ", "Quần áo", 120),
        ("Đầm nữ công sở", 320000, "Cái", "Đầm suông thanh lịch", "Quần áo", 55),
        ("Áo khoác hoodie unisex", 245000, "Cái", "Áo hoodie nỉ ngoại ấm áp", "Quần áo", 75),
        ("Quần tây nam ống đứng", 295000, "Cái", "Quần âu công sở sang trọng", "Quần áo", 65),
        ("Áo ba lỗ nam thể thao", 55000, "Cái", "Áo tập gym thoáng mát", "Quần áo", 140),
        ("Tất/vớ nam cổ ngắn", 15000, "Đôi", "Vớ cotton khử mùi", "Quần áo", 200),
        ("Khăn choàng cổ nữ", 75000, "Cái", "Khăn lụa họa tiết thời trang", "Quần áo", 85),
    ]

    # 8. Sách & văn học (11 products)
    sach = [
        ("Đắc Nhân Tâm - Dale Carnegie", 68000, "Quyển", "Sách kỹ năng sống kinh điển", "Sách", 120),
        ("Nhà Giả Kim - Paulo Coelho", 58000, "Quyển", "Tiểu thuyết triết lý nổi tiếng", "Sách", 95),
        ("Tuổi Trẻ Đáng Giá Bao Nhiêu", 75000, "Quyển", "Sách động lực cho giới trẻ", "Sách", 110),
        ("Sapiens - Lược Sử Loài Người", 185000, "Quyển", "Sách lịch sử nhân loại", "Sách", 70),
        ("Atomic Habits - James Clear", 125000, "Quyển", "Sách xây dựng thói quen tốt", "Sách", 85),
        ("Chiến Tranh Tiền Tệ", 195000, "Quyển", "Sách về kinh tế tài chính", "Sách", 60),
        ("Cà Phê Cùng Tony", 88000, "Quyển", "Sách khởi nghiệp kinh doanh", "Sách", 90),
        ("999 Lá Thư Gửi Cho Chính Mình", 98000, "Quyển", "Sách tâm lý trị liệu", "Sách", 100),
        ("Hoàng Tử Bé", 45000, "Quyển", "Truyện thiếu nhi kinh điển", "Sách", 150),
        ("English Grammar in Use", 285000, "Quyển", "Sách học ngữ pháp tiếng Anh", "Sách", 75),
        ("Đời Ngắn Đừng Ngủ Dài", 65000, "Quyển", "Sách tư duy tích cực", "Sách", 105),
    ]

    # Combine all products
    products_data.extend(van_phong_pham)
    products_data.extend(do_gia_dung)
    products_data.extend(my_pham)
    products_data.extend(thuc_pham)
    products_data.extend(do_choi)
    products_data.extend(dien_tu)
    products_data.extend(quan_ao)
    products_data.extend(sach)

    return products_data


def seed_database():
    """Seed the database with sample products"""
    print("Starting database seeding...")

    # Initialize database
    db_manager = DatabaseManager(Config.DATABASE_PATH)
    session = db_manager.get_session()

    try:
        # Get sample products
        products_data = create_sample_products()

        # Check existing products count
        existing_count = session.query(Product).count()
        print(f"Current products in database: {existing_count}")

        # Insert products
        added_count = 0
        updated_count = 0

        for name, price, unit, description, category, stock in products_data:
            # Check if product already exists
            existing_product = session.query(Product).filter(Product.name == name).first()

            if existing_product:
                # Update existing product
                existing_product.price = price
                existing_product.unit = unit
                existing_product.description = description
                existing_product.category = category
                existing_product.stock_quantity = stock
                existing_product.updated_at = datetime.now()
                updated_count += 1
                print(f"Updated: {name}")
            else:
                # Create new product
                product = Product(
                    name=name,
                    price=price,
                    unit=unit,
                    description=description,
                    category=category,
                    stock_quantity=stock,
                    is_active=True
                )
                session.add(product)
                added_count += 1
                print(f"Added: {name}")

        # Commit changes
        session.commit()

        # Final count
        total_count = session.query(Product).count()

        print("\n" + "="*60)
        print("✅ Database seeding completed successfully!")
        print(f"📊 Statistics:")
        print(f"   - Products added: {added_count}")
        print(f"   - Products updated: {updated_count}")
        print(f"   - Total products in database: {total_count}")
        print("="*60)

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error during seeding: {str(e)}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
