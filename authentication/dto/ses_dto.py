# authentication/dto/ses_dto.py
from pydantic import BaseModel, EmailStr

class ContactFormRequestDTO(BaseModel):
    name: str
    email: EmailStr
    body: str

class ContactFormResponseDTO(BaseModel):
    success: bool
    message: str

class SendReceiptRequestDTO(BaseModel):
    email: EmailStr
    event_name: str
    date:str

class SendReceiptResponseDTO(BaseModel):
    success: bool
    message: str