"""Auth routes: register and login. Users are stored in MongoDB with hashed passwords."""
import bcrypt
import os
import random
import string
from fastapi import APIRouter, HTTPException, BackgroundTasks
from bson import ObjectId
from database import get_db
from models import UserRegister, UserLogin, UserResponse, PasswordResetRequest, PasswordResetConfirm, OTPRequest, OTPVerifyRequest
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import BaseModel, EmailStr
from services.sms import SMSService

router = APIRouter(prefix="/auth", tags=["auth"])

from datetime import datetime, timedelta

# Email Configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("EMAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("EMAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("EMAIL_FROM", "noreply@mindrise.com"),
    MAIL_PORT=int(os.getenv("EMAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("EMAIL_HOST", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=6))

@router.post("/register")
async def register(data: UserRegister, background_tasks: BackgroundTasks):
    print(f"Registration request for: {data.email or data.mobile}")
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established. Please check your configuration.")
    
    if not data.email and not data.mobile:
        raise HTTPException(status_code=400, detail="Either email or mobile is required")

    users = db.users
    existing_user = None
    if data.email:
        existing_user = users.find_one({"email": data.email})
    
    if not existing_user and data.mobile:
        existing_user = users.find_one({"mobile": data.mobile})
    
    if existing_user:
        if existing_user.get("is_verified"):
            raise HTTPException(status_code=400, detail="Account already registered")
        else:
            # Resend OTP logic could go here
            pass

    otp = generate_otp()
    
    doc = {
        "email": data.email,
        "mobile": data.mobile,
        "phone_number": data.phone_number,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name or "",
        "role": "user",
        "is_verified": False,
        "is_phone_verified": getattr(data, "is_phone_verified", False),
        "otp": otp
    }
    
    # Update if exists (unverified), else insert
    if existing_user:
        if data.email:
            users.update_one({"email": data.email}, {"$set": doc})
        else:
            users.update_one({"mobile": data.mobile}, {"$set": doc})
    else:
        users.insert_one(doc)


    # Send OTP
    if data.email:
        message = MessageSchema(
            subject="MindRise Verification OTP",
            recipients=[data.email],
            body=f"Your verification code is: {otp}",
            subtype=MessageType.html
        )
        fm = FastMail(conf)
        background_tasks.add_task(fm.send_message, message)
        return {"message": "OTP sent to email. Please verify."}
    else:
        # Send SMS via Service
        SMSService.send_otp(data.mobile, otp)
        return {"message": "OTP sent to mobile. Please verify."}

@router.post("/send-otp")
async def send_otp(data: OTPRequest):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    
    # Store OTP with attempt counter and expiry
    db.otp_codes.update_one(
        {"phone_number": data.phone_number},
        {"$set": {
            "otp": otp,
            "expires_at": expires_at,
            "attempts": 0
        }},
        upsert=True
    )
    
    # Send via Twilio
    success = SMSService.send_otp(data.phone_number, otp)
    if not success:
        # If Twilio fails, we still return success if mock is on, 
        # but here we'll just say we sent it (SMSService handles printing to logs)
        pass
        
    return {"message": "OTP sent successfully", "expires_in": "5 minutes"}

@router.post("/verify-otp-phone")
async def verify_otp_phone(data: OTPVerifyRequest):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    otp_record = db.otp_codes.find_one({"phone_number": data.phone_number})
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="OTP not found or expired")
    
    if otp_record["attempts"] >= 5:
        raise HTTPException(status_code=400, detail="Maximum attempts reached. Please request a new OTP.")
    
    if datetime.utcnow() > otp_record["expires_at"]:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    if otp_record["otp"] != data.otp:
        # Increment attempts
        db.otp_codes.update_one({"phone_number": data.phone_number}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Success - Mark verified in user record if user exists, or just return success
    # If the user is logging in/signing up per the flow, we might need to find them
    user = db.users.find_one({"phone_number": data.phone_number})
    if user:
        db.users.update_one({"_id": user["_id"]}, {"$set": {"is_phone_verified": True}})
    
    # Clear OTP
    db.otp_codes.delete_one({"phone_number": data.phone_number})
    
    return {"message": "Phone number verified successfully"}

@router.post("/verify-otp", response_model=UserResponse)
def verify_otp(data: OTPVerify):
    db = get_db()
    if db is None:
         raise HTTPException(status_code=503, detail="Database not available")
    
    user = db.users.find_one({"email": data.email})
    
    # If not found by email, try finding by mobile (data.email might be holding the mobile number string)
    if not user:
        user = db.users.find_one({"mobile": data.email})

    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    if user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Mark verified and clear OTP
    db.users.update_one({"_id": user["_id"]}, {"$set": {"is_verified": True, "otp": None}})
    
    return UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        mobile=user.get("mobile"),
        is_phone_verified=user.get("is_phone_verified", False),
        phone_number=user.get("phone_number"),
        full_name=user.get("full_name"),
        role=user.get("role", "user"),
        is_verified_host=user.get("is_verified_host", False),
        host_status=user.get("host_status", "none"),
        is_verified=True,
        profile_pic=user.get("profile_pic"),
        bio=user.get("bio"),
        streak_count=user.get("streak_count", 0),
        last_active_at=user.get("last_active_at"),
        last_streak_date=user.get("last_streak_date"),
        created_at=ObjectId(user["_id"]).generation_time.isoformat()
    )

@router.post("/login", response_model=UserResponse)
def login(data: UserLogin):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established. Please check your configuration.")
    
    # Try finding by email
    user = db.users.find_one({"email": data.email})
    # If not found, try finding by mobile
    if not user:
        user = db.users.find_one({"mobile": data.email})

    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Account not verified.")

    # Update Activity
    from services.activity import update_last_active
    update_last_active(str(user["_id"]))

    return UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        mobile=user.get("mobile"),
        phone_number=user.get("phone_number"),
        is_phone_verified=user.get("is_phone_verified", False),
        full_name=user.get("full_name") or None,
        role=user.get("role", "user"),
        is_verified_host=user.get("is_verified_host", False),
        host_status=user.get("host_status", "none"),
        is_verified=True,
        profile_pic=user.get("profile_pic"),
        bio=user.get("bio"),
        streak_count=user.get("streak_count", 0),
        last_active_at=user.get("last_active_at"),
        last_streak_date=user.get("last_streak_date"),
        created_at=ObjectId(user["_id"]).generation_time.isoformat()
    )
