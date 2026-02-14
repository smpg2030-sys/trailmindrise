import requests
from database import get_client
from config import DB_NAME
from bson import ObjectId

def validate_urls():
    client = get_client()
    if not client:
        print("Failed to connect to DB")
        return
    
    db = client[DB_NAME]
    videos = list(db.user_videos.find({"status": "approved"}).sort("created_at", -1))
    
    print(f"Checking {len(videos)} approved videos...")
    for v in videos:
        url = v.get('video_url')
        if not url:
            print(f"ID: {v['_id']} - No URL")
            continue
            
        try:
            res = requests.head(url, timeout=5)
            status = "WORKING" if res.ok else f"BROKEN ({res.status_code})"
            print(f"ID: {v['_id']}, Status: {status}, URL: {url}")
        except Exception as e:
            print(f"ID: {v['_id']}, Error: {e}, URL: {url}")

if __name__ == '__main__':
    validate_urls()
