# authentication/use_case/contact/contact_controller.py
from fastapi import APIRouter
from pydantic import BaseModel

contact_router = APIRouter(prefix="/contact", tags=["contact"])

class ContactIn(BaseModel):
    name: str
    email: str
    message: str

@contact_router.post("/contact")
async def contact(body: ContactIn):
    # TODO: Send email to UTJN admin
    print(f"[Contact] Name: {body.name}, Email: {body.email}, Message: {body.message}")
    return {"success": True, "message": "お問い合わせを受け付けました。"} 