@router.post("/forgot-password")
async def forgot_password(data: PasswordResetRequest, background_tasks: BackgroundTasks):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user = db.users.find_one({"email": data.email})
    if not user:
        # Don't reveal if user exists or not for security, but for now we'll just say "If email exists..."
        return {"message": "If this email is registered, you will receive an OTP."}
    
    otp = generate_otp()
    
    # Store OTP in user doc (reusing otp field)
    db.users.update_one({"email": data.email}, {"$set": {"otp": otp}})
    
    # Send Email
    message = MessageSchema(
        subject="MindRise Password Reset OTP",
        recipients=[data.email],
        body=f"Your password reset code is: {otp}",
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)
    
    return {"message": "OTP sent to email."}


@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm, background_tasks: BackgroundTasks):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    user = db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
        
    if user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Update password and clear OTP
    new_hash = hash_password(data.new_password)
    db.users.update_one(
        {"email": data.email}, 
        {"$set": {"password_hash": new_hash, "otp": None}}
    )
    
    # Send Confirmation Email
    message = MessageSchema(
        subject="MindRise: Password Changed Successfully",
        recipients=[data.email],
        body=f"Hello,\n\nYour password for MindRise has been successfully changed. If you did not request this change, please contact support immediately.",
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    background_tasks.add_task(fm.send_message, message)
    
    return {"message": "Password updated successfully"}
@router.get("/user/{user_id}", response_model=UserResponse)
def get_user(user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    from bson import ObjectId
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid User ID")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        email=user.get("email"),
        mobile=user.get("mobile"),
        full_name=user.get("full_name"),
        role=user.get("role", "user"),
        is_verified_host=user.get("is_verified_host", False),
        host_status=user.get("host_status", "none"),
        seller_status=user.get("seller_status", "none"),
        business_name=user.get("business_name"),
        is_verified=user.get("is_verified", False),
        profile_pic=user.get("profile_pic"),
        bio=user.get("bio"),
        streak_count=user.get("streak_count", 0),
        last_active_at=user.get("last_active_at"),
        last_streak_date=user.get("last_streak_date"),
        created_at=ObjectId(user["_id"]).generation_time.isoformat()
    )

class ProfilePicUpdate(BaseModel):
    profile_pic: str # Base64 string

@router.put("/user/{user_id}/profile-pic", response_model=UserResponse)
def update_profile_pic(user_id: str, data: ProfilePicUpdate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    result = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"profile_pic": data.profile_pic}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(result["_id"]),
        email=result["email"],
        full_name=result.get("full_name"),
        role=result.get("role", "user"),
        is_verified_host=result.get("is_verified_host", False),
        host_status=result.get("host_status", "none"),
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio"),
        streak_count=result.get("streak_count", 0),
        last_active_at=result.get("last_active_at"),
        last_streak_date=result.get("last_streak_date"),
        created_at=ObjectId(result["_id"]).generation_time.isoformat()
    )

