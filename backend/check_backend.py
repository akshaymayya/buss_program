import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from main import app
    print("SUCCESS: app.main imported")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
