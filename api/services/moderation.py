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
    """Specialized moderation via Sightengine."""
    user = (SIGHTENGINE_API_USER or "").strip()
    secret = (SIGHTENGINE_API_SECRET or "").strip()
    
    if not user or not secret:
        return {"status": "error", "details": f"Sightengine keys missing (U:{len(user)}, S:{len(secret)})"}

    try:
        # 1. Text (Standard)
        if text:
            res = requests.post('https://api.sightengine.com/1.0/text/check.json', data={
                'text': text, 'lang': 'en', 'mode': 'standard',
                'api_user': user, 'api_secret': secret
            }, timeout=8)
            if res.status_code != 200:
                return {"status": "error", "details": f"SE Text HTTP {res.status_code}: {res.text[:50]}"}
            
            data = res.json()
            if data.get('profanity', {}).get('matches'):
                return {"score": 1.0, "status": "rejected", "category": "profanity", "details": ["Direct profanity detected."]}

        # 2. Image (Aggressive)
        if image_url:
            res = requests.get('https://api.sightengine.com/1.0/check.json', params={
                'models': 'nudity-2.0,wad,scam,suggestive,gore', 'url': image_url,
                'api_user': user, 'api_secret': secret
            }, timeout=12)
            if res.status_code != 200:
                return {"status": "error", "details": f"SE Image HTTP {res.status_code}: {res.text[:50]}"}
            
            data = res.json()
            n = data.get('nudity', {})
            # Extreme thresholds for Bodham
            if (n.get('raw', 0) > 0.05 or n.get('partial', 0) > 0.1 or n.get('erotica', 0) > 0.1 or n.get('sexual_display', 0) > 0.1):
                return {"score": 1.0, "status": "rejected", "category": "nudity", "details": ["Visual violations detected."]}
            
            if (data.get('weapon', 0) > 0.3 or data.get('drugs', 0) > 0.3 or data.get('gore', {}).get('prob', 0) > 0.2):
                return {"score": 1.0, "status": "rejected", "category": "violence", "details": ["Harmful imagery detected."]}

        return None # Proceed to Gemini
    except Exception as e:
        return {"status": "error", "details": f"SE Exception: {str(e)}"}

def check_content(text: str, image_url: str | None = None, video_url: str | None = None) -> dict:
    """Hybrid: Heuristics -> Sightengine -> Gemini."""
    t = text.strip() if text else ""
    if is_obviously_harmful(t):
        return {"score": 1.0, "status": "rejected", "category": "harmful", "details": ["Local filter catch."], "language": "en"}

    # Sightengine Pass
    se = check_with_sightengine(t, image_url, video_url)
    if se and se.get("status") == "rejected":
        return {**se, "language": "en"}
    
    # Gemini Pass
    gemini_key = (GEMINI_API_KEY or "").strip()
    if not gemini_key:
        se_err = f" (SE: {se['details']})" if (se and se['status'] == 'error') else ""
        return {"score": 0.5, "status": "flagged", "category": "api_fail", "details": [f"Missing Keys{se_err}"], "language": "en"}

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
        prompt = f"Moderate for mindfulness app. Text: '{t}'. Media: {image_url or 'None'}. Return JSON {{'status':'approved'|'rejected', 'reason':'...'}}"
        
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        res = requests.post(url, json=payload, timeout=10)
        
        if res.status_code != 200:
            se_msg = se.get("details") if (se and se['status'] == 'error') else "SE_OK"
            return {"score": 0.5, "status": "flagged", "category": "api_fail", "details": [f"Geni HTTP {res.status_code} (SE: {se_msg})"], "language": "en"}

        data = res.json()
        if 'candidates' not in data:
            return {"score": 1.0, "status": "rejected", "category": "safety_block", "details": ["Provider safety block."]}

        raw = data['candidates'][0]['content']['parts'][0]['text']
        if "```" in raw: raw = raw.split("```")[1].replace("json", "").strip()
        
        result = json.loads(raw)
        status = result.get("status", "flagged")
        # Force decision if ambiguous
        if status == "flagged": status = "rejected" 
            
        return {
            "score": 0.9 if status == "rejected" else 0.1,
            "status": status,
            "category": "ai_decision",
            "details": [result.get("reason", "Analyzed")],
            "language": "en"
        }
    except Exception as e:
        se_msg = se.get("details") if (se and se['status'] == 'error') else "None"
        return {"score": 0.5, "status": "flagged", "category": "api_fail", "details": [f"Failure: {str(e)} (SE: {se_msg})"], "language": "en"}
