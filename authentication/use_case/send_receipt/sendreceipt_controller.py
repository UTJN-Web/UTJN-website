from fastapi import APIRouter, HTTPException
from authentication.dto.ses_dto import (
    SendReceiptRequestDTO, SendReceiptResponseDTO
)
from authentication.email_sends.ses_functions import send_receipt

email_router = APIRouter(prefix="/email", tags=["email"])

# ── /auth/send_contact_form ───────────────────────────────────────────
@email_router.post("/receipt", response_model=SendReceiptResponseDTO)
async def contact_form(req: SendReceiptRequestDTO):
    ok, msg = send_receipt(
        req.email, req.event_name, req.date
    )
    if ok:
        return SendReceiptResponseDTO(success=True, message=msg)
    raise HTTPException(status_code=400, detail=msg)