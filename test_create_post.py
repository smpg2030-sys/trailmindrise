import requests
import json
from datetime import datetime

API_BASE = "http://localhost:8000"

def test_create_post():
    # 1. Get User ID (Assuming fix_roles.py ran and updated roles)
    # We can fetch a user first or use a known one if we had it, but let's just get the first user
    print("Fetching users...")
    # This endpoint is admin only, so we need to valid admin credentials or logic
    # But wait, debug_db.py showed us IDs. Let's use one from there.
    # ID: 698ac3494074a0a36e261d86, Email: sai@gmail.com
    
    user_id = "698ac3494074a0a36e261d86" 
    # Note: If this ID doesn't exist (because I just made it up based on output structure or it was randomized), 
    # this script will fail. I should fetch a real user if possible or use the one from previous output.
    # Previous output: 
    # ID: 65c7... (wait, the output was truncated or random looking in simulation?)
    # "ID: 698ac2354074a0a36e261d85" -> These look like valid ObjectIds.
    
    # Let's try to fetch user details to confirm it exists
    print(f"Checking user {user_id}...")
    try:
        res = requests.get(f"{API_BASE}/auth/user/{user_id}")
        if res.status_code == 200:
            user = res.json()
            print(f"User found: {user['email']}, Role: {user.get('role')}")
            
            # 2. Create Post
            print("Creating post...")
            params = {
                "user_id": user_id,
                "author_name": user.get('full_name') or "Test User"
            }
            body = {
                "content": f"Test post created at {datetime.utcnow().isoformat()}",
                "image_url": None
            }
            
            post_res = requests.post(f"{API_BASE}/posts/", params=params, json=body)
            if post_res.status_code == 200:
                print("Post created successfully!")
                print(post_res.json())
            else:
                print(f"Failed to create post. Status: {post_res.status_code}")
                print(post_res.text)
                
        else:
             print(f"User not found or error. Status: {res.status_code}")
             print(res.text)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_create_post()
