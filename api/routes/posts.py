from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import PostCreate, PostResponse
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/posts", tags=["posts"])

@router.post("/", response_model=PostResponse)
def create_post(post: PostCreate, user_id: str, author_name: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    doc = {
        "user_id": user_id,
        "author_name": author_name,
        "content": post.content,
        "image_url": post.image_url,
        "video_url": post.video_url,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "rejection_reason": None
    }
    
    result = db.pending_posts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

@router.get("/", response_model=list[PostResponse])
def get_feed(user_id: str | None = None):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # If user_id is provided, only show posts from friends and self
    if user_id:
        # Update activity
        from services.activity import update_last_active
        update_last_active(user_id)

        friendships = list(db.friendships.find({
            "$or": [
                {"user1": user_id},
                {"user2": user_id}
            ]
        }))
        friend_ids = [user_id]
        for f in friendships:
            friend_ids.append(f["user2"] if f["user1"] == user_id else f["user1"])
            
        posts_cursor = db.posts.find({"user_id": {"$in": friend_ids}}).sort("created_at", -1)
    else:
        # Fallback to all approved posts if no user_id
        posts_cursor = db.posts.find().sort("created_at", -1)
        
    results = []
    for doc in posts_cursor:
        doc["id"] = str(doc["_id"])
        # Fetch author profile pic
        author = db.users.find_one({"_id": ObjectId(doc["user_id"])})
        if author:
            doc["author_profile_pic"] = author.get("profile_pic")
        
        # Social Stats
        doc["likes_count"] = db.likes.count_documents({"post_id": doc["id"]})
        doc["comments_count"] = db.comments.count_documents({"post_id": doc["id"]})
        
        if user_id:
            doc["is_liked_by_me"] = bool(db.likes.find_one({"post_id": doc["id"], "user_id": user_id}))
        else:
            doc["is_liked_by_me"] = False
            
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
