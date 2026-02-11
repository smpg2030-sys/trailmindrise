from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime
from bson import ObjectId

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
SOURCE_DB = "MindRiseDB"
TARGET_DB = "mindrise"
USER_ID = "6988acee24f625f056f16116" # Madhav

def migrate_and_enhance():
    try:
        client = MongoClient(MONGO_URI)
        
        # 1. Fetch from MindRiseDB
        source_coll = client[SOURCE_DB]["user_videos"]
        video_doc = source_coll.find_one({"video_url": "https://res.cloudinary.com/dbcucwjrw/video/upload/v1770816572/videoplayback_wttlew.mp4"})
        
        if not video_doc:
            print("Video not found in MindRiseDB.")
            return

        # 2. Enhance for the active app structure
        enhanced_doc = {
            "user_id": USER_ID,
            "author_name": "madhav",
            "title": "Cloudinary Reel",
            "video_url": video_doc["video_url"],
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "rejection_reason": None
        }
        
        # 3. Insert into the active moderation queue
        target_coll = client[TARGET_DB]["pending_videos"]
        result = target_coll.insert_one(enhanced_doc)
        
        print(f"Successfully migrated video to {TARGET_DB}.pending_videos")
        print(f"Moderation ID: {result.inserted_id}")
        print("\nINSTRUCTIONS FOR ADMIN:")
        print("1. Go to the Admin Dashboard in the app.")
        print("2. Click on the 'Videos' tab.")
        print("3. You should see 'Cloudinary Reel' there.")
        print("4. Click 'Approve' to make it live.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate_and_enhance()
