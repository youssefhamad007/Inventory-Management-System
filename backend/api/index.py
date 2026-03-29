import sys
import os

# This ensures the root directory is in the python path
# so that "from app.main import app" actually works.
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.main import app