"""Pydantic models for request/response."""
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: EmailStr | None = None
    mobile: str | None = None
    phone_number: str | None = None
    password: str
    full_name: str | None = None
    is_phone_verified: bool = False


class UserLogin(BaseModel):
    email: str # Can be email or mobile
    password: str


class PasswordResetRequest(BaseModel):
    email: str # Can be email or mobile


class PasswordResetConfirm(BaseModel):
    email: str # Can be email or mobile
    otp: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str | None = None
    mobile: str | None = None
    phone_number: str | None = None
    is_phone_verified: bool = False
    role: str = "user"
    full_name: str | None = None
    is_verified: bool = False
    profile_pic: str | None = None
    bio: str | None = None
    created_at: str | None = None


class OTPRequest(BaseModel):
    phone_number: str


class OTPVerifyRequest(BaseModel):
    phone_number: str
    otp: str


class PostCreate(BaseModel):
    content: str
    image_url: str | None = None
    video_url: str | None = None


class PostResponse(BaseModel):
    id: str
    user_id: str
    author_name: str
    content: str
    image_url: str | None = None
    video_url: str | None = None
    author_email: str | None = None
    author_profile_pic: str | None = None
    status: str  # "pending", "approved", "rejected"
    created_at: str
    rejection_reason: str | None = None

class VideoCreate(BaseModel):
    title: str | None = None
    caption: str | None = None
    video_url: str
    user_id: str
    author_name: str

class VideoResponse(BaseModel):
    id: str
    user_id: str
    author_name: str
    author_email: str | None = None
    title: str | None = None
    caption: str | None = None
    video_url: str
    status: str  # "pending", "approved", "rejected"
    created_at: str
    rejection_reason: str | None = None


class NewsArticle(BaseModel):
    article_id: str
    title: str
    short_description: str
    content: str
    image_url: str | None = None
    author: str
    published_at: str


class CommunityStoryCreate(BaseModel):
    title: str
    description: str
    content: str
    image_url: str | None = None
    author: str | None = None


class CommunityStory(BaseModel):
    id: str
    title: str
    description: str
    content: str
    image_url: str | None = None
    author: str | None = None
    created_at: str


class JournalEntryCreate(BaseModel):
    title: str | None = None
    content: str
    date: str | None = None  # ISO format


class JournalEntryResponse(BaseModel):
    id: str
    user_id: str
    title: str | None = None
    content: str
    date: str
    created_at: str
