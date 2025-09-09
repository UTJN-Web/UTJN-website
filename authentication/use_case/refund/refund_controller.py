# authentication/use_case/refund/refund_controller.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import requests
import json
import time
import random
from authentication.data_access.refund_repository import RefundRepository
from authentication.data_access.event_repository import EventRepository

refund_router = APIRouter(prefix="/refunds", tags=["refunds"])

async def process_square_refund(payment_id: str, amount: float, currency: str, reason: str = "Event cancellation refund") -> dict:
    """Process a refund through Square API"""
    try:
        print(f"🔁 Processing Square refund for payment {payment_id}: {currency} ${amount}")
        
        # Get Square access token
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            return {
                'success': False,
                'error': 'Square access token not found'
            }
        
        # Determine if sandbox or production
        base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
        
        # Process refund with Square API
        headers = {
            'Authorization': f'Bearer {square_token}',
            'Square-Version': '2024-07-17',
            'Content-Type': 'application/json'
        }
        
        # Generate unique idempotency key for refund
        idempotency_key = f"refund_{int(time.time())}_{random.randint(1000, 9999)}"
        
        refund_request = {
            'idempotency_key': idempotency_key,
            'payment_id': payment_id,
            'amount_money': {
                'amount': int(amount * 100),  # Convert to cents
                'currency': currency.upper()
            },
            'reason': reason
        }
        
        print(f"🔁 Square refund request: {json.dumps(refund_request, indent=2)}")
        
        # Call Square API to process refund
        url = f"{base_url}/refunds"
        response = requests.post(url, headers=headers, json=refund_request)
        
        if response.status_code == 200:
            refund_result = response.json()
            refund_id = refund_result.get('refund', {}).get('id')
            
            print(f"✅ Square refund processed successfully: {refund_id}")
            
            return {
                'success': True,
                'refundId': refund_id,
                'details': refund_result
            }
        else:
            error_data = response.json()
            print(f"❌ Square refund failed: {json.dumps(error_data, indent=2)}")
            return {
                'success': False,
                'error': f"Square refund failed: {error_data}"
            }
            
    except Exception as e:
        print(f"❌ Error processing Square refund: {e}")
        return {
            'success': False,
            'error': f"Failed to process refund: {str(e)}"
        }

class RefundRequestCreate(BaseModel):
    eventId: int
    userId: int
    email: str
    amount: float
    reason: Optional[str] = None
    currency: str = "CAD"
    paymentId: Optional[str] = None

class RefundStatusUpdate(BaseModel):
    status: str  # 'approved' or 'rejected'
    adminNotes: Optional[str] = None
    processedBy: Optional[str] = None

