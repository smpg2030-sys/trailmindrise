
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("MONGO_URI")
print(f"Testing connection to: {uri.split('@')[1] if '@' in uri else uri}")

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("Connection successful!")
except Exception as e:
    print(f"Connection failed: {e}")
