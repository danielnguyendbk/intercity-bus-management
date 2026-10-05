import sys
sys.stdout.reconfigure(encoding="utf-8")
import re
from sqlalchemy import text
from app.core.database import SessionLocal

def try_fix_str(s: str) -> str:
    if not s or not isinstance(s, str):
        return s
    # Only try fixing if it contains characters outside standard ASCII / common punctuation
    # or specific cp437 mojibake markers
    mojibake_chars = set("├áß╗─º╡╖╞░▒▓ªº¿⌐¬½¼¡«»│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσμτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■")
    if not any(c in mojibake_chars for c in s):
        return s

    try:
        raw = s.encode("cp437")
        decoded = raw.decode("utf-8")
        if decoded != s:
            return decoded
    except Exception:
        pass
    
    # Try partial / regex-based fix if string has a mix of clean and corrupted
    # (e.g., in tickets: "V─ân ph├▓ng xe Bß║┐n Th├ánh - Sß╗æ 5 ─É╞░ß╗¥ng L├¬ Th├ính Ho├án, Quß║¡n 1, TP.HCM")
    try:
        # If it failed because of some characters that can't encode to cp437,
        # replace chunk by chunk:
        def replace_chunk(match):
            m = match.group(0)
            try:
                return m.encode("cp437").decode("utf-8")
            except Exception:
                return m
        fixed = re.sub(r'[\u0080-\uFFFF]+', replace_chunk, s)
        if fixed != s:
            return fixed
    except Exception:
        pass

    return s

def fix_database():
    print("=== FIXING DATABASE ENCODING ===")
    db = SessionLocal()
    tables_to_check = [
        ("employees", ["full_name", "hometown"]),
        ("routes", ["origin", "destination"]),
        ("feedbacks", ["subject", "content"]),
        ("feedback_replies", ["content"]),
        ("passengers", ["full_name"]),
        ("tickets", ["pickup_point", "dropoff_point"]),
    ]

    total_updated = 0
    for table_name, columns in tables_to_check:
        cols_query = ", ".join(["id"] + columns)
        rows = db.execute(text(f"SELECT {cols_query} FROM {table_name}")).fetchall()
        for row in rows:
            mapping = dict(row._mapping)
            row_id = mapping["id"]
            updates = {}
            for col in columns:
                val = mapping.get(col)
                if val:
                    fixed = try_fix_str(val)
                    if fixed != val:
                        updates[col] = fixed
            
            if updates:
                set_clause = ", ".join([f"`{col}` = :{col}" for col in updates.keys()])
                params = {"row_id": row_id, **updates}
                db.execute(text(f"UPDATE `{table_name}` SET {set_clause} WHERE id = :row_id"), params)
                total_updated += 1
                for col, new_val in updates.items():
                    print(f"[{table_name} id={row_id}] {col}: {mapping[col]} -> {new_val}")

    db.commit()
    db.close()
    print(f"=== Database update complete. {total_updated} rows updated. ===\n")

def fix_data_dump():
    print("=== FIXING DATA_DUMP.SQL ===")
    file_path = "../data_dump.sql"
    raw_bytes = None
    try:
        with open(file_path, "rb") as f:
            raw_bytes = f.read()
    except FileNotFoundError:
        file_path = "data_dump.sql"
        with open(file_path, "rb") as f:
            raw_bytes = f.read()

    # Detect encoding
    if raw_bytes.startswith(b"\xff\xfe"):
        content = raw_bytes.decode("utf-16-le")
    elif raw_bytes.startswith(b"\xfe\xff"):
        content = raw_bytes.decode("utf-16-be")
    elif raw_bytes.startswith(b"\xef\xbb\xbf"):
        content = raw_bytes[3:].decode("utf-8")
    else:
        try:
            content = raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = raw_bytes.decode("latin1")

    def fix_sql_line(line):
        if not any(c in line for c in "├áß╗─º╡╖╞░▒▓"):
            return line
        
        # Match string literals in SQL: '...'
        def fix_token(match):
            token = match.group(1)
            fixed = try_fix_str(token)
            # escape backslashes and single quotes if any
            return f"'{fixed}'"

        return re.sub(r"'([^']*)'", fix_token, line)

    lines = content.splitlines(keepends=True)
    new_lines = [fix_sql_line(l) for l in lines]
    fixed_content = "".join(new_lines)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(fixed_content)

    print("=== DATA_DUMP.SQL successfully fixed and saved with clean UTF-8! ===\n")

if __name__ == "__main__":
    fix_database()
    fix_data_dump()
