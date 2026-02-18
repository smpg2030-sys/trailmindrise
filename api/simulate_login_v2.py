import bcrypt
import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

email = "madhav200320@gmail.com"
test_password = "tempPassword123"

# Find user (the new logic in auth.py strips and lowers)
identifier = email.strip().lower()
user = db.users.find_one({"email": identifier})
if not user:
    user = db.users.find_one({"mobile": identifier})

print(f"User found: {user is not None}")
if user:
    pwd_hash = user.get('password_hash')
    match = verify_password(test_password, pwd_hash)
    print(f"Password Match: {match}")
    print(f"Is verified: {user.get('is_verified')}")
    print(f"Role: {user.get('role')}")
else:
    print("User not found.")
