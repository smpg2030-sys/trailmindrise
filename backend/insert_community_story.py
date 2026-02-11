from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "mindrise")

def insert_steve_jobs_story():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    collection = db.community_stories

    # Clear existing stories to avoid duplicates for this specific task
    # collection.delete_many({}) 

    story_data = {
        "title": "The Greatest Human Brains",
        "description": "The man who created a revolution and made a strong mark",
        "content": """Steve was born on February 24, 1955, in San Francisco, California. He lived in Mountain View, California, this place was later renamed the Silicon Valley. During his childhood, Jobs and his father worked on electronic equipment in the family garage. His father used to demonstrate to him how to take apart and reconstruct electronics. This hobby instilled confidence, tenacity, and mechanical prowess in Jobs. Therefore, the path to excellence started to off from his family’s garage.

Jobs was always an intelligent and innovative thinker since his childhood. However, his youth was struck in the quicksand of formal schooling education. Due to the boredom, he was a prankster during his days in elementary school, and hence, his fourth-grade teacher needed to bribe him to study. He tested so well that the administrators wanted him to skip ahead to high school. However, his parents declined that offer.

Post high school, Steve enrolled at Reed College in Portland, Oregon. There too, he was frustrated and dropped out of college and spent the next year and a half dropping in on creative classes at the school. He had developed a love of typography during his struggling days.""",
        "image_url": "/steve_jobs.jpg",
        "author": "MindRise Community",
        "created_at": datetime.utcnow().isoformat()
    }

    # Check if exists
    existing = collection.find_one({"title": story_data["title"]})
    if existing:
        print(f"Story '{story_data['title']}' already exists. Updating...")
        collection.update_one({"_id": existing["_id"]}, {"$set": story_data})
    else:
        collection.insert_one(story_data)
        print(f"Inserted story '{story_data['title']}' successfully.")

if __name__ == "__main__":
    insert_steve_jobs_story()
