from fastapi import APIRouter, HTTPException
from typing import List
from bson import ObjectId
from pydantic import BaseModel
from database import get_db, get_client
from models import UserResponse, PostResponse, VideoResponse
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

# Also create a flat router for specific user requested paths like /api/approve-video
flat_router = APIRouter(tags=["admin_flat"])

class PostStatusUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None

@router.get("/users", response_model=List[UserResponse])
def get_all_users(role: str | None = None):
    if role != "admin":
         raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established.")
    
    users_coll = db.users
    all_users = []
    for user in users_coll.find():
        all_users.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user.get("full_name") or None,
            role=user.get("role", "user"),
            is_verified=user.get("is_verified", False),
            profile_pic=user.get("profile_pic")
        ))
    return all_users

@router.get("/stats")
def get_stats(role: str):
    if role != "admin":
         raise HTTPException(status_code=403, detail="Admin access required")
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established.")
    
    user_count = db.users.count_documents({})
    email_users = db.users.count_documents({"email": {"$ne": None}})
    mobile_users = db.users.count_documents({"mobile": {"$ne": None}})
    
    pending_posts = db.pending_posts.count_documents({"status": "pending"})
    
    # Count pending videos from MindRiseDB
    client = get_client()
    db_videos = client["MindRiseDB"]
    pending_videos = db_videos.user_videos.count_documents({"status": {"$in": ["pending", "Pending"]}})
    
    return {
        "total_users": user_count,
        "email_users": email_users,
        "mobile_users": mobile_users,
        "pending_moderation": pending_posts + pending_videos
    }

@router.get("/posts", response_model=List[PostResponse])
def get_posts(role: str, status: str = "all"):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    posts_cursor = []
    if status == "approved":
        posts_cursor = db.posts.find().sort("created_at", -1)
    elif status == "pending" or status == "rejected":
        posts_cursor = db.pending_posts.find({"status": status}).sort("created_at", -1)
    else:  # status == "all"
        approved = list(db.posts.find())
        pending_rejected = list(db.pending_posts.find())
        combined = approved + pending_rejected
        combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        posts_cursor = combined
        
    results = []
    for doc in posts_cursor:
        doc["id"] = str(doc["_id"])
        user = db.users.find_one({"_id": ObjectId(doc["user_id"])})
        if user:
            doc["author_email"] = user.get("email")
            doc["author_profile_pic"] = user.get("profile_pic")
        results.append(doc)
    return results

@router.put("/posts/{post_id}/status")
def update_post_status(post_id: str, update: PostStatusUpdate, role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_db()
    if update.status == "approved":
        post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            return {"message": "Post already approved or not found"}
        post["status"] = "approved"
        db.posts.insert_one(post)
        db.pending_posts.delete_one({"_id": ObjectId(post_id)})
        return {"message": "Post approved"}
    else:
        db.pending_posts.update_one({"_id": ObjectId(post_id)}, {"$set": {"status": "rejected", "rejection_reason": update.rejection_reason}})
        return {"message": "Post rejected"}

@router.get("/videos", response_model=List[VideoResponse])
def get_videos(role: str, status: str = "all"):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db_mindrise = get_db()  # Use canonical DB for users
    client = get_client()
    db_videos = client["MindRiseDB"]
    
    query = {}
    if status == "approved":
        query = {"status": {"$in": ["approved", "Approved"]}}
    elif status == "pending":
        query = {"status": {"$in": ["pending", "Pending"]}}
    elif status == "rejected":
        query = {"status": {"$in": ["rejected", "Rejected"]}}
        
    videos_cursor = db_videos.user_videos.find(query).sort("created_at", -1)
        
    results = []
    for doc in videos_cursor:
        doc["id"] = str(doc["_id"])
        
        # 1. Populate author_name/email from users collection
        user_doc = db_mindrise.users.find_one({"_id": ObjectId(doc["user_id"])})
        if user_doc:
            doc["author_name"] = user_doc.get("full_name") or user_doc.get("email") or "MindRise User"
            doc["author_email"] = user_doc.get("email")
        else:
            # Fallback if user doc not found (e.g. deleted or inconsistent)
            if "author_name" not in doc:
                doc["author_name"] = "Unknown User"
        
        # 2. Ensure status is lowercase for model compliance
        if "status" in doc:
            doc["status"] = doc["status"].lower()
        else:
            doc["status"] = "pending"
            
        # 3. Ensure created_at is a string (ISO format)
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        elif "created_at" not in doc:
            doc["created_at"] = datetime.utcnow().isoformat()
            
        results.append(doc)
    return results

@router.put("/videos/{video_id}/status")
def update_video_status(video_id: str, update: PostStatusUpdate, role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    client = get_client()
    db = client["MindRiseDB"]
    db_status = update.status.lower() 
    result = db.user_videos.update_one(
        {"_id": ObjectId(video_id)},
        {"$set": {
            "status": db_status,
            "rejection_reason": update.rejection_reason,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"message": f"Video {update.status} successfully"}

# User requested standardized endpoint
@flat_router.post("/approve-video")
def approve_video_standard(payload: dict, role: str = "admin"):
    video_id = payload.get("video_id")
    status = payload.get("status", "approved")
    rejection_reason = payload.get("rejection_reason")
    
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    client = get_client()
    db = client["MindRiseDB"]
    
    result = db.user_videos.update_one(
        {"_id": ObjectId(video_id)},
        {"$set": {
            "status": status.lower(),
            "rejection_reason": rejection_reason,
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
        
    return {"success": True, "message": f"Video {status} successfully"}
