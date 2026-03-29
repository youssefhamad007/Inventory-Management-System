import sys
import os

# Ensure the project root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
except Exception as e:
    print(f"CRITICAL STARTUP ERROR: {e}")
    # In Vercel, this will show up in the Runtime Logs
    raise e
