from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class RoomCreate(BaseModel):
    title: str
    type: str  # "group" | "private"
    access: str # "free" | "paid"
    price: float = 0.0
    scheduled_at: str # ISO format
    duration: int # in minutes

class RoomResponse(BaseModel):
    id: str
    host_id: str
    title: str
    type: str
    access: str
    price: float
    scheduled_at: str
    duration: int
    status: str # "upcoming" | "live" | "ended"
    total_attendees: int = 0
    total_revenue: float = 0.0
    platform_commission: float = 0.0
    created_at: str

class SessionAttendance(BaseModel):
    room_id: str
    user_id: str
    joined_at: str
    left_at: Optional[str] = None
    stay_duration: int = 0 # in minutes
    payment_status: str # "paid" | "free"

class SessionPayment(BaseModel):
    user_id: str
    room_id: str
    amount: float
    transaction_id: str
    payment_status: str # "success" | "failed"
    created_at: str

class HostEarnings(BaseModel):
    host_id: str
    room_id: str
    gross_amount: float
    commission_amount: float
    net_amount: float
    payout_status: str # "processing" | "completed"
