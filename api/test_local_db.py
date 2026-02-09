
from pymongo import MongoClient

uri = "mongodb://localhost:27017/"
print(f"Testing connection to: {uri}")

try:
    client = MongoClient(uri, serverSelectionTimeoutMS=2000)
    client.admin.command('ping')
    print("Local Connection successful!")
except Exception as e:
    print(f"Local Connection failed: {e}")
