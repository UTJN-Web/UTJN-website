# authentication/dto/signup_dto.py
from pydantic import BaseModel, EmailStr

class SignupRequestDTO(BaseModel):
    email: EmailStr
    password1: str
    password2: str

class ConfirmRequestDTO(BaseModel):
    email: EmailStr
    confirmationcode: str

class MessageResponseDTO(BaseModel):
    success: bool
    message: str

class ResendRequestDTO(BaseModel):
    email: EmailStr

class GetSubRequestDTO(BaseModel):
    email: EmailStr

class GetSubResponseDTO(BaseModel):
    sub: str