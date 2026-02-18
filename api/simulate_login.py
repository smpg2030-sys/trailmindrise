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
# Let's assume the user is typing 'madhav2030' or similar
test_password = "madhav2030" 

user = db.users.find_one({"email": email})
if not user:
    user = db.users.find_one({"mobile": email})

print(f"User found: {user is not None}")
if user:
    pwd_hash = user.get('password_hash')
    match = verify_password(test_password, pwd_hash)
    print(f"Password '{test_password}' match: {match}")
    print(f"Is verified: {user.get('is_verified')}")
else:
    print("User not found by email or mobile.")
