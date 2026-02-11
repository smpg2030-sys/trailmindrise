from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import VideoCreate, VideoResponse
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/videos", tags=["videos"])

@router.get("/", response_model=list[VideoResponse])
def get_all_videos():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Return all approved videos worldwide
    videos_cursor = db.videos.find().sort("created_at", -1)
    
    results = []
    for doc in videos_cursor:
        doc["id"] = str(doc["_id"])
        results.append(doc)
    return results

@router.post("/", response_model=VideoResponse)
def create_video(video: VideoCreate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    doc = {
        "user_id": video.user_id,
        "author_name": video.author_name,
        "title": video.title,
        "video_url": video.video_url,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "rejection_reason": None
    }
    
    result = db.pending_videos.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

@router.get("/my", response_model=list[VideoResponse])
def get_my_videos(user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Return all videos for the user from both collections
    approved_videos = list(db.videos.find({"user_id": user_id}))
    pending_videos = list(db.pending_videos.find({"user_id": user_id}))
    
    combined = approved_videos + pending_videos
    combined.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    results = []
    for doc in combined:
        doc["id"] = str(doc["_id"])
        results.append(doc)
    return results

@router.get("/user/{user_id}", response_model=list[VideoResponse])
def get_user_videos(user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Return only approved videos for the profile view
    videos_cursor = db.videos.find({"user_id": user_id}).sort("created_at", -1)
    
    results = []
    for doc in videos_cursor:
        doc["id"] = str(doc["_id"])
        results.append(doc)
    return results

@router.delete("/{video_id}")
def delete_video(video_id: str, user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Attempt deletion in both collections
    result_approved = db.videos.delete_one({"_id": ObjectId(video_id), "user_id": user_id})
    result_pending = db.pending_videos.delete_one({"_id": ObjectId(video_id), "user_id": user_id})
    
    if result_approved.deleted_count == 0 and result_pending.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found or unauthorized")
    
    return {"message": "Video deleted"}
