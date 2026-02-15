from fastapi import APIRouter, HTTPException
from typing import List
from bson import ObjectId
from pydantic import BaseModel
from database import get_db, get_client
from config import DB_NAME
from models import UserResponse, PostResponse, VideoResponse
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

# Also create a flat router for specific user requested paths like /api/approve-video
flat_router = APIRouter(tags=["admin_flat"])

class PostStatusUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None

class BanRequest(BaseModel):
    reason: str

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
            is_verified_host=user.get("is_verified_host", False),
            host_status=user.get("host_status", "none"),
            profile_pic=user.get("profile_pic"),
            last_active_at=user.get("last_active_at")
        ))
    return all_users

@router.post("/users/{user_id}/ban")
def ban_user(user_id: str, ban_data: BanRequest, role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    db = get_db()
    
    # 1. Update user role/status
    db.users.update_one(
        {"_id": ObjectId(user_id)}, 
        {"$set": {"role": "banned", "ban_reason": ban_data.reason}}
    )
    
    return {"message": f"User {user_id} banned successfully"}

@router.post("/users/{user_id}/verify-host")
def toggle_host_verification(user_id: str, role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_status = user.get("is_verified_host", False)
    new_status = not current_status
    
    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "is_verified_host": new_status,
            "host_status": "approved" if new_status else "none",
            "role": user.get("role") if user.get("role") == "admin" else ("host" if new_status else "user")
        }}
    )
    
    return {"message": f"User host verification set to {new_status}"}

@router.delete("/posts/{post_id}")
def admin_delete_post(post_id: str, role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    db = get_db()
    # Try delete from both
    db.posts.delete_one({"_id": ObjectId(post_id)})
    db.pending_posts.delete_one({"_id": ObjectId(post_id)})
    
    return {"message": "Post deleted by admin"}

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
    flagged_posts = db.pending_posts.count_documents({"status": "flagged"}) 
    
    # Count pending videos from MindRiseDB
    client = get_client()
    db_videos = client[DB_NAME]
    pending_videos = db_videos.user_videos.count_documents({"status": {"$in": ["pending", "Pending"]}})
    
    return {
        "total_users": user_count,
        "email_users": email_users,
        "mobile_users": mobile_users,
        "pending_moderation": pending_posts + pending_videos,
        "flagged_posts": flagged_posts
    }

@router.get("/posts", response_model=List[PostResponse])
def get_posts(role: str, status: str = "all", search_user: str | None = None):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    query = {}
    if status != "all":
        query["status"] = status
    
    if search_user:
        # Search by user ID or find user by email/mobile first
        user_query = {"$or": [
            {"email": {"$regex": search_user, "$options": "i"}},
            {"mobile": {"$regex": search_user, "$options": "i"}},
            {"full_name": {"$regex": search_user, "$options": "i"}}
        ]}
        try:
            if len(search_user) == 24: # Likely ObjectId
                user_query["$or"].append({"_id": ObjectId(search_user)})
        except: pass
        
        users = list(db.users.find(user_query))
        user_ids = [str(u["_id"]) for u in users]
        query["user_id"] = {"$in": user_ids} if user_ids else "NONE"

    # Fetch from both collections
    approved = list(db.posts.find(query))
    pending_rejected = list(db.pending_posts.find(query))
    combined = approved + pending_rejected
    
    # Sort and return
    combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    results = []
    for doc in combined:
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
    
    # Find post in pending first, then approved
    post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
    collection_from = "pending_posts"
    if not post:
        post = db.posts.find_one({"_id": ObjectId(post_id)})
        collection_from = "posts"
        
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    timestamp = datetime.utcnow().isoformat()
    log_entry = {
        "action": f"Admin Override: {update.status}",
        "timestamp": timestamp,
        "operator": "ADMIN_OVERRIDE",
        "reason": update.rejection_reason or "Manually updated by admin"
    }

    moderation_updates = {
        "moderation_status": update.status,
        "moderation_source": "admin_override",
        "moderation_logs": post.get("moderation_logs", []) + [log_entry],
        "status": update.status,
        "rejection_reason": update.rejection_reason if update.status == "rejected" else None
    }

    if update.status == "approved" and collection_from == "pending_posts":
        # Move to approved
        post.update(moderation_updates)
        db.posts.insert_one(post)
        db.pending_posts.delete_one({"_id": ObjectId(post_id)})
    elif update.status == "rejected" and collection_from == "posts":
        # Move to pending/rejected
        post.update(moderation_updates)
        db.pending_posts.insert_one(post)
        db.posts.delete_one({"_id": ObjectId(post_id)})
    else:
        # Just update in current collection
        db[collection_from].update_one({"_id": ObjectId(post_id)}, {"$set": moderation_updates})

    return {"message": f"Post status updated to {update.status} with override log."}

@router.get("/videos", response_model=List[VideoResponse])
def get_videos(role: str, status: str = "all"):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db_mindrise = get_db()  # Use canonical DB for users
    client = get_client()
    db_videos = client[DB_NAME]
    
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
    db = client[DB_NAME]
    
    video = db.user_videos.find_one({"_id": ObjectId(video_id)})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    timestamp = datetime.utcnow().isoformat()
    log_entry = {
        "action": f"Admin Override: {update.status}",
        "timestamp": timestamp,
        "operator": "ADMIN_OVERRIDE",
        "reason": update.rejection_reason or "Manually updated by admin"
    }

    db_status = update.status.lower() 
    db.user_videos.update_one(
        {"_id": ObjectId(video_id)},
        {"$set": {
            "status": db_status,
            "moderation_status": update.status,
            "moderation_source": "admin_override",
            "moderation_logs": video.get("moderation_logs", []) + [log_entry],
            "rejection_reason": update.rejection_reason,
            "updated_at": timestamp
        }}
    )
    return {"message": f"Video {update.status} successfully overridden"}

@router.post("/optimize")
def optimize_db(role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_db()
    
    # Indexing for performance
    db.users.create_index([("email", 1)])
    db.users.create_index([("mobile", 1)])
    db.posts.create_index([("user_id", 1)])
    db.posts.create_index([("status", 1)])
    db.pending_posts.create_index([("user_id", 1)])
    db.pending_posts.create_index([("status", 1)])
    
    client = get_client()
    db_v = client[DB_NAME]
    db_v.user_videos.create_index([("user_id", 1)])
    db_v.user_videos.create_index([("status", 1)])
    
    return {"message": "Database optimized with indexes"}

@router.get("/debug-ai-keys")
def debug_ai_keys():
    from config import GEMINI_API_KEY, SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET
    import os
    return {
        "GEMINI_KEY_SET": bool(GEMINI_API_KEY and len(GEMINI_API_KEY.strip()) > 10),
        "SIGHTENGINE_USER_SET": bool(SIGHTENGINE_API_USER and len(SIGHTENGINE_API_USER.strip()) > 5),
        "SIGHTENGINE_SECRET_SET": bool(SIGHTENGINE_API_SECRET and len(SIGHTENGINE_API_SECRET.strip()) > 5),
        "VERCEL_ENV": os.getenv("VERCEL", "false"),
        "MESSAGE": "Check this if AI_FAIL persists. If False, keys are not reaching Vercel."
    }

# User requested standardized endpoint
@flat_router.post("/approve-video")
def approve_video_standard(payload: dict, role: str = "admin"):
    video_id = payload.get("video_id")
    status = payload.get("status", "approved")
    rejection_reason = payload.get("rejection_reason")
    
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    client = get_client()
    db = client[DB_NAME]
    
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
