"""FastAPI app with MongoDB. Run: uvicorn main:app --reload"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.posts import router as posts_router

app = FastAPI(title="MindRise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from routes.upload import router as upload_router, UPLOAD_DIR
import os

prefix = "/api" if os.getenv("VERCEL") else ""

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

app.include_router(auth_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)
app.include_router(posts_router, prefix=prefix)
app.include_router(upload_router, prefix=prefix)


@app.get(prefix + "/health")
def health():
    try:
        from database import get_db
        db = get_db()
        # Ping the database to check connection
        db.command("ping")
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc() if os.getenv("VERCEL") else None
        }


@app.on_event("startup")
async def startup_event():
    print("Routes:")
    for route in app.routes:
        print(f"{route.path} -> {route.name}")

@app.get(prefix + "/")
def root():
    return {"message": "MindRise API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
