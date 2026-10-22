import logging
from sqlalchemy import inspect, text
from app.core.database import engine, Base

logger = logging.getLogger(__name__)

def ensure_database_schema(target_engine=None):
    """
    Tự động kiểm tra và cập nhật schema cơ sở dữ liệu khi ứng dụng khởi chạy.
    Đảm bảo tương thích ngược và tự động bổ sung các cột còn thiếu (như SePay columns trong bảng payments).
    Hàm này có tính idempotent - chạy nhiều lần an toàn tuyệt đối.
    """
    db_engine = target_engine or engine

    try:
        # 1. Tạo các bảng chưa tồn tại (nếu có bảng mới hoàn toàn)
        Base.metadata.create_all(bind=db_engine)

        inspector = inspect(db_engine)
        table_names = inspector.get_table_names()

        # 2. Xử lý bổ sung các cột thiếu cho bảng `payments`
        if "payments" in table_names:
            columns = {col["name"] for col in inspector.get_columns("payments")}
            indexes = {idx["name"] for idx in inspector.get_indexes("payments")}
            dialect = db_engine.dialect.name.lower()

            with db_engine.begin() as conn:
                # payment_code
                if "payment_code" not in columns:
                    logger.info("Migrating schema: Adding column 'payment_code' to 'payments'")
                    conn.execute(text("ALTER TABLE payments ADD COLUMN payment_code VARCHAR(50) NULL"))
                    columns.add("payment_code")

                # Index cho payment_code
                if "payment_code" in columns and "idx_payments_payment_code" not in indexes and "uq_payments_payment_code" not in indexes:
                    try:
                        conn.execute(text("CREATE UNIQUE INDEX idx_payments_payment_code ON payments (payment_code)"))
                        indexes.add("idx_payments_payment_code")
                    except Exception as e:
                        logger.warning(f"Note: unique index on payment_code: {e}")

                # sepay_transaction_id
                if "sepay_transaction_id" not in columns:
                    logger.info("Migrating schema: Adding column 'sepay_transaction_id' to 'payments'")
                    conn.execute(text("ALTER TABLE payments ADD COLUMN sepay_transaction_id VARCHAR(100) NULL"))
                    columns.add("sepay_transaction_id")

                # Index cho sepay_transaction_id
                if "sepay_transaction_id" in columns and "idx_payments_sepay_txn" not in indexes and "uq_payments_sepay_txn" not in indexes:
                    try:
                        conn.execute(text("CREATE UNIQUE INDEX idx_payments_sepay_txn ON payments (sepay_transaction_id)"))
                        indexes.add("idx_payments_sepay_txn")
                    except Exception as e:
                        logger.warning(f"Note: unique index on sepay_transaction_id: {e}")

                # raw_payload
                if "raw_payload" not in columns:
                    logger.info("Migrating schema: Adding column 'raw_payload' to 'payments'")
                    col_type = "JSON" if "sqlite" not in dialect else "TEXT"
                    conn.execute(text(f"ALTER TABLE payments ADD COLUMN raw_payload {col_type} NULL"))
                    columns.add("raw_payload")

                # notes
                if "notes" not in columns:
                    logger.info("Migrating schema: Adding column 'notes' to 'payments'")
                    conn.execute(text("ALTER TABLE payments ADD COLUMN notes VARCHAR(500) NULL"))
                    columns.add("notes")

                # Cập nhật ENUM status nếu là MySQL / MariaDB / TiDB
                if "mysql" in dialect or "mariadb" in dialect:
                    try:
                        conn.execute(text(
                            "ALTER TABLE payments MODIFY COLUMN status ENUM('PENDING','SUCCESS','FAILED','REVIEW_REQUIRED') NOT NULL DEFAULT 'PENDING'"
                        ))
                    except Exception as e:
                        logger.warning(f"Note: modifying status enum: {e}")

        # 3. Đồng bộ giá vé tuyến số 6 (TP.HCM -> Hà Nội) về 10.000đ nếu còn ở mức cũ 1.000.000đ
        if "routes" in table_names:
            try:
                with db_engine.begin() as conn:
                    conn.execute(text("UPDATE routes SET base_price = 10000.00 WHERE id = 6 AND base_price = 1000000.00"))
            except Exception as e:
                logger.warning(f"Note: route 6 price sync: {e}")

        logger.info("Database schema verification and auto-migration finished successfully.")
        return True
    except Exception as e:
        logger.error(f"Error during ensure_database_schema: {e}")
        return False

if __name__ == "__main__":
    import argparse
    from sqlalchemy import create_engine

    parser = argparse.ArgumentParser(description="Run auto-migration on database")
    parser.add_argument("--url", help="Database connection URL", default=None)
    args = parser.parse_args()

    if args.url:
        db_url = args.url
        if db_url.startswith("mysql://"):
            db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
        connect_args = {}
        if any(h in db_url.lower() for h in ["tidbcloud.com", "aivencloud.com"]):
            connect_args["ssl"] = {}
        target_engine = create_engine(db_url, connect_args=connect_args)
        print(f"Connecting to database and running migration...")
        success = ensure_database_schema(target_engine)
    else:
        print("Running migration on default database...")
        success = ensure_database_schema()

    if success:
        print("[SUCCESS] Migration completed successfully!")
    else:
        print("[ERROR] Migration encountered errors, please check the log above.")
