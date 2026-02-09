from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load config
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

def view_users():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    users = db.users
    
    print(f"\n--- Registered Users in {DB_NAME} ---")
    all_users = list(users.find())
    
    if not all_users:
        print("No users found in the database.")
        return

    for user in all_users:
        print(f"ID: {user['_id']}")
        print(f"Name: {user.get('full_name', 'N/A')}")
        print(f"Email: {user['email']}")
        print(f"Password Hash: {user['password_hash']} (Encrypted)")
        print("-" * 30)

if __name__ == "__main__":
    view_users()
