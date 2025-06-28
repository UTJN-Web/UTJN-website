# # File: authentication/controllers/signup_controller.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from authentication.data_access.data_access import (
    signup_user,
    confirm_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

class SignUpIn(BaseModel):
    email: EmailStr
    password1: str
    password2: str

@router.post("/signup")
async def signup(body: SignUpIn):
    ok, msg = signup_user(body.email, body.password1, body.password2)
    if ok:
        return (True, "Success. Verification e-mail sent.")
    raise HTTPException(status_code=400, detail=msg)

class ConfirmIn(BaseModel):
    email: EmailStr
    code: str

@router.post("/confirm")
async def confirm(body: ConfirmIn):
    ok, msg = confirm_user(body.email, body.code)
    if ok:
        return (True, "Success. Verification e-mail sent.")
    raise HTTPException(status_code=400, detail=msg)
