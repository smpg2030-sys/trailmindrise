from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import UserResponse
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter(prefix="/friends", tags=["friends"])

@router.get("/search", response_model=List[UserResponse])
def search_users(query: str, current_user_id: str = None):
    db = get_db()
    if db is None:
         raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        user_oid = ObjectId(current_user_id) if current_user_id else None
    except:
        user_oid = None

    query_filter = {
        "$or": [
            {"full_name": {"$regex": query, "$options": "i"}},
            {"email": {"$regex": query, "$options": "i"}}
        ]
    }
    
    if user_oid:
        if "$and" not in query_filter:
            query_filter = {"$and": [query_filter]}
        query_filter["$and"].append({"_id": {"$ne": user_oid}})
    
    users_cursor = db.users.find(query_filter).limit(20)
    
    results = []
    for user in users_cursor:
        results.append(UserResponse(
            id=str(user["_id"]),
            email=user["email"],
            full_name=user.get("full_name"),
            role=user.get("role", "user"),
            is_verified=user.get("is_verified", False),
            profile_pic=user.get("profile_pic"),
            created_at=ObjectId(user["_id"]).generation_time.isoformat()
        ))
    return results

@router.post("/request")
def send_friend_request(from_user_id: str, to_user_id: str):
    db = get_db()
    
    if from_user_id == to_user_id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    
    # Check if already friends
    existing_friendship = db.friends.find_one({
        "status": "accepted",
        "$or": [
            {"sender_id": from_user_id, "receiver_id": to_user_id},
            {"sender_id": to_user_id, "receiver_id": from_user_id}
        ]
    })
    if existing_friendship:
        return {"message": "Already friends"}

    # Check if request already pending
    existing_request = db.friends.find_one({
        "sender_id": from_user_id,
        "receiver_id": to_user_id,
        "status": "pending"
    })
    if existing_request:
        return {"message": "Request already pending"}

    # Create request
    db.friends.insert_one({
        "sender_id": from_user_id,
        "receiver_id": to_user_id,
        "status": "pending",
        "created_at": datetime.utcnow()
    })

    # Send notification
    sender = db.users.find_one({"_id": ObjectId(from_user_id)})
    sender_name = sender.get("full_name") or sender.get("email", "Someone")
    
    db.notifications.insert_one({
        "user_id": to_user_id,
        "message": f"{sender_name} sent you a friend request",
        "type": "friend_request",
        "sender_id": from_user_id,
        "created_at": datetime.utcnow()
    })

    return {"message": "Friend request sent"}

@router.get("/requests")
def get_friend_requests(user_id: str):
    db = get_db()
    requests_cursor = db.friends.find({
        "receiver_id": user_id,
        "status": "pending"
    }).sort("created_at", -1)
    
    results = []
    for req in requests_cursor:
        user_info = db.users.find_one({"_id": ObjectId(req["sender_id"])})
        if user_info:
            results.append({
                "request_id": str(req["_id"]),
                "from_user_id": req["sender_id"],
                "from_user_name": user_info.get("full_name") or user_info["email"],
                "created_at": req["created_at"].isoformat() if isinstance(req["created_at"], datetime) else req["created_at"]
            })
    return results

@router.post("/respond")
def respond_to_request(request_id: str, action: str): # action: "accept" or "reject"
    db = get_db()
    req = db.friends.find_one({"_id": ObjectId(request_id)})
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if action == "accept":
        db.friends.update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {"status": "accepted", "updated_at": datetime.utcnow()}}
        )
        # Notify sender
        receiver = db.users.find_one({"_id": ObjectId(req["receiver_id"])})
        receiver_name = receiver.get("full_name") or receiver.get("email", "Someone")
        
        db.notifications.insert_one({
            "user_id": req["sender_id"],
            "message": f"{receiver_name} accepted your friend request!",
            "type": "request_accepted",
            "created_at": datetime.utcnow()
        })
        return {"message": "Friend request accepted"}
    else:
        db.friends.delete_one({"_id": ObjectId(request_id)})
        return {"message": "Friend request rejected"}

@router.get("/notifications")
def get_notifications(user_id: str):
    db = get_db()
    notifications = db.notifications.find({"user_id": user_id}).sort("created_at", -1)
    results = []
    for n in notifications:
        results.append({
            "id": str(n["_id"]),
            "message": n["message"],
            "type": n["type"],
            "created_at": n["created_at"].isoformat() if isinstance(n["created_at"], datetime) else n["created_at"]
        })
    return results

@router.get("/list")
def list_friends(user_id: str):
    db = get_db()
    friendships = db.friends.find({
        "status": "accepted",
        "$or": [
            {"sender_id": user_id},
            {"receiver_id": user_id}
        ]
    })
    
    friend_ids = []
    for f in friendships:
        friend_ids.append(f["receiver_id"] if f["sender_id"] == user_id else f["sender_id"])
    
    friends_info = []
    if friend_ids:
        users = db.users.find({"_id": {"$in": [ObjectId(fid) for fid in friend_ids]}})
        for u in users:
            friends_info.append({
                "id": str(u["_id"]),
                "full_name": u.get("full_name"),
                "email": u["email"],
                "profile_pic": u.get("profile_pic"),
                "last_active_at": u.get("last_active_at")
            })
    return friends_info

@router.get("/status")
def get_friend_status(user1_id: str, user2_id: str):
    db = get_db()
    status = db.friends.find_one({
        "$or": [
            {"sender_id": user1_id, "receiver_id": user2_id},
            {"sender_id": user2_id, "receiver_id": user1_id}
        ]
    })
    if not status:
        return {"status": "none"}
    return {"status": status["status"], "sender_id": status["sender_id"]}
