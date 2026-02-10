from fastapi import APIRouter, HTTPException
from database import get_db
from models import UserResponse
from typing import List

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[UserResponse])
def get_all_users():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established.")
    
    users_coll = db.users
    all_users = []
    for user in users_coll.find():
        all_users.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user.get("full_name") or None
        ))
    return all_users

@router.get("/stats")
def get_stats():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established.")
    
    user_count = db.users.count_documents({})
    return {
        "total_users": user_count,
        "pending_moderation": 0
    }