@refund_router.post("")
async def create_refund_request(refund_data: RefundRequestCreate):
    """Create a new refund request"""
    try:
        print(f"🔁 Creating refund request for user {refund_data.userId}, event {refund_data.eventId}")
        
        refund_repo = RefundRepository()
        
        try:
            await refund_repo.ensure_tables_exist()
            
            refund_request = await refund_repo.create_refund_request(
                event_id=refund_data.eventId,
                user_id=refund_data.userId,
                email=refund_data.email,
                amount=refund_data.amount,
                reason=refund_data.reason,
                currency=refund_data.currency,
                payment_id=refund_data.paymentId
            )
            
            # Convert datetime objects to ISO strings for JSON serialization
            if refund_request.get('requestDate'):
                refund_request['requestDate'] = refund_request['requestDate'].isoformat()
            if refund_request.get('processedDate'):
                refund_request['processedDate'] = refund_request['processedDate'].isoformat()
            
            print(f"✅ Refund request created: ID {refund_request['id']}")
            return {
                "success": True,
                "message": "Refund request created successfully",
                "refundRequest": refund_request
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error creating refund request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create refund request: {str(e)}")

@refund_router.get("")
async def get_all_refund_requests():
    """Get all refund requests for admin management"""
    try:
        print("📝 Getting all refund requests...")
        
        refund_repo = RefundRepository()
        
        try:
            await refund_repo.ensure_tables_exist()
            refund_requests = await refund_repo.get_all_refund_requests()
            
            # Convert datetime objects to ISO strings for JSON serialization
            for refund in refund_requests:
                if refund.get('requestDate'):
                    refund['requestDate'] = refund['requestDate'].isoformat()
                if refund.get('processedDate'):
                    refund['processedDate'] = refund['processedDate'].isoformat()
            
            print(f"✅ Retrieved {len(refund_requests)} refund requests")
            return {
                "success": True,
                "refunds": refund_requests,
                "count": len(refund_requests)
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting refund requests: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve refund requests: {str(e)}")

@refund_router.get("/{refund_id}")
async def get_refund_request(refund_id: int):
    """Get a specific refund request by ID"""
    try:
        print(f"📝 Getting refund request {refund_id}...")
        
        refund_repo = RefundRepository()
        
        try:
            await refund_repo.ensure_tables_exist()
            refund_request = await refund_repo.get_refund_request_by_id(refund_id)
            
            if not refund_request:
                raise HTTPException(status_code=404, detail="Refund request not found")
            
            # Convert datetime objects to ISO strings for JSON serialization
            if refund_request.get('requestDate'):
                refund_request['requestDate'] = refund_request['requestDate'].isoformat()
            if refund_request.get('processedDate'):
                refund_request['processedDate'] = refund_request['processedDate'].isoformat()
            
            print(f"✅ Retrieved refund request {refund_id}")
            return {
                "success": True,
                "refundRequest": refund_request
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting refund request {refund_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve refund request: {str(e)}")

@refund_router.put("/{refund_id}/status")
async def update_refund_status(refund_id: int, status_update: RefundStatusUpdate):
    """Update the status of a refund request (admin only)"""
    try:
        print(f"🔄 Updating refund request {refund_id} status to {status_update.status}")
        
        if status_update.status not in ['approved', 'rejected']:
            raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
        
        refund_repo = RefundRepository()
        event_repo = EventRepository()
        
        try:
            await refund_repo.ensure_tables_exist()
            await event_repo.ensure_tables_exist()
            
            # Get the refund request details
            refund_request = await refund_repo.get_refund_request_by_id(refund_id)
            if not refund_request:
                raise HTTPException(status_code=404, detail="Refund request not found")
            
            # If approving the refund, process the actual Square refund
            if status_update.status == 'approved':
                print(f"💰 Processing Square refund for refund request {refund_id}")
                
                # Get the payment ID from the refund request (stored when refund was created)
                payment_id = refund_request.get('paymentId')
                
                if payment_id:
                    print(f"🔍 Found payment ID {payment_id} for refund processing")
                    
                    # Process actual Square refund
                    print(f"🔁 Processing Square refund of {refund_request['currency']} ${refund_request['amount']} for payment {payment_id}")
                    
                    try:
                        refund_result = await process_square_refund(
                            payment_id=payment_id,
                            amount=refund_request['amount'],
                            currency=refund_request['currency'],
                            reason=status_update.adminNotes or 'Event cancellation refund'
                        )
                        
                        if refund_result['success']:
                            print(f"✅ Square refund processed successfully: {refund_result['refundId']}")
                            admin_notes = f"{status_update.adminNotes or 'Refund approved'} - Square refund processed successfully (Refund ID: {refund_result['refundId']})"
                        else:
                            print(f"❌ Square refund failed: {refund_result['error']}")
                            raise HTTPException(status_code=500, detail=f"Square refund failed: {refund_result['error']}")
                            
                    except Exception as e:
                        print(f"❌ Error processing Square refund: {e}")
                        raise HTTPException(status_code=500, detail=f"Failed to process Square refund: {str(e)}")
                else:
                    print(f"⚠️ No payment ID found in refund request {refund_id} - manual refund required")
                    admin_notes = f"{status_update.adminNotes or 'Refund approved'} - MANUAL REFUND REQUIRED (no payment ID found)"
            else:
                admin_notes = status_update.adminNotes or 'Refund rejected by admin'
            
            # Update the refund status in database
            success = await refund_repo.update_refund_status(
                refund_id=refund_id,
                status=status_update.status,
                admin_notes=admin_notes,
                processed_by=status_update.processedBy
            )
            
            if not success:
                raise HTTPException(status_code=404, detail="Refund request not found")
            
            print(f"✅ Refund request {refund_id} status updated to {status_update.status}")
            return {
                "success": True,
                "message": f"Refund request {status_update.status} successfully",
                "refundId": refund_id,
                "status": status_update.status,
                "paymentProcessed": status_update.status == 'approved' and payment_id is not None
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error updating refund request {refund_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update refund request: {str(e)}")

@refund_router.get("/stats/summary")
async def get_refund_stats():
    """Get refund statistics for admin dashboard"""
    try:
        print("📊 Getting refund statistics...")
        
        refund_repo = RefundRepository()
        try:
            await refund_repo.ensure_tables_exist()
            all_refunds = await refund_repo.get_all_refund_requests()
            
            # Calculate statistics
            total_requests = len(all_refunds)
            pending_count = len([r for r in all_refunds if r['status'] == 'pending'])
            approved_count = len([r for r in all_refunds if r['status'] == 'approved'])
            rejected_count = len([r for r in all_refunds if r['status'] == 'rejected'])
            
            # Calculate total amounts
            total_requested = sum(r['amount'] for r in all_refunds)
            total_approved = sum(r['amount'] for r in all_refunds if r['status'] == 'approved')
            
            stats = {
                "total_requests": total_requests,
                "pending_count": pending_count,
                "approved_count": approved_count,
                "rejected_count": rejected_count,
                "total_requested_amount": round(float(total_requested), 2),
                "total_approved_amount": round(float(total_approved), 2)
            }
            
            print(f"✅ Calculated refund statistics: {stats}")
            return {
                "success": True,
                "stats": stats
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting refund statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve refund statistics: {str(e)}") 