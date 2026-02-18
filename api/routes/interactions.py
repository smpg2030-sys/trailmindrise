from fastapi import APIRouter, HTTPException, Depends, Body
from database import get_db
from models import CommentCreate, CommentResponse
from bson import ObjectId
from datetime import datetime
from typing import List

router = APIRouter(prefix="/posts", tags=["interactions"])

@router.post("/{post_id}/like")
def toggle_like(post_id: str, user_id: str = Body(..., embed=True)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # Check if post exists
    post = db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        # Check pending posts too just in case, though usually we like approved posts
        post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

    # Check if already liked
    existing_like = db.likes.find_one({"post_id": post_id, "user_id": user_id})
    
    if existing_like:
        # Unlike
        db.likes.delete_one({"_id": existing_like["_id"]})
        return {"message": "Post unliked", "is_liked": False}
    else:
        # Like
        db.likes.insert_one({
            "post_id": post_id,
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })
        
        # Notify author if not self
        if post["user_id"] != user_id:
            liker = db.users.find_one({"_id": ObjectId(user_id)})
            liker_name = liker.get("full_name") or liker.get("email", "Someone")
            
            db.notifications.insert_one({
                "user_id": post["user_id"],
                "message": f"{liker_name} liked your post",
                "type": "like",
                "post_id": post_id,
                "sender_id": user_id,
                "created_at": datetime.utcnow()
            })
            
        return {"message": "Post liked", "is_liked": True}

@router.get("/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(post_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")

    comments_cursor = db.comments.find({"post_id": post_id}).sort("created_at", 1)
    
    results = []
    for doc in comments_cursor:
        author = db.users.find_one({"_id": ObjectId(doc["user_id"])})
        results.append(CommentResponse(
            id=str(doc["_id"]),
            user_id=doc["user_id"],
            author_name=author.get("full_name") or author.get("email", "Unknown") if author else "Unknown",
            author_profile_pic=author.get("profile_pic") if author else None,
            content=doc["content"],
            created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"]
        ))
    return results

@router.post("/{post_id}/comments", response_model=CommentResponse)
def add_comment(post_id: str, comment: CommentCreate, user_id: str = Body(..., embed=True)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")

    # Check if post exists
    post = db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        post = db.pending_posts.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

    doc = {
        "post_id": post_id,
        "user_id": user_id,
        "content": comment.content,
        "created_at": datetime.utcnow()
    }
    
    result = db.comments.insert_one(doc)
    
    # Notify author if not self
    if post["user_id"] != user_id:
        commenter = db.users.find_one({"_id": ObjectId(user_id)})
        commenter_name = commenter.get("full_name") or commenter.get("email", "Someone")
        
        db.notifications.insert_one({
            "user_id": post["user_id"],
            "message": f"{commenter_name} commented on your post",
            "type": "comment",
            "post_id": post_id,
            "sender_id": user_id,
            "created_at": datetime.utcnow()
        })

    # Fetch author details for response
    author = db.users.find_one({"_id": ObjectId(user_id)})
    
    return CommentResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        author_name=author.get("full_name") or author.get("email", "Unknown") if author else "Unknown",
        author_profile_pic=author.get("profile_pic") if author else None,
        content=comment.content,
        created_at=doc["created_at"].isoformat()
    )
@router.post("/{post_id}/report")
def report_post(post_id: str, user_id: str = Body(..., embed=True)):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established")
    
    # 1. Find the post in approved posts
    post = db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        # Check if already in pending/rejected
        existing_pending = db.pending_posts.find_one({"_id": ObjectId(post_id)})
        if existing_pending:
            return {"message": "Post already reported or under review"}
        raise HTTPException(status_code=404, detail="Post not found")

    # 2. Update status and move to pending_posts (hide from public)
    timestamp = datetime.utcnow().isoformat()
    moderation_updates = {
        "status": "rejected",
        "rejection_reason": "The post has been deleted for violating the app's guidelines",
        "moderated_at": timestamp,
        "moderation_source": "automatic_report_v2"
    }
    
    post.update(moderation_updates)
    db.pending_posts.insert_one(post)
    db.posts.delete_one({"_id": ObjectId(post_id)})
    
    # 3. Notify owner
    db.notifications.insert_one({
        "user_id": post["user_id"],
        "message": "The post has been deleted for violating the app's guidelines",
        "type": "system_violation",
        "post_id": post_id,
        "created_at": datetime.utcnow()
    })
    
    return {"message": "Post reported and removed for review"}
