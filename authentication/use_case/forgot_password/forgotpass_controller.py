# authentication/use_case/forgot_password/forgotpass_controller.py
from fastapi import APIRouter, HTTPException

# --- DTO & Use-case imports ---
from authentication.dto.forgot_password_dto import (
    ForgotPasswordRequestDTO,
    ForgotPasswordResponseDTO,
    ConfirmForgotPasswordRequestDTO,
    ConfirmForgotPasswordResponseDTO
)
from authentication.data_access.data_access import (
    request_password_reset,
    reset_password
)

forgotpass_router = APIRouter(prefix="/auth", tags=["auth"])

@forgotpass_router.post("/forgot-password", response_model=ForgotPasswordResponseDTO)
async def forgot_password(req: ForgotPasswordRequestDTO):
    ok, msg = request_password_reset(req.email)
    if ok:
        return ForgotPasswordResponseDTO(success=True, message=msg)
    raise HTTPException(status_code=400, detail=msg)

@forgotpass_router.post("/forgot-password-confirm", response_model=ConfirmForgotPasswordResponseDTO)
async def confirm_forgot_password(req: ConfirmForgotPasswordRequestDTO):
    ok, msg = reset_password(req.email, req.code, req.new_password1, req.new_password2)
    if ok:
        return ConfirmForgotPasswordResponseDTO(success=True, message=msg)
    raise HTTPException(status_code=400, detail=msg)