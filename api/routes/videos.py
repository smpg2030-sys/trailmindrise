from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import VideoCreate, VideoResponse
from config import DB_NAME
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/videos", tags=["videos"])

@router.get("/", response_model=list[VideoResponse])
def get_all_videos(limit: int = 10, skip: int = 0):
    from database import get_client
    client = get_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    db_mindrise = get_db()
    db_videos = client[DB_NAME]
    
    # 1. Fetch approved videos with pagination
    videos_cursor = db_videos.user_videos.find({"status": "approved"}).sort("created_at", -1).skip(skip).limit(limit)
    videos_list = list(videos_cursor)
    
    if not videos_list:
        return []

    # 2. BULK FETCH Authors
    author_ids = list(set(ObjectId(v["user_id"]) for v in videos_list if v.get("user_id") and v["user_id"] != "system"))
    authors_map = {}
    if author_ids:
        authors = db_mindrise.users.find({"_id": {"$in": author_ids}}, {"profile_pic": 1, "full_name": 1, "email": 1})
        authors_map = {str(a["_id"]): a for a in authors}

    # 3. Assembly
    results = []
    for doc in videos_list:
        doc["id"] = str(doc["_id"])
        uid = doc.get("user_id")
        
        # Populate author data from map
        author = authors_map.get(uid)
        if author:
            doc["author_name"] = author.get("full_name") or author.get("email") or "Bodham User"
            doc["author_email"] = author.get("email")
        elif "author_name" not in doc:
            doc["author_name"] = "Bodham User"
            
        if "title" not in doc: doc["title"] = "Inspirational Moment"
        if "caption" not in doc: doc["caption"] = ""
        
        doc["status"] = doc.get("status", "approved").lower()

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
    db = client[DB_NAME]
    
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
    db_videos = client[DB_NAME]
    
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
    db_videos = client[DB_NAME]
    
    # Return only approved videos for the profile view
    videos_cursor = db_videos.user_videos.find({
        "user_id": user_id, 
        "status": "approved"
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
    db = client[DB_NAME]
    
    result = db.user_videos.delete_one({"_id": ObjectId(video_id), "user_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found or unauthorized")
    
    return {"message": "Video deleted"}

@router.get("/{video_id}/status")
def get_video_status(video_id: str):
    from database import get_client
    client = get_client()
    db = client[DB_NAME]
    
    video = db.user_videos.find_one({"_id": ObjectId(video_id)})
    if video:
        return {"status": video.get("status", "pending").lower(), "rejection_reason": video.get("rejection_reason")}
    
    raise HTTPException(status_code=404, detail="Video not found")
