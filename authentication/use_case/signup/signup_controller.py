# authentication/controllers/signup_controller.py
from fastapi import APIRouter, HTTPException

# --- DTO & Use-case imports ---
from authentication.dto.signup_dto import (
    SignupRequestDTO,
    ConfirmRequestDTO,
    MessageResponseDTO,
    ResendRequestDTO
)
from authentication.use_case.signup.signup_InputData import SignupInputData
from authentication.use_case.signup.confirm_InputData import ConfirmInputData
from authentication.data_access.data_access import signup_user, confirm_user, resend_confirmation

router = APIRouter(prefix="/auth", tags=["auth"])

# ── /auth/signup ───────────────────────────────────────────
@router.post("/signup", response_model=MessageResponseDTO)
async def signup(req: SignupRequestDTO):
    # Web DTO → Use-case InputData へ詰め替え
    in_data = SignupInputData(req.email, req.password1, req.password2)
    ok, msg = signup_user(
        in_data.get_email(), in_data.get_password1(), in_data.get_password2()
    )
    if ok:
        return MessageResponseDTO(success=True, message=msg)
    raise HTTPException(status_code=400, detail=msg)

# ── /auth/confirm ──────────────────────────────────────────
@router.post("/confirm", response_model=MessageResponseDTO)
async def confirm(req: ConfirmRequestDTO):
    in_data = ConfirmInputData(req.email, req.confirmationcode)
    ok, msg = confirm_user(
        in_data.get_email(), in_data.get_confrimationcode()
    )
    if ok:
        return MessageResponseDTO(success=True, message=msg)
    raise HTTPException(status_code=400, detail=msg)

@router.post("/resend", response_model=MessageResponseDTO)
async def resend(req: ResendRequestDTO):
    ok = resend_confirmation(req.email)
    if ok:
        return MessageResponseDTO(success=True, message="Code resent.")
    raise HTTPException(status_code=400, detail="Failed to resend code.")
