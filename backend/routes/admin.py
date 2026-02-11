from fastapi import APIRouter, HTTPException
from typing import List
from bson import ObjectId
from pydantic import BaseModel
from database import get_db
from models import UserResponse, PostResponse, VideoResponse

router = APIRouter(prefix="/admin", tags=["admin"])

class PostStatusUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None

@router.get("/users", response_model=List[UserResponse])
def get_all_users(role: str | None = None):
    # For now, we expect the frontend to pass the role or we'd ideally use a token
    # This is a placeholder for proper JWT/Session auth
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
    
    # Count pending posts from the pending collection
    pending_posts = db.pending_posts.count_documents({"status": "pending"})
    
    # Count pending videos from MindRiseDB
    from database import get_client
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
    # Collect user IDs for batch lookup if needed
    for doc in posts_cursor:
        doc["id"] = str(doc["_id"])
        # Fetch author email for admin visibility
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
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
        
    if update.status == "approved":
        # Move post from pending_posts to posts
        post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            # Check if it's already approved (maybe a retry)
            already_approved = db.posts.find_one({"_id": ObjectId(post_id)})
            if already_approved:
                return {"message": "Post already approved"}
            raise HTTPException(status_code=404, detail="Post not found in pending")
        
        post["status"] = "approved"
        db.posts.insert_one(post)
        db.pending_posts.delete_one({"_id": ObjectId(post_id)})
        return {"message": "Post approved and moved to live feed"}
    
    else:  # rejected
        # First try to update in pending_posts (for pending or already rejected posts)
        result = db.pending_posts.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"status": "rejected", "rejection_reason": update.rejection_reason}}
        )
        
        if result.matched_count == 0:
            # Not found in pending_posts, check if it's in posts (already approved)
            post = db.posts.find_one({"_id": ObjectId(post_id)})
            if post:
                # Move back to pending_posts with rejected status
                post["status"] = "rejected"
                post["rejection_reason"] = update.rejection_reason
                db.pending_posts.insert_one(post)
                db.posts.delete_one({"_id": ObjectId(post_id)})
                return {"message": "Post approval revoked and rejected"}
            else:
                raise HTTPException(status_code=404, detail="Post not found in pending or approved posts")
            
        return {"message": "Post rejected"}

@router.get("/videos", response_model=List[VideoResponse])
def get_videos(role: str, status: str = "all"):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    from database import get_client
    client = get_client()
    db_mindrise = client["mindrise"] # For users
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
        # Fetch author email from the main mindrise db users collection
        user = db_mindrise.users.find_one({"_id": ObjectId(doc["user_id"])})
        if user:
            doc["author_email"] = user.get("email")
            if "author_name" not in doc:
                doc["author_name"] = user.get("full_name") or user.get("email").split("@")[0]
        
        # Lowercase status for frontend consistency
        if "status" in doc:
            doc["status"] = doc["status"].lower()
            
        results.append(doc)
    return results

@router.put("/videos/{video_id}/status")
def update_video_status(video_id: str, update: PostStatusUpdate, role: str):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    from database import get_client
    client = get_client()
    db = client["MindRiseDB"]
    
    # Map lowercase status to the requested DB format if needed
    # (Approved/Rejected/Pending)
    db_status = update.status.capitalize() 
    
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
