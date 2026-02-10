import os
from dotenv import load_dotenv
from pymongo import MongoClient
import sys

# Load environment variables
load_dotenv()

# Get MongoDB URI
start_uri = os.getenv("MONGODB_URI")
if not start_uri:
    # Try local default if not set
    start_uri = "mongodb://localhost:27017"

print(f"Connecting to MongoDB: {start_uri}")

try:
    client = MongoClient(start_uri)
    db = client.get_database("mindrise")  # Assuming database name is mindrise, check config.py if unsure
    
    print(f"\n--- Users ({db.users.count_documents({})}) ---")
    for user in db.users.find():
        print(f"ID: {user.get('_id')} (Type: {type(user.get('_id'))}), Email: {user.get('email')}, Role: {user.get('role')}")

    print(f"\n--- Posts ({db.posts.count_documents({})}) ---")
    for post in db.posts.find():
        print(f"ID: {post.get('_id')}, UserID: {post.get('user_id')}, Status: {post.get('status')}, Content: {post.get('content')[:50]}...")

except Exception as e:
    print(f"Error: {e}")
