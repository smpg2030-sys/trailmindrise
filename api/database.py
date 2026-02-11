"""MongoDB connection. Call get_db() to get the database instance."""
import sys
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ConfigurationError
from config import MONGO_URI, DB_NAME

_client: MongoClient | None = None


def init_db(db):
    try:
        # Create TTL index on notifications collection for 24-hour expiry
        db.notifications.create_index("created_at", expireAfterSeconds=86400)
        
        # Create TTL index on otp_codes collection for 5-minute expiry
        db.otp_codes.create_index("expires_at", expireAfterSeconds=0)
        
        print("Initialized database indexes.")
    except Exception as e:
        print(f"Warning: Could not initialize database indexes: {e}")

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
            
            # Initialize indexes
            init_db(_client[DB_NAME])
        except (ConnectionFailure, ConfigurationError) as e:
            print(f"CRITICAL: Could not connect to MongoDB: {e}")
            # We don't exit here to allow the app to start, but routes will fail
    return _client


def get_db():
    client = get_client()
    if client:
        return client[DB_NAME]
    return None
