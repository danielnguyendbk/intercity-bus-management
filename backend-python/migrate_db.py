"""
Script di chuyển / cập nhật schema cơ sở dữ liệu lên phiên bản mới nhất.
Có thể chạy trực tiếp từ máy tính để cập nhật database trên Render/TiDB Cloud.

Cách dùng:
    python migrate_db.py
    hoặc:
    python migrate_db.py --url "mysql+pymysql://<user>:<pass>@<host>:4000/<dbname>"
"""
import sys
import os
import argparse

sys.stdout.reconfigure(encoding="utf-8")

# Thêm đường dẫn backend-python vào sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from app.core.config import settings
from app.core.migrations import ensure_database_schema

def run_migration(db_url: str = None):
    if not db_url:
        db_url = settings.DATABASE_URL

    if db_url.startswith("mysql://"):
        db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

    connect_args = {}
    if any(h in db_url.lower() for h in ["tidbcloud.com", "aivencloud.com"]):
        connect_args["ssl"] = {}

    print(f"🚀 Kết nối tới Database...")
    masked_url = db_url
    if "@" in masked_url:
        prefix, rest = masked_url.split("@", 1)
        scheme = prefix.split(":")[0]
        masked_url = f"{scheme}://***:***@{rest}"
    print(f"📦 Mục tiêu: {masked_url}")

    engine = create_engine(db_url, connect_args=connect_args)
    success = ensure_database_schema(engine)

    if success:
        print("✅ Đã cập nhật cấu trúc cơ sở dữ liệu thành công!")
    else:
        print("❌ Cập nhật thất bại, vui lòng kiểm tra thông báo lỗi ở trên.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Chạy cập nhật schema cho cơ sở dữ liệu")
    parser.add_argument("--url", help="Chuỗi kết nối database (DATABASE_URL)", default=None)
    args = parser.parse_args()

    run_migration(args.url)
