from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from database import get_db
from models import PostCreate, PostResponse
from bson import ObjectId
from datetime import datetime
from services.moderation import check_content

router = APIRouter(prefix="/posts", tags=["posts"])

def process_post_moderation(post_id: str):
    """Background task to moderate post content."""
    try:
        db = get_db()
        if db is None: return

        post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
        if not post: return

        # AI Check
        result = check_content(post.get("content", ""), post.get("image_url"), post.get("video_url"))
        
        timestamp = datetime.utcnow().isoformat()
        log_entry = {
            "action": f"AI Moderation: {result['status']}",
            "timestamp": timestamp,
            "operator": "AI_SYSTEM",
            "details": result["details"]
        }

        updates = {
            "moderation_score": result["score"],
            "moderation_status": result["status"],
            "moderation_category": result["category"],
            "moderation_source": "AI",
            "moderation_logs": post.get("moderation_logs", []) + [log_entry]
        }

        if result["status"] == "approved":
            # Auto-publish: Move to approved posts
            post.update(updates)
            post["status"] = "approved"
            db.posts.insert_one(post)
            db.pending_posts.delete_one({"_id": ObjectId(post_id)})
            
        elif result["status"] == "flagged":
            updates["status"] = "flagged"
            db.pending_posts.update_one({"_id": ObjectId(post_id)}, {"$set": updates})
            
        else: # rejected
            updates["status"] = "rejected"
            updates["rejection_reason"] = f"AI Rejection ({result['category']}): {', '.join(result['details'])}"
            db.pending_posts.update_one({"_id": ObjectId(post_id)}, {"$set": updates})
            
    except Exception as e:
        print(f"Moderation error for post {post_id}: {e}")

@router.post("/", response_model=PostResponse)
def create_post(post: PostCreate, user_id: str, author_name: str, background_tasks: BackgroundTasks):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # 1. Run First Pass (Heuristics)
    # This might return an instant Approval/Rejection if it hits heuristics
    mod_result = check_content(post.content, post.image_url, post.video_url)
    
    doc = {
        "user_id": user_id,
        "author_name": author_name,
        "content": post.content,
        "image_url": post.image_url,
        "video_url": post.video_url,
        "created_at": datetime.utcnow().isoformat(),
        "moderation_score": mod_result["score"],
        "moderation_status": mod_result["status"],
        "moderation_category": mod_result["category"],
        "moderation_source": "AI",
        "moderation_logs": [{
            "action": f"Heuristic/AI Start: {mod_result['status']}",
            "timestamp": datetime.utcnow().isoformat(),
            "operator": "AI_SYSTEM",
            "details": mod_result["details"]
        }],
        "rejection_reason": mod_result["details"][0] if mod_result["status"] == "rejected" else None
    }

    if mod_result["status"] == "approved":
        # Instant Approval
        doc["status"] = "approved"
        result = db.posts.insert_one(doc)
    else:
        # Instant/Pending Rejection or Flagged
        doc["status"] = mod_result["status"]
        result = db.pending_posts.insert_one(doc)
        
        # If it was returned as 'pending' or 'flagged' (meaning a real API call or rate limit happened),
        # or if we want to ensure any 'flagged' status gets an AI re-pass in background:
        if mod_result["status"] in ["flagged", "pending"] and mod_result["category"] != "safe":
             background_tasks.add_task(process_post_moderation, str(result.inserted_id))
    
    doc["id"] = str(result.inserted_id)
    return doc

