"""Pydantic models for request/response."""
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: str = "user"
    full_name: str | None = None
    is_verified: bool = False
    profile_pic: str | None = None
    bio: str | None = None


class PostCreate(BaseModel):
    content: str
    image_url: str | None = None


class PostResponse(BaseModel):
    id: str
    user_id: str
    author_name: str
    author_email: str | None = None
    author_profile_pic: str | None = None
    content: str
    image_url: str | None = None
    status: str  # "pending", "approved", "rejected"
    created_at: str
    rejection_reason: str | None = None
