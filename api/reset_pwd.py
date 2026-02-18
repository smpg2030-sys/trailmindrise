import bcrypt
import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

email = "madhav200320@gmail.com"
new_password = "tempPassword123"

pwd_hash = hash_password(new_password)

result = db.users.update_one(
    {"email": email},
    {"$set": {"password_hash": pwd_hash}}
)

if result.matched_count > 0:
    print(f"Password for {email} reset successfully to '{new_password}'.")
else:
    print(f"User {email} not found.")
