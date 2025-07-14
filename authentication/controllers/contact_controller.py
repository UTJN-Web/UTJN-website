from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="", tags=["contact"])

class ContactIn(BaseModel):
    name: str
    email: EmailStr
    message: str

@router.post("/contact")
async def contact(body: ContactIn):
    # TODO: Send email to UTJN admin
    print(f"[Contact] Name: {body.name}, Email: {body.email}, Message: {body.message}")
    return {"success": True, "message": "お問い合わせを受け付けました。"} 