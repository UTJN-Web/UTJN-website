from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from authentication.email_sends.ses_functions import send_receipt, send_refund_notification

receipt_router = APIRouter(prefix="/email", tags=["email"])

class ReceiptRequest(BaseModel):
    email: str
    event_name: str
    date: str

class RefundRequest(BaseModel):
    email: str
    event_name: str
    amount: float
    currency: str
    status: str  # 'approved' or 'rejected'
    adminNotes: str

@receipt_router.post("/receipt")
async def contact_form(receipt_data: ReceiptRequest):
    """Send receipt email"""
    try:
        ok, msg = send_receipt(
            email=receipt_data.email,
            event_name=receipt_data.event_name,
            date=receipt_data.date
        )
        if ok:
            return {"success": True, "message": "Receipt sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@receipt_router.post("/refund")
async def send_refund_email(refund_data: RefundRequest):
    """Send refund notification email"""
    try:
        ok, msg = send_refund_notification(
            email=refund_data.email,
            event_name=refund_data.event_name,
            amount=refund_data.amount,
            currency=refund_data.currency,
            status=refund_data.status,
            adminNotes=refund_data.adminNotes
        )
        if ok:
            return {"success": True, "message": "Refund notification sent successfully"}
        else:
            raise HTTPException(status_code=500, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))