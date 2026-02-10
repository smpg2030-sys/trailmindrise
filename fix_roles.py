import os
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()

# Get MongoDB URI
start_uri = os.getenv("MONGODB_URI")
if not start_uri:
    start_uri = "mongodb://localhost:27017"

print(f"Connecting to MongoDB: {start_uri}")

try:
    client = MongoClient(start_uri)
    db = client.get_database("mindrise")
    users = db.users

    # 1. Set default role 'user' for anyone missing a role
    result = users.update_many(
        {"role": {"$exists": False}},
        {"$set": {"role": "user"}}
    )
    print(f"Updated {result.modified_count} users to default role 'user'.")
    
    # Also update if role is None
    result_none = users.update_many(
        {"role": None},
        {"$set": {"role": "user"}}
    )
    print(f"Updated {result_none.modified_count} users from None to 'user'.")

    # 2. Set 'admin' role for specific email
    admin_email = "admin@mindrise.com"
    result_admin = users.update_one(
        {"email": admin_email},
        {"$set": {"role": "admin"}}
    )
    if result_admin.modified_count > 0:
        print(f"Promoted {admin_email} to 'admin'.")
    else:
        print(f"{admin_email} already admin or not found.")

    # Verify
    print("\n--- Verified Users ---")
    for user in users.find():
        print(f"Email: {user.get('email')}, Role: {user.get('role')}")

except Exception as e:
    print(f"Error: {e}")
