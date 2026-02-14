from config import GEMINI_API_KEY, SIGHTENGINE_API_USER, SIGHTENGINE_API_SECRET
from datetime import datetime
import requests
import json
import re
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

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

# Global session for connection pooling
session = requests.Session()
retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))

def check_with_sightengine(text: str, image_url: str | None = None, video_url: str | None = None) -> dict | None:
    """Specialized moderation via Sightengine."""
    user = (SIGHTENGINE_API_USER or "").strip()
    secret = (SIGHTENGINE_API_SECRET or "").strip()
    
    if not user or not secret:
        return {"status": "error", "details": "Sightengine keys missing", "code": "SE_MISSING"}

    try:
        # 1. Text (Standard)
        if text:
            try:
                res = session.post('https://api.sightengine.com/1.0/text/check.json', data={
                    'text': text, 'lang': 'en', 'mode': 'standard',
                    'api_user': user, 'api_secret': secret
                }, timeout=10)
                
                if res.status_code != 200:
                    return {"status": "error", "details": f"SE Text {res.status_code}", "code": f"SE_{res.status_code}"}
                
                data = res.json()
                if data.get('profanity', {}).get('matches'):
                    return {"score": 1.0, "status": "rejected", "category": "profanity", "details": ["Direct profanity detected."]}
            except requests.exceptions.Timeout:
                return {"status": "error", "details": "SE Text Timeout", "code": "SE_TIMEOUT"}
            except requests.exceptions.ConnectionError:
                return {"status": "error", "details": "SE Text Connection Error", "code": "SE_CONN"}

        # 2. Image (Aggressive)
        if image_url:
            try:
                res = session.get('https://api.sightengine.com/1.0/check.json', params={
                    'models': 'nudity-2.0,wad,scam,suggestive,gore', 'url': image_url,
                    'api_user': user, 'api_secret': secret
                }, timeout=15)
                
                if res.status_code != 200:
                    err_body = res.json() if res.headers.get("Content-Type") == "application/json" else {}
                    err_type = err_body.get("error", {}).get("type", "Unknown")
                    return {"status": "error", "details": f"SE Img {res.status_code}: {err_type}", "code": f"SE_{res.status_code}"}
                
                data = res.json()
                if data.get('status') != 'success':
                     return {"status": "error", "details": f"SE API Fail: {data.get('error')}", "code": "SE_API_FAIL"}

                n = data.get('nudity', {})
                # Extreme thresholds for Bodham
                if (n.get('raw', 0) > 0.05 or n.get('partial', 0) > 0.1 or n.get('erotica', 0) > 0.1 or n.get('sexual_display', 0) > 0.1):
                    return {"score": 1.0, "status": "rejected", "category": "nudity", "details": ["Visual violations detected."]}
                
                if (data.get('weapon', 0) > 0.3 or data.get('drugs', 0) > 0.3 or data.get('gore', {}).get('prob', 0) > 0.2):
                    return {"score": 1.0, "status": "rejected", "category": "violence", "details": ["Harmful imagery detected."]}
            except requests.exceptions.Timeout:
                return {"status": "error", "details": "SE Img Timeout", "code": "SE_TIMEOUT"}
            except requests.exceptions.ConnectionError:
                return {"status": "error", "details": "SE Img Connection Error", "code": "SE_CONN"}

        return None # Proceed to Gemini
    except Exception as e:
        return {"status": "error", "details": f"SE Ex: {str(e)}", "code": "SE_EXCEPTION"} # Fallback for unknown

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
        se_code = se.get("code", "SE_OK") if (se and se.get("status") == "error") else "SE_OK"
        return {"score": 0.5, "status": "flagged", "category": f"MISSING_KEYS_{se_code}", "details": ["Keys Missing"], "language": "en"}

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}"
        prompt = f"Moderate for mindfulness app. Text: '{t}'. Media: {image_url or 'None'}. Return JSON {{'status':'approved'|'rejected', 'reason':'...'}}"
        
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        # Requests Session for Gemini too
        res = session.post(url, json=payload, timeout=10)
        
        if res.status_code != 200:
            se_code = se.get("code", "SE_OK") if (se and se.get("status") == "error") else "SE_OK"
            return {"score": 0.5, "status": "flagged", "category": f"GENI_{res.status_code}_{se_code}", "details": [f"Gemini Fail: {res.text[:50]}"], "language": "en"}

        data = res.json()
        if 'candidates' not in data:
            return {"score": 1.0, "status": "rejected", "category": "SAFETY_BLOCK", "details": ["Provider safety block."]}

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
        se_code = se.get("code", "SE_OK") if (se and se.get("status") == "error") else "SE_OK"
        # Check if it was a Gemini timeout
        if isinstance(e, requests.exceptions.Timeout): 
             return {"score": 0.5, "status": "flagged", "category": f"GENI_TIMEOUT_{se_code}", "details": ["Gemini Timed Out"], "language": "en"}
        if isinstance(e, requests.exceptions.ConnectionError):
             return {"score": 0.5, "status": "flagged", "category": f"GENI_CONN_{se_code}", "details": ["Gemini Connection Error"], "language": "en"}
        
        return {"score": 0.5, "status": "flagged", "category": f"EX_{se_code}", "details": [f"Exception: {str(e)}"], "language": "en"}
