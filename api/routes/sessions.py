from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from database import get_db
from session_models import RoomCreate, RoomResponse, SessionAttendance, SessionPayment, HostEarnings
from bson import ObjectId
from datetime import datetime, timedelta
import secrets
import time

router = APIRouter(prefix="/sessions", tags=["sessions"])

def generate_session_token(room_id: str, user_id: str):
    # Mock token generation for a live room
    return f"token_{room_id}_{user_id}_{secrets.token_hex(8)}"

def calculate_and_process_payout(room_id: str):
    """Wait 5 minutes, then calculate earnings and process payout."""
    # Note: In a real production environment, this would be a celery task or similar.
    # For this implementation, we use a simple sleep in a background task (FastAPI BackgroundTasks).
    time.sleep(300) # 5-minute buffer
    
    db = get_db()
    if not db: return
    
    room = db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room or room.get("status") != "ended": return
    
    # 1. Validate attendance
    # Rules: paymentStatus === "success", stayDuration >= 5 minutes, unique per user
    attendees = list(db.session_attendance.find({
        "room_id": room_id,
        "stay_duration": {"$gte": 5}
    }))
    
    unique_user_ids = set()
    valid_count = 0
    for a in attendees:
        if a["user_id"] not in unique_user_ids:
            # Check payment if paid session
            if room["access"] == "paid":
                payment = db.session_payments.find_one({
                    "room_id": room_id, 
                    "user_id": a["user_id"],
                    "payment_status": "success"
                })
                if payment:
                    valid_count += 1
                    unique_user_ids.add(a["user_id"])
            else:
                valid_count += 1
                unique_user_ids.add(a["user_id"])

    # 2. Calculate commission
    price = room.get("price", 0.0)
    gross = valid_count * price
    commission = gross * 0.10
    net = gross - commission
    
    # 3. Store Host Earnings
    earnings_doc = {
        "host_id": room["host_id"],
        "room_id": room_id,
        "gross_amount": gross,
        "commission_amount": commission,
        "net_amount": net,
        "payout_status": "completed", # Simulated instant payout
        "processed_at": datetime.utcnow().isoformat()
    }
    db.host_earnings.insert_one(earnings_doc)
    
    # 4. Update room stats
    db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$set": {
            "total_attendees": valid_count,
            "total_revenue": gross,
            "platform_commission": commission
        }}
    )

@router.post("/rooms", response_model=RoomResponse)
def create_room(room: RoomCreate, user_id: str):
    db = get_db()
    if db is None: raise HTTPException(status_code=503, detail="Database connection error")
    
    # Security: Validate role and verification status
    user = db.users.find_one({"_id": ObjectId(user_id)})
    allowed_roles = ["host", "admin"]
    if not user or user.get("role") not in allowed_roles or not user.get("is_verified_host"):
        raise HTTPException(status_code=403, detail="Only verified hosts can create rooms")
    
    doc = room.dict()
    doc["host_id"] = user_id
    doc["status"] = "upcoming"
    doc["total_attendees"] = 0
    doc["total_revenue"] = 0.0
    doc["platform_commission"] = 0.0
    doc["created_at"] = datetime.utcnow().isoformat()
    
    result = db.rooms.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return doc

@router.get("/rooms", response_model=list[RoomResponse])
def get_rooms(status: str = "live"):
    db = get_db()
    if db is None: return []
    rooms = list(db.rooms.find({"status": status}))
    for r in rooms: r["id"] = str(r["_id"])
    return rooms

@router.post("/join")
def join_room(room_id: str, user_id: str):
    db = get_db()
    if db is None: raise HTTPException(status_code=503, detail="Database connection error")
    
    room = db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room: raise HTTPException(status_code=404, detail="Room not found")
    
    if room["status"] == "ended":
        raise HTTPException(status_code=400, detail="Session has already ended")
        
    # Payment check for paid sessions
    if room["access"] == "paid" and room["host_id"] != user_id:
        payment = db.session_payments.find_one({
            "room_id": room_id,
            "user_id": user_id,
            "payment_status": "success"
        })
        if not payment:
            raise HTTPException(status_code=402, detail="Payment required to join this session")
            
    # Success: Generate token
    token = generate_session_token(room_id, user_id)
    
    # Record join time (Prevent multiple joins per user by updating)
    db.session_attendance.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "joined_at": datetime.utcnow().isoformat(),
            "payment_status": "paid" if room["access"] == "paid" else "free",
            "stay_duration": 0
        }},
        upsert=True
    )
    
    return {"token": token, "roomId": room_id}

@router.post("/leave")
def leave_room(room_id: str, user_id: str):
    db = get_db()
    if db is None: raise HTTPException(status_code=503, detail="Database connection error")
    
    attendance = db.session_attendance.find_one({"room_id": room_id, "user_id": user_id})
    if not attendance: return {"message": "No attendance record found"}
    
    leave_at = datetime.utcnow()
    joined_at = datetime.fromisoformat(attendance["joined_at"])
    duration = int((leave_at - joined_at).total_seconds() / 60)
    
    db.session_attendance.update_one(
        {"room_id": room_id, "user_id": user_id},
        {"$set": {
            "left_at": leave_at.isoformat(),
            "stay_duration": duration
        }}
    )
    return {"message": "Left session", "duration_minutes": duration}

@router.post("/end")
def end_room(room_id: str, host_id: str, background_tasks: BackgroundTasks):
    db = get_db()
    if db is None: raise HTTPException(status_code=503, detail="Database connection error")
    
    room = db.rooms.find_one({"_id": ObjectId(room_id), "host_id": host_id})
    if not room: raise HTTPException(status_code=404, detail="Room not found or unauthorized")
    
    db.rooms.update_one({"_id": ObjectId(room_id)}, {"$set": {"status": "ended"}})
    
    # Trigger payout logic in background with 5 min delay
    background_tasks.add_task(calculate_and_process_payout, room_id)
    
    return {"message": "Session ended. Payout will be processed after validation."}

@router.post("/pay")
def process_session_payment(room_id: str, user_id: str, amount: float):
    db = get_db()
    if db is None: raise HTTPException(status_code=503, detail="Database connection error")
    
    # Mock payment processing
    payment_doc = {
        "user_id": user_id,
        "room_id": room_id,
        "amount": amount,
        "transaction_id": f"txn_{secrets.token_hex(8)}",
        "payment_status": "success",
        "created_at": datetime.utcnow().isoformat()
    }
    db.session_payments.insert_one(payment_doc)
    return {"message": "Payment successful", "transactionId": payment_doc["transaction_id"]}
