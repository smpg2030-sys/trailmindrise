from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
# User specifically asked for MindRiseDB
DB_NAME = "MindRiseDB"
COLLECTION_NAME = "user_videos"

def insert_record():
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]
        
        record = {
            "video_url": "https://res.cloudinary.com/dbcucwjrw/video/upload/v1770816572/videoplayback_wttlew.mp4",
            "status": "Pending"
        }
        
        result = collection.insert_one(record)
        print(f"Successfully inserted record with ID: {result.inserted_id}")
        print(f"Database: {DB_NAME}, Collection: {COLLECTION_NAME}")
    except Exception as e:
        print(f"Error inserting record: {e}")

if __name__ == "__main__":
    insert_record()
