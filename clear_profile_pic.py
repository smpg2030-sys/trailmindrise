from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "mindrise")

def clear_pics(email):
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    res = db.users.update_one({"email": email}, {"$set": {"profile_pic": None}})
    print(f"Updated {email}: {res.modified_count} docs.")

if __name__ == "__main__":
    clear_pics("madhav200320@gmail.com")
