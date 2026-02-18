import pymongo
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

email = "madhav200320@gmail.com"
user = db.users.find_one({"email": email})

if user:
    print(f"User found: True")
    print(f"Email: {user.get('email')}")
    print(f"Is verified: {user.get('is_verified')}")
    print(f"Role: {user.get('role')}")
    print(f"Has password hash: { 'password_hash' in user }")
else:
    print(f"User found: False")
    # Try case-insensitive search or other fields
    user_any = db.users.find_one({"email": {"$regex": f"^{email}$", "$options": "i"}})
    if user_any:
         print(f"User found (case-insensitive): True")
         print(f"Actual email in DB: {user_any.get('email')}")
    else:
         print("No user found with that email (even case-insensitive).")
