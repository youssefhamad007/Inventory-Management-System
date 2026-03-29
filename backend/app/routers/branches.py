from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase import get_supabase_client, get_admin_client
from app.auth.permissions import require_admin, require_manager, require_staff

router = APIRouter()

@router.get("/")
async def list_branches(user=Depends(require_staff)): # <-- Removed ()
    supabase = get_supabase_client()
    result = supabase.table("branches").select("*").execute()
    return result.data

@router.post("/")
async def create_branch(branch_data: dict, user=Depends(require_admin)): # <-- Removed ()
    supabase = get_admin_client()
    result = supabase.table("branches").insert(branch_data).execute()
    return result.data[0]

@router.put("/{id}")
async def update_branch(id: str, branch_data: dict, user=Depends(require_admin)): # <-- Removed ()
    supabase = get_admin_client()
    result = supabase.table("branches").update(branch_data).eq("id", id).execute()
    return result.data[0]

@router.delete("/{id}")
async def delete_branch(id: str, user=Depends(require_admin)):
    supabase = get_admin_client()
    # Perform soft-delete by setting is_active=False
    result = supabase.table("branches").update({"is_active": False}).eq("id", id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Branch not found")
    return {"message": "Branch deactivated", "id": id}