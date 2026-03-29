import asyncio
from app.db.supabase import get_admin_client

async def test_rpc():
    admin_client = get_admin_client()
    try:
        print("Testing RPC call...")
        # Since we don't know a valid UUID, let's just use a fake one to see if the RPC syntax is correct
        fake_uuid = "00000000-0000-0000-0000-000000000000"
        res = admin_client.rpc("get_profile_by_id", {"user_id": fake_uuid}).execute()
        print("Success!", res.data)
    except Exception as e:
        print("Error!", str(e))

if __name__ == "__main__":
    asyncio.run(test_rpc())
