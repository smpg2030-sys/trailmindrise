import os
import sys

# Add current directory to path so relative imports work on Vercel
sys.path.append(os.path.dirname(__file__))

from main import app
