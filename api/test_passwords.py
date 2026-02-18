import bcrypt
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
    # Try a few potential passwords if you have any in mind, or just one
    test_passwords = ["madhav2030", "madhav@2030", "madhav200320"]
    
    for tp in test_passwords:
        is_match = bcrypt.checkpw(tp.encode('utf-8'), pwd_hash.encode('utf-8'))
        print(f"Password '{tp}': {'MATCH' if is_match else 'NO MATCH'}")
else:
    print("User not found.")
