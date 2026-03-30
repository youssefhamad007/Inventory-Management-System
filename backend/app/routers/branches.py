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
    
    print(f"Attempting to delete branch: {id}")
    
    # 1. Try to delete associated stock levels first
    try:
        supabase.table("stock_levels").delete().eq("branch_id", id).execute()
    except Exception as e:
        print(f"Warning: Stock deletion failed for branch {id}: {str(e)}")

    # 2. Try hard delete on the branch
    try:
        result = supabase.table("branches").delete().eq("id", id).execute()
        if result.data and len(result.data) > 0:
            print(f"Branch hard-deleted: {id}")
            return {"message": "Branch deleted entirely", "id": id}
    except Exception as e:
        print(f"Branch hard-delete failed (likely dependencies) for {id}: {str(e)}")

    # 3. Fallback: Soft delete if hard delete is impossible (safeguard history)
    try:
        result = supabase.table("branches").update({"is_active": False}).eq("id", id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Branch not found")
        return {"message": "Branch deactivated (historical data preserved)", "id": id}
    except Exception as e:
        print(f"Soft-delete also failed for branch {id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Total deletion failure: {str(e)}")