@router.get("/", response_model=list[PostResponse])
def get_feed(user_id: str | None = None, limit: int = 15, skip: int = 0):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # 1. Determine which authors we want to see
    query_filter = {"status": "approved"}
    
    if user_id:
        from services.activity import update_last_active
        update_last_active(user_id)

        # Optimization: Don't fetch friendships every single time or store them in a more efficient way
        # For now, we still check friendships but keep it simple
        friendships = list(db.friends.find({
            "status": "accepted",
            "$or": [{"sender_id": user_id}, {"receiver_id": user_id}]
        }))
        friend_ids = [user_id]
        for f in friendships:
            friend_ids.append(f["receiver_id"] if f["sender_id"] == user_id else f["sender_id"])
        
        query_filter["user_id"] = {"$in": friend_ids}

    # 2. Fetch Posts with Pagination
    posts_cursor = db.posts.find(query_filter).sort("created_at", -1).skip(skip).limit(limit)
    posts_list = list(posts_cursor)
    
    if not posts_list:
        return []

    # 3. BULK FETCH: Optimization to avoid N+1 queries
    # Get all unique author IDs from the current page
    author_ids = list(set(ObjectId(p["user_id"]) for p in posts_list if p.get("user_id") and p["user_id"] != "system"))
    authors_map = {}
    if author_ids:
        authors = db.users.find({"_id": {"$in": author_ids}}, {"profile_pic": 1, "full_name": 1})
        authors_map = {str(a["_id"]): a for a in authors}

    # Get all post IDs for stats
    post_ids = [str(p["_id"]) for p in posts_list]
    
    # Stats Aggregation (Likes)
    likes_pipeline = [
        {"$match": {"post_id": {"$in": post_ids}}},
        {"$group": {"_id": "$post_id", "count": {"$sum": 1}}}
    ]
    likes_counts = {item["_id"]: item["count"] for item in db.likes.aggregate(likes_pipeline)}

    # Stats Aggregation (Comments)
    comments_pipeline = [
        {"$match": {"post_id": {"$in": post_ids}}},
        {"$group": {"_id": "$post_id", "count": {"$sum": 1}}}
    ]
    comments_counts = {item["_id"]: item["count"] for item in db.comments.aggregate(comments_pipeline)}

    # My Likes
    my_likes = set()
    if user_id:
        liked_by_me = db.likes.find({"post_id": {"$in": post_ids}, "user_id": user_id}, {"post_id": 1})
        my_likes = set(item["post_id"] for item in liked_by_me)

    # 4. Final Assembly
    results = []
    for doc in posts_list:
        pid = str(doc["_id"])
        uid = doc.get("user_id")
        
        doc["id"] = pid
        # Get author data from map
        author = authors_map.get(uid)
        if author:
            doc["author_profile_pic"] = author.get("profile_pic")
            if not doc.get("author_name"): # Use DB name if missing in post doc
                 doc["author_name"] = author.get("full_name", "Bodham User")
        
        doc["likes_count"] = likes_counts.get(pid, 0)
        doc["comments_count"] = comments_counts.get(pid, 0)
        doc["is_liked_by_me"] = pid in my_likes
            
        results.append(doc)
    return results

@router.get("/my", response_model=list[PostResponse])
def get_my_posts(user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Return all posts for the user from both collections
    approved_posts = list(db.posts.find({"user_id": user_id}))
    pending_posts = list(db.pending_posts.find({"user_id": user_id, "status": {"$ne": "rejected"}}))
    
    # Fetch user for profile pic
    user = db.users.find_one({"_id": ObjectId(user_id)})
    profile_pic = user.get("profile_pic") if user else None

    combined_posts = approved_posts + pending_posts
    # Sort by newest first
    combined_posts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    results = []
    for doc in combined_posts:
        doc["id"] = str(doc["_id"])
        doc["author_profile_pic"] = profile_pic

        # Social Stats
        doc["likes_count"] = db.likes.count_documents({"post_id": doc["id"]})
        doc["comments_count"] = db.comments.count_documents({"post_id": doc["id"]})
        doc["is_liked_by_me"] = bool(db.likes.find_one({"post_id": doc["id"], "user_id": user_id}))

        results.append(doc)
    return results

@router.delete("/{post_id}")
def delete_post(post_id: str, user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Attempt deletion in both collections
    result_approved = db.posts.delete_one({"_id": ObjectId(post_id), "user_id": user_id})
    result_pending = db.pending_posts.delete_one({"_id": ObjectId(post_id), "user_id": user_id})
    
    if result_approved.deleted_count == 0 and result_pending.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found or unauthorized")
    
    return {"message": "Post deleted"}

@router.get("/{post_id}/status")
def get_post_status(post_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Check approved collection first
    post = db.posts.find_one({"_id": ObjectId(post_id)})
    if post:
        return {"status": "approved"}
    
    # Check pending collection
    pending_post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
    if (pending_post):
        return {"status": pending_post.get("status", "pending").lower(), "rejection_reason": pending_post.get("rejection_reason")}
    
    raise HTTPException(status_code=404, detail="Post not found")
