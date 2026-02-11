from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import VideoCreate, VideoResponse
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/videos", tags=["videos"])

@router.get("/", response_model=list[VideoResponse])
def get_all_videos():
    from database import get_client
    client = get_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    db_mindrise = get_db() # Canonical DB for users
    db_videos = client["MindRiseDB"]
    
    # Fetch approved videos sorted by created_at descending
    videos_cursor = db_videos.user_videos.find({"status": {"$in": ["approved", "Approved"]}}).sort("created_at", -1)
    
    results = []
    for doc in videos_cursor:
        doc["id"] = str(doc["_id"])
        
        # 1. Populate author information
        user_doc = db_mindrise.users.find_one({"_id": ObjectId(doc["user_id"])})
        if user_doc:
            doc["author_name"] = user_doc.get("full_name") or user_doc.get("email") or "MindRise User"
            doc["author_email"] = user_doc.get("email")
        elif "author_name" not in doc:
            doc["author_name"] = "MindRise User"
            
        # 2. Field Fallbacks
        if "title" not in doc:
            doc["title"] = "Inspirational Moment"
        if "caption" not in doc:
            doc["caption"] = ""
        if "user_id" not in doc:
            doc["user_id"] = "system"
            
        # 3. Model Compliance (status & created_at)
        if "status" in doc:
            doc["status"] = doc["status"].lower()
        else:
            doc["status"] = "approved"

        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        elif "created_at" not in doc:
            doc["created_at"] = datetime.utcnow().isoformat()
            
        results.append(doc)
    return results

@router.post("/", response_model=VideoResponse)
def create_video(video: VideoCreate):
    from database import get_client
    client = get_client()
    db = client["MindRiseDB"]
    
    doc = {
        "user_id": video.user_id,
        "author_name": video.author_name,
        "title": video.title,
        "video_url": video.video_url,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "rejection_reason": None
    }
    
    result = db.user_videos.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

@router.get("/my", response_model=list[VideoResponse])
def get_my_videos(user_id: str):
    from database import get_client
    client = get_client()
    db_mindrise = get_db()
    db_videos = client["MindRiseDB"]
    
    # Return all videos for the user from the single collection
    videos_cursor = db_videos.user_videos.find({"user_id": user_id}).sort("created_at", -1)
    
    results = []
    for doc in videos_cursor:
        doc["id"] = str(doc["_id"])
        
        # Populate author
        user_doc = db_mindrise.users.find_one({"_id": ObjectId(doc["user_id"])})
        if user_doc:
            doc["author_name"] = user_doc.get("full_name") or user_doc.get("email") or "MindRise User"
            doc["author_email"] = user_doc.get("email")
        elif "author_name" not in doc:
            doc["author_name"] = "MindRise User"

        # Ensure status is lowercase for frontend compatibility if stored capitalized
        if "status" in doc:
            doc["status"] = doc["status"].lower()
        else:
            doc["status"] = "pending"
            
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        elif "created_at" not in doc:
            doc["created_at"] = datetime.utcnow().isoformat()
            
        results.append(doc)
    return results

@router.get("/user/{user_id}", response_model=list[VideoResponse])
def get_user_videos(user_id: str):
    from database import get_client
    client = get_client()
    db_mindrise = get_db()
    db_videos = client["MindRiseDB"]
    
    # Return only approved videos for the profile view
    videos_cursor = db_videos.user_videos.find({
        "user_id": user_id, 
        "status": {"$in": ["Approved", "approved"]}
    }).sort("created_at", -1)
    
    results = []
    for doc in videos_cursor:
        doc["id"] = str(doc["_id"])
        
        # Populate author
        user_doc = db_mindrise.users.find_one({"_id": ObjectId(doc["user_id"])})
        if user_doc:
            doc["author_name"] = user_doc.get("full_name") or user_doc.get("email") or "MindRise User"
            doc["author_email"] = user_doc.get("email")
        elif "author_name" not in doc:
            doc["author_name"] = "MindRise User"
            
        doc["status"] = "approved"
        
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"].isoformat()
        elif "created_at" not in doc:
            doc["created_at"] = datetime.utcnow().isoformat()
            
        results.append(doc)
    return results

@router.delete("/{video_id}")
def delete_video(video_id: str, user_id: str):
    from database import get_client
    client = get_client()
    db = client["MindRiseDB"]
    
    result = db.user_videos.delete_one({"_id": ObjectId(video_id), "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found or unauthorized")
    
    return {"message": "Video deleted"}
