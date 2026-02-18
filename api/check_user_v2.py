import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

client = pymongo.MongoClient(MONGO_URI)
db = client[DB_NAME]

email = "madhav200320@gmail.com"
user = db.users.find_one({"email": email})

if user:
    db_email = user.get('email')
    print(f"User found!")
    print(f"Email in DB: '{db_email}'")
    print(f"Length: {len(db_email)}")
    if db_email != db_email.strip():
        print("WARNING: Email in DB has whitespace!")
    
    # Check if there are other users with similar email
    similar = db.users.find({"email": {"$regex": "madhav", "$options": "i"}})
    print("\nOther similar emails:")
    for s in similar:
        print(f"- '{s.get('email')}' (Verified: {s.get('is_verified')})")
else:
    print("User not found by exact match.")