@router.delete("/user/{user_id}/profile-pic", response_model=UserResponse)
def delete_profile_pic(user_id: str):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    result = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"profile_pic": None}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(result["_id"]),
        email=result["email"],
        full_name=result.get("full_name"),
        role=result.get("role", "user"),
        is_verified_host=result.get("is_verified_host", False),
        host_status=result.get("host_status", "none"),
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio"),
        streak_count=result.get("streak_count", 0),
        last_active_at=result.get("last_active_at"),
        last_streak_date=result.get("last_streak_date"),
        created_at=ObjectId(result["_id"]).generation_time.isoformat()
    )

class BioUpdate(BaseModel):
    bio: str | None = None

@router.put("/user/{user_id}/bio", response_model=UserResponse)
def update_bio(user_id: str, data: BioUpdate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    result = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": {"bio": data.bio}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(result["_id"]),
        email=result.get("email"),
        mobile=result.get("mobile"),
        full_name=result.get("full_name"),
        role=result.get("role", "user"),
        is_verified_host=result.get("is_verified_host", False),
        host_status=result.get("host_status", "none"),
        seller_status=result.get("seller_status", "none"),
        business_name=result.get("business_name"),
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio"),
        streak_count=result.get("streak_count", 0),
        last_active_at=result.get("last_active_at"),
        last_streak_date=result.get("last_streak_date"),
        created_at=ObjectId(result["_id"]).generation_time.isoformat()
    )
class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None

@router.put("/user/{user_id}/profile", response_model=UserResponse)
def update_profile(user_id: str, data: UserUpdate):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available")
    
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid User ID")
    
    # Check for email duplication if email is being updated
    if data.email:
        existing = db.users.find_one({"email": data.email})
        if existing and str(existing["_id"]) != user_id:
             raise HTTPException(status_code=400, detail="Email already in use")

    update_data = {}
    if data.email:
        update_data["email"] = data.email
    if data.full_name:
        update_data["full_name"] = data.full_name
        
    if not update_data:
         raise HTTPException(status_code=400, detail="No data provided")

    result = db.users.find_one_and_update(
        {"_id": oid},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(result["_id"]),
        email=result.get("email"),
        mobile=result.get("mobile"),
        full_name=result.get("full_name"),
        role=result.get("role", "user"),
        is_verified_host=result.get("is_verified_host", False),
        host_status=result.get("host_status", "none"),
        seller_status=result.get("seller_status", "none"),
        business_name=result.get("business_name"),
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio"),
        streak_count=result.get("streak_count", 0),
        last_active_at=result.get("last_active_at"),
        last_streak_date=result.get("last_streak_date"),
        created_at=ObjectId(result["_id"]).generation_time.isoformat()
    )
