from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.supabase import get_admin_client
from app.auth.permissions import require_admin
from app.auth.middleware import get_current_user
from app.models.branch import UserRoleUpdate

router = APIRouter()


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str
    branch_id: Optional[str] = None


@router.get("/")
async def list_users(user=Depends(require_admin())):
    # Admin user management requires service-role key
    supabase = get_admin_client()
    result = supabase.table("profiles").select("*, branches(name)").execute()
    return result.data


@router.get("/me")
async def get_my_profile(user=Depends(get_current_user)):
    supabase = get_admin_client()
    try:
        # User jwt-based client would be better but get_admin_client avoids RLS issues for profile discovery
        result = supabase.table("profiles").select("*, branches(name)").eq("id", str(user["id"])).execute()
        if not result.data:
             raise HTTPException(status_code=404, detail="Profile not found in database")
        return result.data[0]
    except Exception as e:
        if isinstance(e, HTTPException): raise
        raise HTTPException(status_code=500, detail=f"User service error: {str(e)}")


@router.put("/{id}/role")
async def update_user_role(id: str, role_update: UserRoleUpdate, user=Depends(require_admin())):
    if role_update.role not in ["admin", "manager", "staff"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    supabase = get_admin_client()
    result = supabase.table("profiles").update({"role": role_update.role}).eq("id", id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


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
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

    return {"message": "User created successfully", "id": new_uid}


@router.delete("/{id}", summary="Delete user")
async def delete_user(id: str, user=Depends(require_admin())):
    supabase_admin = get_admin_client()

    try:
        res = supabase_admin.auth.admin.delete_user(id)
        if hasattr(res, 'error') and res.error:
            raise HTTPException(status_code=400, detail=str(res.error))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

    return {"message": "User deleted successfully"}
