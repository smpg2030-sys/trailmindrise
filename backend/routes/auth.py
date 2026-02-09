"""Auth routes: register and login. Users are stored in MongoDB with hashed passwords."""
import bcrypt
from fastapi import APIRouter, HTTPException
from database import get_db
from models import UserRegister, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


@router.post("/register", response_model=UserResponse)
def register(data: UserRegister):
    db = get_db()
    users = db.users
    if users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name or "",
    }
    result = users.insert_one(doc)
    return UserResponse(
        id=str(result.inserted_id),
        email=data.email,
        full_name=doc["full_name"] or None,
    )


@router.post("/login", response_model=UserResponse)
def login(data: UserLogin):
    db = get_db()
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user.get("full_name") or None,
    )
