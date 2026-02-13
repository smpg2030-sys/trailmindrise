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

def check_with_sightengine(text: str, image_url: str | None = None) -> dict | None:
    """Specialized moderation via Sightengine (High efficiency for media)."""
    if not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET:
        return None

    try:
        results = []
        
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
                    # Check for profanity or self-harm
                    profanity = data.get('profanity', {}).get('matches', [])
                    if profanity:
                        return {
                            "score": 0.9,
                            "status": "rejected",
                            "category": "profanity",
                            "details": [f"Detected words: {', '.join([p['type'] for p in profanity])}"]
                        }

        # 2. Image Moderation
        if image_url:
            image_params = {
                'models': 'nudity-2.0,wad,scam,suggestive',
                'url': image_url,
                'api_user': SIGHTENGINE_API_USER,
                'api_secret': SIGHTENGINE_API_SECRET
            }
            res = requests.get('https://api.sightengine.com/1.0/check.json', params=image_params, timeout=15)
            if res.status_code == 200:
                data = res.json()
                if data.get('status') == 'success':
                    # Logic for image rejection based on probabilities
                    nudity = data.get('nudity', {})
                    if nudity.get('sexual_activity', 0) > 0.5 or nudity.get('sexual_display', 0) > 0.5:
                        return {"score": 1.0, "status": "rejected", "category": "nudity", "details": ["Sexual content detected"]}
                    
                    scam = data.get('scam', {}).get('prob', 0)
                    if scam > 0.7:
                        return {"score": 0.9, "status": "rejected", "category": "scam", "details": ["Scam pattern detected"]}

        return None # Inconclusive, move to Gemini
    except Exception as e:
        print(f"Sightengine Error: {e}")
        return None

def check_content(text: str, image_url: str | None = None, video_url: str | None = None) -> dict:
    """
    Analyzes content using Hybrid logic: Heuristics -> Sightengine -> Gemini.
    """
    # 1. Fast Heuristic: Obvious Harm (Instant Reject)
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

    # 3. Sightengine Pass (Specialized Media/Text)
    sight_result = check_with_sightengine(text, image_url)
    if sight_result:
        return sight_result

    # 4. Gemini Pass (Deep Context Fallback)
    if not GEMINI_API_KEY:
        return {
            "score": 0.5,
            "status": "flagged",
            "category": "system_error",
            "details": ["AI Keys missing: Defaulting to manual review"],
            "language": "en"
        }

    try:
        prompt = f"""
        Analyze the following content for a community-driven mindfulness app (Mindrise).
        Content Text: "{text}"
        {'Image/Video URL: ' + (image_url or video_url) if (image_url or video_url) else ''}
        
        Provide a safety assessment in JSON format with:
        - status: "approved" (safe), "rejected" (unsafe/harmful), or "flagged" (ambiguous)
        - score: 0.0 (Safe) to 1.0 (Unsafe)
        - category: one word (e.g., hate, violence, sexual, spam, safe, controversial)
        - reason: brief explanation
        
        Rules:
        - Approve motivational, peaceful, and community-friendly content.
        - Reject nudity, extreme violence, hate speech, or obvious scams.
        - Flag if you are uncertain but it seems slightly controversial.
        """

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {"contents": [{"parts": [{"text": prompt}]}]}

        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, timeout=15)
                if response.status_code == 429:
                    wait_time = 2 * (attempt + 1)
                    time.sleep(wait_time)
                    continue
                
                response.raise_for_status()
                data = response.json()
                
                if 'candidates' not in data or not data['candidates']:
                    if 'promptFeedback' in data:
                        return {"score": 1.0, "status": "rejected", "category": "safety_block", "details": ["Blocked by Safety Filters"]}
                    raise Exception("No analysis candidates returned")

                raw_text = data['candidates'][0]['content']['parts'][0]['text']
                raw_text = raw_text.strip()
                if "```json" in raw_text: raw_text = raw_text.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_text: raw_text = raw_text.split("```")[1].split("```")[0].strip()
                    
                result = json.loads(raw_text)
                return {
                    "score": float(result.get("score", 0.1)),
                    "status": result.get("status", "approved"),
                    "category": result.get("category", "unclassified"),
                    "details": [result.get("reason", "AI Context Assessed")],
                    "language": "en"
                }
            except Exception as e:
                last_error = str(e)
                time.sleep(1)

        return {"score": 0.5, "status": "flagged", "category": "api_error", "details": [f"Moderation failed: {str(last_error)}"]}

    except Exception as e:
        return {"score": 0.5, "status": "flagged", "category": "system_error", "details": [f"System Error: {str(e)}"]}
