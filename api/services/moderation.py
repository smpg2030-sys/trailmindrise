from config import GEMINI_API_KEY, SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET
from datetime import datetime
import requests
import json
import re
import time

def is_obviously_safe(text: str) -> bool:
    """Check for extremely safe/motivational keywords."""
    safe_patterns = [
        r"(?i)\b(peace|mindful|meditation|breathe|calm|gratitude|love|joy|happiness)\b",
        r"(?i)\b(good morning|have a great day|stay positive|keep going)\b"
    ]
    return any(re.search(p, text) for p in safe_patterns) and len(text.split()) < 50

def is_obviously_harmful(text: str) -> bool:
    """Check for obvious profanity or spam patterns."""
    harmful_patterns = [
        r"(?i)\b(fuck|shit|bitch|asshole|faggot|nigger|kill yourself)\b", # Basic profanity
        r"(?i)\b(earn \d+\$|make money fast|click here|buy now|bitcoin|crypto scam)\b" # Spam
    ]
    return any(re.search(p, text) for p in harmful_patterns)

def check_with_sightengine(text: str, image_url: str | None = None, video_url: str | None = None) -> dict | None:
    """Specialized moderation via Sightengine (High efficiency for media)."""
    if not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET:
        return None

    try:
        # 1. Text Moderation
        if text:
            text_params = {
                'text': text,
                'lang': 'en',
                'mode': 'standard',
                'api_user': SIGHTENGINE_API_USER,
                'api_secret': SIGHTENGINE_API_SECRET
            }
            res = requests.post('https://api.sightengine.com/1.0/text/check.json', data=text_params, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get('status') == 'success':
                    profanity = data.get('profanity', {}).get('matches', [])
                    if profanity:
                        return {
                            "score": 0.95,
                            "status": "rejected",
                            "category": "profanity",
                            "details": [f"Harmful language detected: {', '.join([p['type'] for p in profanity])}"]
                        }

        # 2. Image Moderation (Aggressive Detection)
        if image_url:
            image_params = {
                'models': 'nudity-2.0,wad,scam,suggestive,gore',
                'url': image_url,
                'api_user': SIGHTENGINE_API_USER,
                'api_secret': SIGHTENGINE_API_SECRET
            }
            res = requests.get('https://api.sightengine.com/1.0/check.json', params=image_params, timeout=15)
            if res.status_code == 200:
                data = res.json()
                if data.get('status') == 'success':
                    # Nudity 2.0 Check (Very aggressive)
                    nudity = data.get('nudity', {})
                    # If high confidence raw or partial nudity -> Instant REJECT
                    if (nudity.get('erotica', 0) > 0.2 or 
                        nudity.get('sexual_display', 0) > 0.2 or 
                        nudity.get('sexting', 0) > 0.2 or
                        nudity.get('raw', 0) > 0.1): # Extremely strict on raw
                        return {"score": 1.0, "status": "rejected", "category": "nudity", "details": ["System detected prohibited visual content."]}
                    
                    # Weapons, Alcohol, Drugs, Gore
                    wad = data.get('weapon', 0) + data.get('alcohol', 0) + data.get('drugs', 0)
                    if wad > 0.5 or data.get('gore', {}).get('prob', 0) > 0.3:
                        return {"score": 1.0, "status": "rejected", "category": "harmful_visuals", "details": ["Content violates community safety guidelines."]}

                    scam = data.get('scam', {}).get('prob', 0)
                    if scam > 0.6:
                        return {"score": 0.9, "status": "rejected", "category": "scam", "details": ["Scam pattern detected."]}

        # 3. Video Moderation (Trigger)
        if video_url:
            video_params = {
                'stream_url': video_url,
                'api_user': SIGHTENGINE_API_USER,
                'api_secret': SIGHTENGINE_API_SECRET
            }
            res = requests.get('https://api.sightengine.com/1.0/video/check.json', params=video_params, timeout=10)
            # Video async check usually needs a callback, but we trigger the scan here.

        return None # Inconclusive, move to Gemini for contextual reasoning
    except Exception as e:
        print(f"Sightengine Error: {e}")
        return {
            "score": 0.5,
            "status": "flagged",
            "category": "api_error",
            "details": [f"Sightengine Failed: {str(e)}"]
        }

def check_content(text: str, image_url: str | None = None, video_url: str | None = None) -> dict:
    """
    Analyzes content using Hybrid logic: Heuristics -> Sightengine -> Gemini.
    """
    # 1. Fast Heuristic: Obvious Harm
    if is_obviously_harmful(text):
        return {
            "score": 1.0,
            "status": "rejected",
            "category": "spam_profanity",
            "details": ["Heuristic filter detected harmful content."],
            "language": "en"
        }

    # 2. Fast Heuristic: Obvious Safety
    if is_obviously_safe(text) and not image_url and not video_url:
        return {
            "score": 0.0,
            "status": "approved",
            "category": "safe",
            "details": ["Heuristic filter detected safe motivational content."],
            "language": "en"
        }

    # 3. Sightengine Pass (Professional Image/Text filter)
    sight_result = check_with_sightengine(text, image_url, video_url)
    if sight_result and sight_result.get("status") == "rejected":
        return sight_result

    # 4. Gemini Pass (Contextual Decision Maker)
    if not GEMINI_API_KEY:
        return {
            "score": 0.5,
            "status": "flagged",
            "category": "key_missing",
            "details": ["Gemini API Key missing on Vercel. Please add it to Env Vars."],
            "language": "en"
        }

    try:
        # Strict Prompt
        prompt = f"""
        Role: Strict AI Moderator for 'Bodham' (Mindfulness App).
        Goal: Autonomously Approve or Reject content.
        Guidelines: REJECT nudity, violence, hate, scams. APPROVE mindfulness, peace, positivity.
        If NSFW, REJECT IT.
        Content Text: "{text}"
        {'Media URL: ' + (image_url or video_url) if (image_url or video_url) else ''}
        Respond ONLY in JSON: {{"status": "approved" | "rejected", "score": 0.1-1.0, "category": "...", "reason": "..."}}
        """

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}

        max_retries = 2
        last_error = "Unknown Error"
        
        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, timeout=12)
                if response.status_code == 429:
                    time.sleep(2)
                    continue
                
                if response.status_code != 200:
                    last_error = f"HTTP {response.status_code}: {response.text}"
                    response.raise_for_status()

                data = response.json()
                if 'candidates' not in data:
                    return {"score": 1.0, "status": "rejected", "category": "safety_block", "details": ["Blocked by Safety Filters."]}

                raw_text = data['candidates'][0]['content']['parts'][0]['text']
                raw_text = raw_text.strip()
                if "```json" in raw_text: raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text: raw_text = raw_text.split("```")[1].split("```")[0].strip()
                    
                result = json.loads(raw_text)
                return {
                    "score": float(result.get("score", 0.5)),
                    "status": result.get("status", "approved"),
                    "category": result.get("category", "unclassified"),
                    "details": [result.get("reason", "Autonomous Decision Made")],
                    "language": "en"
                }
            except Exception as e:
                last_error = str(e)
                time.sleep(1)

        return {"score": 0.5, "status": "flagged", "category": "ai_fail", "details": [f"AI Error: {last_error}"]}

    except Exception as e:
        return {"score": 0.5, "status": "flagged", "category": "system_error", "details": [f"System Error: {str(e)}"]}
