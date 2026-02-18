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
    print(f"User: {email}")
    print(f"Created at: {user['_id'].generation_time}")
else:
    print("User not found.")
