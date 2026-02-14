from database import get_client
from config import DB_NAME
from bson import ObjectId

def check_videos():
    client = get_client()
    if not client:
        print("Failed to connect to DB")
        return
    
    db = client[DB_NAME]
    # Check approved videos
    videos = list(db.user_videos.find({"status": "approved"}).sort("created_at", -1).limit(5))
    
    print(f"Found {len(videos)} approved videos:")
    for v in videos:
        print(f"ID: {v['_id']}, Status: {v.get('status')}, URL: {v.get('video_url')}")

if __name__ == '__main__':
    check_videos()
