from pymongo import MongoClient
import os
from dotenv import load_dotenv
import bcrypt

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

def check_user(email):
    print(f"Connecting to {MONGO_URI}...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("Connected successfully.")
        
        db = client[DB_NAME]
        user = db.users.find_one({"email": email})
        
        if not user:
            print(f"User {email} NOT FOUND in database.")
            # List all users to see what we have
            all_users = list(db.users.find({}, {"email": 1, "role": 1}))
            print(f"Total users: {len(all_users)}")
            for u in all_users:
                print(f" - {u.get('email')}")
            return

        print("User found:")
        print(f"  Email: {user.get('email')}")
        print(f"  Role: {user.get('role')}")
        print(f"  Is Verified: {user.get('is_verified')}")
        has_hash = "password_hash" in user
        print(f"  Has password_hash: {has_hash}")
        
        if has_hash:
            # Test a password
            test_pass = "password123"
            try:
                matches = bcrypt.checkpw(test_pass.encode("utf-8"), user["password_hash"].encode("utf-8"))
                print(f"  Password '{test_pass}' matches: {matches}")
            except Exception as e:
                print(f"  Error verifying password: {e}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user("madhav200320@gmail.com")
