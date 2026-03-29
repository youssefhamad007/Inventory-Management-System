from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase import get_user_client, get_admin_client
from app.auth.permissions import require_admin, require_manager, require_staff
from app.models.branch import BranchCreate, BranchUpdate

router = APIRouter()

@router.get("/")
async def list_branches(user=Depends(require_staff())):
    supabase = get_user_client(user["jwt"])
    result = supabase.table("branches").select("*").execute()
    return result.data

@router.post("/")
async def create_branch(branch_data: BranchCreate, user=Depends(require_admin())):
    supabase = get_user_client(user["jwt"])
    result = supabase.table("branches").insert(branch_data.model_dump(mode="json")).execute()
    return result.data[0]

@router.put("/{id}")
async def update_branch(id: str, branch_data: BranchUpdate, user=Depends(require_admin())):
    supabase = get_user_client(user["jwt"])
    result = supabase.table("branches").update(
        branch_data.model_dump(mode="json", exclude_unset=True)
    ).eq("id", id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Branch not found")
    return result.data[0]

@router.delete("/{id}")
async def delete_branch(id: str, user=Depends(require_admin())):
    supabase = get_user_client(user["jwt"])
    result = supabase.table("branches").update({"is_active": False}).eq("id", id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Branch not found")
    return {"message": "Branch deactivated", "id": id}