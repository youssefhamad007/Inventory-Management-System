import sys
import os
from fastapi.testclient import TestClient

# Add current path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.main import app
    from app.db.supabase import get_admin_client
    
    # We will get a JWT from the admin client if we can't use TestClient directly
    # Wait, the endpoints require user role. But dashboard/summary doesn't, it just needs a staff JWT.
    client = TestClient(app)
    
    # Let's hit the endpoint that returns 500
    response = client.get("/api/v1/approvals/")
    print(f"Approvals Status: {response.status_code}")
    print(response.text)

    response = client.get("/api/v1/dashboard/summary")
    print(f"Dashboard Status: {response.status_code}")
    print(response.text)

except Exception as e:
    import traceback
    traceback.print_exc()
