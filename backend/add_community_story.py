from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

def add_story(title, description, content, image_url=None, author="MindRise Community"):
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db.community_stories

    story_data = {
        "title": title,
        "description": description,
        "content": content,
        "image_url": image_url or "/steve_jobs.jpg",
        "author": author,
        "created_at": datetime.utcnow().isoformat()
    }

    # Check if a story with the same title exists
    existing = collection.find_one({"title": story_data["title"]})
    if existing:
        print(f"Story '{story_data['title']}' already exists. Updating...")
        collection.update_one({"_id": existing["_id"]}, {"$set": story_data})
    else:
        collection.insert_one(story_data)
        print(f"Inserted story '{story_data['title']}' successfully.")

if __name__ == "__main__":
    # YOU CAN EDIT THESE VALUES TO ADD A NEW STORY
    NEW_STORY = {
        "title": "Your New Story Title",
        "description": "A short summary of the story.",
        "content": """The full content of the story goes here. 
You can use multiple lines.""",
        "image_url": "https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=2070&auto=format&fit=crop", # Optional
        "author": "MindRise Contributor" # Optional
    }

    add_story(**NEW_STORY)
