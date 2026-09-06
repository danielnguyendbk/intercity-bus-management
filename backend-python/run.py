import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    print(f"🚀 Starting Xe Khach FastAPI Server on port {port}...")
    print(f"📖 Swagger UI Docs: http://localhost:{port}/docs")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
