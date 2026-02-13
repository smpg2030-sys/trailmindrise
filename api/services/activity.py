from datetime import datetime
from database import get_db
from bson import ObjectId

def update_last_active(user_id: str):
    """Updates the last_active_at timestamp for a user."""
    try:
        db = get_db()
        if db is not None:
            db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"last_active_at": datetime.utcnow().isoformat()}}
            )
    except Exception as e:
        print(f"Failed to update activity for {user_id}: {e}")
