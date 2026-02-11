import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.posts import router as posts_router
from routes.friends import router as friends_router
from routes.videos import router as videos_router
from routes.upload import router as upload_router

app = FastAPI(title="MindRise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
import sys

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    
    try:
        print(f"Global Exception: {exc}")
        traceback.print_exc()
    except:
        pass

    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": traceback.format_exc(),
            "message": "A server error occurred."
        }
    )

# Force /api prefix for consistency with frontend relative paths
prefix = "/api"

if os.getenv("VERCEL"):
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_DIR):
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
    except:
        pass # Ignore if cannot create

if os.path.exists(UPLOAD_DIR):
    app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

app.include_router(auth_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)
app.include_router(posts_router, prefix=prefix)
app.include_router(upload_router, prefix=prefix)
app.include_router(friends_router, prefix=prefix)
app.include_router(videos_router, prefix=prefix)


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
    return {"message": "MindRise API", "docs": "/docs", "prefix": prefix}

@app.get("/debug-prefix")
def debug_prefix():
    return {"prefix": prefix, "source": "api/main.py"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
