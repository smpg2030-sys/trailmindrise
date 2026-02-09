"""MongoDB connection. Call get_db() to get the database instance."""
from pymongo import MongoClient
from config import MONGO_URI, DB_NAME

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client


def get_db():
    return get_client()[DB_NAME]
