import os
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

url = os.getenv("SUPABASE_URL", "")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

supabase = create_client(url, key)

try:
    res = supabase.table("pending_approvals").select("id").limit(1).execute()
    print("SUCCESS: pending_approvals exists!")
except Exception as e:
    print(f"FAILED: {str(e)}")

# Also try to check order_status enum
try:
    res = supabase.table("orders").select("status").limit(1).execute()
    print(f"Orders queried. (Note: we can't easily check enum values from REST api)")
except Exception as e:
    print(f"ORDERS FAILED: {str(e)}")

# Check stock_levels allocated_quantity
try:
    res = supabase.table("stock_levels").select("allocated_quantity").limit(1).execute()
    print("SUCCESS: allocated_quantity exists on stock_levels")
except Exception as e:
    print(f"ALLOCATED FAILED: {str(e)}")
