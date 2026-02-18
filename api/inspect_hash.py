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
    pwd_hash = user.get('password_hash')
    print(f"User: {email}")
    print(f"Hash: {pwd_hash}")
    if pwd_hash:
        print(f"Hash length: {len(pwd_hash)}")
        print(f"Starts with $2b$: {pwd_hash.startswith('$2b$')}")
        print(f"Starts with $2a$: {pwd_hash.startswith('$2a$')}")
else:
    print("User not found.")
