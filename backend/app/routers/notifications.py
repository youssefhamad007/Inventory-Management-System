from typing import List, Dict, Any
from fastapi import APIRouter, Depends, status
from app.auth.permissions import require_staff
from app.auth.schemas import UserContext
from app.db.supabase import get_user_client

router = APIRouter()

@router.get("/", summary="Get user notifications")
async def list_notifications(
    user: UserContext = Depends(require_staff())
) -> List[Dict[str, Any]]:
    supabase = get_user_client(user["jwt"])
    result = supabase.table("notifications").select("*").eq("user_id", user["id"]).order("created_at", desc=True).limit(20).execute()
    return result.data or []

@router.post("/mark-all-read", summary="Mark all notifications as read")
async def mark_all_read(
    user: UserContext = Depends(require_staff())
):
    supabase = get_user_client(user["jwt"])
    supabase.table("notifications").update({"is_read": True}).eq("user_id", user["id"]).eq("is_read", False).execute()
    return {"message": "All notifications marked as read"}
