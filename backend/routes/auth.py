"""Auth routes: register and login. Users are stored in MongoDB with hashed passwords."""
import bcrypt
import os
import random
import string
from fastapi import APIRouter, HTTPException, BackgroundTasks
from database import get_db
from models import UserRegister, UserLogin, UserResponse
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["auth"])

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
    print(f"Registration request for: {data.email}")
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established. Please check your configuration.")
    
    users = db.users
    existing_user = users.find_one({"email": data.email})
    
    if existing_user:
        if existing_user.get("is_verified"):
            raise HTTPException(status_code=400, detail="Email already registered")
        else:
            # Resend OTP logic could go here, for now just update password/name and resend
            pass

    otp = generate_otp()
    
    doc = {
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name or "",
        "role": "user",
        "is_verified": False,
        "otp": otp
    }
    
    # Update if exists (unverified), else insert
    if existing_user:
        users.update_one({"email": data.email}, {"$set": doc})
    else:
        users.insert_one(doc)

    # Send OTP Email
    message = MessageSchema(
        subject="MindRise Verification OTP",
        recipients=[data.email],
        body=f"Your verification code is: {otp}",
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    # Using background task to not block response
    background_tasks.add_task(fm.send_message, message)

    return {"message": "OTP sent to email. Please verify."}

@router.post("/verify-otp", response_model=UserResponse)
def verify_otp(data: OTPVerify):
    db = get_db()
    if db is None:
         raise HTTPException(status_code=503, detail="Database not available")
    
    user = db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    if user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Mark verified and clear OTP
    db.users.update_one({"email": data.email}, {"$set": {"is_verified": True, "otp": None}})
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name"),
        role=user.get("role", "user"),
        is_verified=True,
        profile_pic=user.get("profile_pic"),
        bio=user.get("bio")
    )

@router.post("/login", response_model=UserResponse)
def login(data: UserLogin):
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not established. Please check your configuration.")
    
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_verified", False):
        raise HTTPException(status_code=403, detail="Email not verified. Please verify your account.")

    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name") or None,
        role=user.get("role", "user"),
        is_verified=True,
        profile_pic=user.get("profile_pic"),
        bio=user.get("bio")
    )

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
        email=user["email"],
        full_name=user.get("full_name"),
        role=user.get("role", "user"),
        is_verified=user.get("is_verified", False),
        profile_pic=user.get("profile_pic"),
        bio=user.get("bio")
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
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio")
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
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio")
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
        email=result["email"],
        full_name=result.get("full_name"),
        role=result.get("role", "user"),
        is_verified=result.get("is_verified", False),
        profile_pic=result.get("profile_pic"),
        bio=result.get("bio")
    )
