from fastapi import APIRouter, UploadFile, File, HTTPException, Form
import os
import cloudinary
import cloudinary.uploader
from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
from database import get_client
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["upload"])

# Configure Cloudinary
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True
    )

@router.post("/video")
async def upload_video(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    caption: str = Form("")
):
    if not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET):
        raise HTTPException(status_code=500, detail="Cloudinary credentials not configured.")
    
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
            "id": str(result.inserted_id),
            "video_url": video_url,
            "status": "Pending",
            "message": "Video uploaded successfully and is pending approval."
        }
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        raise HTTPException(status_code=500, detail=f"Could not upload video: {str(e)}")

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    # Keep original logic for generic files (like profile pics/images for now)
    import shutil
    import uuid
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
