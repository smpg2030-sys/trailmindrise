import requests
import json

URL = "http://localhost:8001/api/auth/login"
payload = {
    "email": "madhav200320@gmail.com",
    "password": "password123"
}

print(f"Testing login at {URL}...")
try:
    res = requests.post(URL, json=payload)
    print(f"Status: {res.status_code}")
    print(f"Headers: {res.headers}")
    print(f"Body: {res.text}")
    
    try:
        data = res.json()
        print("Body is valid JSON.")
    except:
        print("Body is NOT valid JSON.")
except Exception as e:
    print(f"Error: {e}")
