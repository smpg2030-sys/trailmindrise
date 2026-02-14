import requests
from database import get_client
from config import DB_NAME
from bson import ObjectId

def cleanup_broken_videos():
    client = get_client()
    if not client:
        print("Failed to connect to DB")
        return
    
    db = client[DB_NAME]
    # Check all approved videos
    videos = list(db.user_videos.find({"status": "approved"}))
    
    print(f"Scanning {len(videos)} videos for broken links...")
    broken_ids = []
    
    for v in videos:
        url = v.get('video_url')
        if not url:
            broken_ids.append(v['_id'])
            continue
            
        try:
            # We use a HEAD request with a shorter timeout to quickly check if the file exists
            res = requests.head(url, timeout=5)
            if not res.ok:
                print(f"Found broken link: {url} (Status: {res.status_code})")
                broken_ids.append(v['_id'])
        except Exception as e:
            print(f"Error checking {url}: {e}")
            broken_ids.append(v['_id'])

    if broken_ids:
        print(f"\nDeleting {len(broken_ids)} broken video entries...")
        # result = db.user_videos.delete_many({"_id": {"$in": broken_ids}}) # DRY RUN FIRST
        # print(f"Deleted {result.deleted_count} entries.")
        
        # Also check the 'posts' collection for any posts that use these video URLs
        # In this app, videos often exist as posts as well
        posts = list(db.posts.find({"video_url": {"$exists": True}}))
        broken_post_ids = []
        for p in posts:
            p_url = p.get('video_url')
            try:
                res = requests.head(p_url, timeout=5)
                if not res.ok:
                    print(f"Found broken post video: {p_url}")
                    broken_post_ids.append(p['_id'])
            except:
                broken_post_ids.append(p['_id'])
        
        # print(f"Would delete {len(broken_post_ids)} broken posts.")
        
        # ACTUALLY DELETE
        vid_del = db.user_videos.delete_many({"_id": {"$in": broken_ids}})
        post_del = db.posts.delete_many({"_id": {"$in": broken_post_ids}})
        print(f"Successfully deleted {vid_del.deleted_count} user_videos and {post_del.deleted_count} posts entries.")
    else:
        print("No broken links found.")

if __name__ == '__main__':
    cleanup_broken_videos()
