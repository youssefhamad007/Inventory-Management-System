import sys
import os

# This line is the magic trick. It tells Vercel to look 
# inside the current directory for your 'app' folder.
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.main import app

# Vercel needs the 'app' object available at the top level of this file
# and it MUST be named 'app'.