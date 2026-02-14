import requests

def test_feed():
    try:
        # Assuming the API is running on 8000
        url = "http://localhost:8000/api/videos/"
        response = requests.get(url)
        if response.ok:
            videos = response.json()
            print(f"Fetched {len(videos)} videos from feed")
            for v in videos:
                print(f"ID: {v.get('id')}, URL: {v.get('video_url')}")
        else:
            print(f"Failed to fetch feed: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_feed()
