from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import os
import cloudinary
import cloudinary.uploader
from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
from database import get_client
from datetime import datetime

router = APIRouter(tags=["upload"])

# Configure Cloudinary
def configure_cloudinary():
    if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
        cloudinary.config(
            cloud_name=CLOUDINARY_CLOUD_NAME,
            api_key=CLOUDINARY_API_KEY,
            api_secret=CLOUDINARY_API_SECRET,
            secure=True
        )
        return True
    return False

# Initial config attempt
configure_cloudinary()

@router.get("/upload-video/signature")
def get_upload_signature():
    if not CLOUDINARY_API_SECRET:
        raise HTTPException(status_code=500, detail="Cloudinary credentials not configured.")
    
    import time
    timestamp = int(time.time())
    
    # Standard params for MindRise uploads
    params = {
        "timestamp": timestamp,
        "folder": "MindRise_Videos",
    }
    
    # Generate signature using the Cloudinary helper
    signature = cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET)
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "api_key": CLOUDINARY_API_KEY,
        "cloud_name": CLOUDINARY_CLOUD_NAME,
        "folder": "MindRise_Videos"
    }

@router.post("/upload-video/register")
async def register_video(payload: dict):
    video_url = payload.get("video_url")
    user_id = payload.get("user_id")
    author_name = payload.get("author_name", "MindRise User")
    caption = payload.get("caption", "")
    
    if not video_url or not user_id:
        raise HTTPException(status_code=400, detail="Missing video_url or user_id")
    
    client = get_client()
    db = client["MindRiseDB"]
    collection = db["user_videos"]
    
    record = {
        "user_id": user_id,
        "author_name": author_name,
        "video_url": video_url,
        "caption": caption,
        "status": "Pending",
        "created_at": datetime.utcnow()
    }
    
    result = collection.insert_one(record)
    
    return {
        "success": True,
        "videoId": str(result.inserted_id)
    }

@router.post("/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    caption: str = Form("")
):
    missing_keys = []
    if not CLOUDINARY_CLOUD_NAME: missing_keys.append("CLOUDINARY_CLOUD_NAME")
    if not CLOUDINARY_API_KEY: missing_keys.append("CLOUDINARY_API_KEY")
    if not CLOUDINARY_API_SECRET: missing_keys.append("CLOUDINARY_API_SECRET")
    
    if missing_keys:
        raise HTTPException(
            status_code=500, 
            detail=f"Cloudinary configuration missing: {', '.join(missing_keys)}. "
                   f"Please set these in your Vercel Project Environment Variables."
        )
    
    # Re-verify config in case env vars were set but not used at module load
    configure_cloudinary()
    
    try:
        # 1. Upload to Cloudinary -> MindRise_Videos folder
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder="MindRise_Videos",
            resource_type="video"
        )
        
        video_url = upload_result.get("secure_url")
        
        # 2. Store in MindRiseDB.user_videos
        client = get_client()
        db = client["MindRiseDB"]
        collection = db["user_videos"]
        
        record = {
            "user_id": user_id,
            "video_url": video_url,
            "caption": caption,
            "status": "Pending",
            "created_at": datetime.utcnow()
        }
        
        result = collection.insert_one(record)
        
        return {
            "success": True,
            "videoUrl": video_url,
            "videoId": str(result.inserted_id)
        }
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        raise HTTPException(status_code=500, detail=f"Could not upload video: {str(e)}")

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Keep original logic for generic files (like profile pics/images for now)
    import shutil
    import uuid
    
    if os.getenv("VERCEL"):
        UPLOAD_DIR = "/tmp/uploads"
    else:
        UPLOAD_DIR = "uploads"
        
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    try:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {"url": f"/static/{unique_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not upload file: {str(e)}")
