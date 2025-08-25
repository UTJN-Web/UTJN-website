# authentication/use_case/login/login_controller.py
from fastapi import APIRouter, HTTPException

# --- DTO & Use-case imports ---
from authentication.dto.login_dto import (
    LoginRequestDTO,
    LoginResponseDTO
)
from authentication.data_access.data_access import login_user

login_router = APIRouter(prefix="/auth", tags=["auth"])

# ── /auth/login ───────────────────────────────────────────
@login_router.post("/login", response_model=LoginResponseDTO)
async def login(req: LoginRequestDTO):
    ok, msg, user_data = await login_user(
        req.email, req.password
    )
    if ok:
        return LoginResponseDTO(success=True, message=msg, user=user_data)
    raise HTTPException(status_code=400, detail=msg)