from fastapi import APIRouter, HTTPException, Depends
from typing import List
from database import get_db
from models import CommunityStory, CommunityStoryCreate
from bson import ObjectId
from datetime import datetime

router = APIRouter()

def story_helper(story) -> dict:
    return {
        "id": str(story["_id"]),
        "title": story.get("title"),
        "description": story.get("description"),
        "content": story.get("content"),
        "image_url": story.get("image_url"),
        "author": story.get("author"),
        "created_at": story.get("created_at")
    }

@router.get("/", response_model=List[CommunityStory])
async def get_stories():
    db = get_db()
    stories_cursor = db.community_stories.find().sort("created_at", -1)
    stories = []
    for story in stories_cursor:
        stories.append(story_helper(story))
    return stories

@router.get("/{id}", response_model=CommunityStory)
async def get_story(id: str):
    db = get_db()
    try:
        story = db.community_stories.find_one({"_id": ObjectId(id)})
        if story:
            return story_helper(story)
        raise HTTPException(status_code=404, detail="Story not found")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

@router.post("/", response_model=CommunityStory)
async def create_story(story: CommunityStoryCreate):
    db = get_db()
    new_story = story.dict()
    new_story["created_at"] = datetime.utcnow().isoformat()
    
    result = db.community_stories.insert_one(new_story)
    created_story = db.community_stories.find_one({"_id": result.inserted_id})
    return story_helper(created_story)
