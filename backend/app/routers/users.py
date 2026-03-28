from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase import get_supabase_client, get_admin_client
from app.auth.permissions import require_admin

router = APIRouter()

@router.get("/")
async def list_users(user=Depends(require_admin())):
    supabase = get_admin_client()
    # Profiles table extends auth.users
    result = supabase.table("profiles").select("*, branches(name)").execute()
    return result.data

@router.put("/{id}/role")
async def update_user_role(id: str, role_update: dict, user=Depends(require_admin())):
    if role_update.get("role") not in ["admin", "manager", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    supabase = get_admin_client()
    result = supabase.table("profiles").update({"role": role_update["role"]}).eq("id", id).execute()
    return result.data[0]


from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    branch_id: Optional[str] = None

@router.post("/create", summary="Directly create user")
async def create_user(user_data: UserCreate, user=Depends(require_admin())):
    supabase_admin = get_admin_client()
    
    auth_res = supabase_admin.auth.admin.create_user({
        "email": user_data.email,
        "password": user_data.password,
        "email_confirm": True,
        "user_metadata": {"full_name": user_data.full_name, "role": user_data.role}
    })
    
    if not auth_res.user:
        raise HTTPException(status_code=400, detail="Failed to create user")
        
    new_uid = auth_res.user.id
    
    try:
        supabase_admin.table("profiles").update({
            "full_name": user_data.full_name,
            "role": user_data.role,
            "branch_id": user_data.branch_id
        }).eq("id", new_uid).execute()
    except Exception as e:
        print("Profile update error", e)
        
    return {"message": "User created successfully", "id": new_uid}

@router.delete("/{id}", summary="Delete user")
async def delete_user(id: str, user=Depends(require_admin())):
    supabase_admin = get_admin_client()
    
    # Supabase allows admin.delete_user via its auth module
    try:
        res = supabase_admin.auth.admin.delete_user(id)
        if hasattr(res, 'error') and res.error:
            raise HTTPException(status_code=400, detail=str(res.error))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")
        
    return {"message": "User deleted successfully"}
