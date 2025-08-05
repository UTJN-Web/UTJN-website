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
    confirm_password_reset
)

forgotpass_router = APIRouter(prefix="/auth", tags=["auth"])

@forgot_password_router.post("/forgot-password", response_model=ForgotPasswordResponseDTO)
async def forgot_password(req: ForgotPasswordRequestDTO):
    ok = request_password_reset(req.email)
    if ok:
        return ForgotPasswordResponseDTO(success=True, message="Verification code sent.")
    raise HTTPException(status_code=400, detail="Failed to send verification code.")

@forgot_password_router.post("/forgot-password/confirm", response_model=ConfirmForgotPasswordResponseDTO)
async def confirm_forgot_password(req: ConfirmForgotPasswordRequestDTO):
    ok = confirm_password_reset(req.email, req.code, req.new_password)
    if ok:
        return ConfirmForgotPasswordResponseDTO(success=True, message="Password reset successful.")
    raise HTTPException(status_code=400, detail="Password reset failed.")


