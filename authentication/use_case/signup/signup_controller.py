# app/api/signup_router.py
from fastapi import APIRouter, HTTPException
from authentication.data_access.data_access import (
    signup_user,
    confirm_user,
)
from authentication.use_case.signup.signup_InputData import SignupInputData
from authentication.use_case.signup.signup_OutputData import SignupOutputData
from authentication.use_case.signup.confirm_InputData import ConfirmInputData
from authentication.use_case.signup.confirm_OutputData import ConfirmOutputData

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
async def signup(body: SignupInputData):
    ok, msg = signup_user(body.get_email, body.get_password1, body.get_password2)
    if ok:
        return SignupOutputData(ok, msg)
    raise HTTPException(status_code=400, detail=msg)

@router.post("/confirm")
async def confirm(body: ConfirmInputData):
    ok, msg = confirm_user(body.get_email, body.get_confrimationcode)
    if ok:
        return SignupOutputData(True, "Success. Proceeding to next step.")
    raise HTTPException(status_code=400, detail=msg)
