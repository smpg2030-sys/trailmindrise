import sys
import os

# Add project root and api dir to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'api'))

print("Attempting to import api.main...")
try:
    from api.main import app
    print("Successfully imported api.main")
except Exception as e:
    print(f"CRASHED: {e}")
    import traceback
    traceback.print_exc()
