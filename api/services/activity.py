from datetime import datetime, timedelta
from database import get_db
from bson import ObjectId

def update_last_active(user_id: str):
    """Updates the last_active_at timestamp and daily streak for a user."""
    try:
        db = get_db()
        if db is not None:
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return

            now = datetime.utcnow()
            today_str = now.date().isoformat()
            
            updates = {"last_active_at": now.isoformat()}
            
            # Streak Logic
            last_streak_date = user.get("last_streak_date")
            current_streak = user.get("streak_count", 0)
            
            if last_streak_date != today_str:
                # If last active was yesterday, increment streak
                yesterday_str = (now.date() - timedelta(days=1)).isoformat()
                
                if last_streak_date == yesterday_str:
                    updates["streak_count"] = current_streak + 1
                else:
                    updates["streak_count"] = 1
                
                updates["last_streak_date"] = today_str

            db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": updates}
            )
    except Exception as e:
        print(f"Failed to update activity for {user_id}: {e}")
