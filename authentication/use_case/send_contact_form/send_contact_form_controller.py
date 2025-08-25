from fastapi import APIRouter, HTTPException
from authentication.dto.ses_dto import (
    ContactFormRequestDTO, ContactFormResponseDTO
)
from authentication.email_sends.ses_functions import send_contact_form

email_router = APIRouter(prefix="/email", tags=["email"])

# ── /auth/send_contact_form ───────────────────────────────────────────
@email_router.post("/contact_form", response_model=ContactFormResponseDTO)
async def contact_form(req: ContactFormRequestDTO):
    ok, msg = send_contact_form(
        req.name, req.email, req.body
    )
    if ok:
        return ContactFormResponseDTO(success=True, message=msg)
    raise HTTPException(status_code=400, detail=msg)