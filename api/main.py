"""FastAPI app with MongoDB. Run: uvicorn main:app --reload"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router

app = FastAPI(title="MindRise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
prefix = "/api" if os.getenv("VERCEL") else ""

app.include_router(auth_router, prefix=prefix)


@app.get(prefix + "/")
def root():
    return {"message": "MindRise API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
