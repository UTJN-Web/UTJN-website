# authentication/dto/forgot_password_dto.py

from pydantic import BaseModel, EmailStr

class ForgotPasswordRequestDTO(BaseModel):
    email: EmailStr

class ForgotPasswordResponseDTO(BaseModel):
    success: bool
    message: str

class ConfirmForgotPasswordRequestDTO(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class ConfirmForgotPasswordResponseDTO(BaseModel):
    success: bool
    message: str