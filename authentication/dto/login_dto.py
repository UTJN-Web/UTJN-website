# authentication/dto/signup_dto.py
from pydantic import BaseModel, EmailStr

class LoginRequestDTO(BaseModel):
    email: EmailStr
    password: str

class LoginResponseDTO(BaseModel):
    success: bool
    message: str