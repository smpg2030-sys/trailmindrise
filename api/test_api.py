import requests

BASE_URL = "http://localhost:8000"

def test_register():
    print("Testing registration...")
    data = {
        "email": "final_test@example.com",
        "password": "password123",
        "full_name": "Final Test User"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        return response.status_code == 200 or response.status_code == 400 # 400 if already exists
    except Exception as e:
        print(f"Error during registration: {e}")
        return False

def test_login():
    print("\nTesting login...")
    data = {
        "email": "final_test@example.com",
        "password": "password123"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error during login: {e}")
        return False

if __name__ == "__main__":
    if test_register():
        test_login()
