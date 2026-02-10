"""MongoDB connection. Call get_db() to get the database instance."""
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from config import MONGO_URI, DB_NAME

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        if not MONGO_URI or "localhost" in MONGO_URI:
             print("WARNING: MONGO_URI is pointing to localhost or is empty.")
             print("Ensure your .env file has a valid MongoDB Atlas URI.")
        
        try:
            _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            # Verify connection
            _client.admin.command('ping')
            print("Successfully connected to MongoDB.")
        except (ConnectionFailure, ConfigurationError) as e:
            print(f"CRITICAL: Could not connect to MongoDB: {e}")
    return _client


def get_db():
    client = get_client()
    if client:
        return client[DB_NAME]
    return None
