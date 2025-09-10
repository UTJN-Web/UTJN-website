# authentication/use_case/unregistered_payments/unregistered_payments_controller.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import os
import requests
import json
from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository

unregistered_payments_router = APIRouter(prefix="/unregistered-payments", tags=["unregistered-payments"])

async def get_email_from_square_payment(payment, square_token, base_url):
    """Try to get email from Square payment data"""
    try:
        # Try to get email from customer if customer_id exists
        customer_id = payment.get('customer_id')
        if customer_id:
            try:
                customer_url = f"{base_url}/customers/{customer_id}"
                response = requests.get(customer_url, headers={
                    'Authorization': f'Bearer {square_token}',
                    'Square-Version': '2024-07-17',
                    'Content-Type': 'application/json'
                })
                
                if response.status_code == 200:
                    customer_data = response.json()
                    customer = customer_data.get('customer', {})
                    email = customer.get('email_address')
                    if email:
                        print(f"✅ Found email from customer {customer_id}: {email}")
                        return email
            except Exception as e:
                print(f"⚠️ Error getting customer email for {customer_id}: {e}")
        
        # Try to get email from order if order_id exists
        order_id = payment.get('order_id')
        if order_id:
            try:
                order_url = f"{base_url}/orders/{order_id}"
                response = requests.get(order_url, headers={
                    'Authorization': f'Bearer {square_token}',
                    'Square-Version': '2024-07-17',
                    'Content-Type': 'application/json'
                })
                
                if response.status_code == 200:
                    order_data = response.json()
                    order = order_data.get('order', {})
                    # Check for customer information in order
                    customer_info = order.get('customer_id')
                    if customer_info:
                        # Try to get customer email
                        customer_url = f"{base_url}/customers/{customer_info}"
                        customer_response = requests.get(customer_url, headers={
                            'Authorization': f'Bearer {square_token}',
                            'Square-Version': '2024-07-17',
                            'Content-Type': 'application/json'
                        })
                        
                        if customer_response.status_code == 200:
                            customer_data = customer_response.json()
                            customer = customer_data.get('customer', {})
                            email = customer.get('email_address')
                            if email:
                                print(f"✅ Found email from order {order_id} customer: {email}")
                                return email
            except Exception as e:
                print(f"⚠️ Error getting order email for {order_id}: {e}")
        
        # Try to extract email from payment metadata or other fields
        metadata = payment.get('metadata', {})
        if metadata:
            # Look for email in metadata
            for key, value in metadata.items():
                if 'email' in key.lower() and '@' in str(value):
                    print(f"✅ Found email in payment metadata: {value}")
                    return str(value)
        
        print(f"⚠️ No email found for payment {payment.get('id')}")
        return None
        
    except Exception as e:
        print(f"❌ Error extracting email from payment: {e}")
        return None

class UnregisteredPaymentRefund(BaseModel):
    paymentId: str
    amount: float
    currency: str
    customerId: Optional[str] = None
    orderId: Optional[str] = None
    createdAt: str
    email: str
    reason: Optional[str] = None

@unregistered_payments_router.get("")
async def get_unregistered_payments(
    email: Optional[str] = Query(None, description="Filter by specific email address"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get unregistered payments - payments that succeeded but have no registration"""
    try:
        print(f"🔍 Getting unregistered payments for email: {email or 'ALL'}")
        
        # Get Square access token
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            raise HTTPException(status_code=500, detail="Square access token not found")
        
        # Determine if sandbox or production
        base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
        
        # Set date range
        if start_date and end_date:
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        else:
            # Default to last 30 days
            end_dt = datetime.now()
            start_dt = end_dt - timedelta(days=30)
        
        print(f"📅 Searching payments from {start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}")
        
        # Step 1: Get ALL payments from Square API for the date range
        all_payments = []
        cursor = None
        
        while True:
            url = f"{base_url}/payments"
            params = {
                'begin_time': start_dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'end_time': end_dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'limit': 100
            }
            
            if cursor:
                params['cursor'] = cursor
            
            response = requests.get(url, headers={
                'Authorization': f'Bearer {square_token}',
                'Square-Version': '2024-07-17',
                'Content-Type': 'application/json'
            }, params=params)
            
            if response.status_code == 200:
                payments_data = response.json()
                payments = payments_data.get('payments', [])
                all_payments.extend(payments)
                
                print(f"Retrieved {len(payments)} payments (total: {len(all_payments)})")
                
                cursor = payments_data.get('cursor')
                if not cursor:
                    break
            else:
                print(f"❌ Square API Error: {response.text}")
                break
        
        print(f"📊 Total payments found: {len(all_payments)}")
        
        # Step 2: Get all registered payment IDs from database
        unregistered_repo = UnregisteredPaymentsRepository()
        
        # Get all payment IDs that are registered in our database
        registered_payment_ids = set()
        
        # Get all payment IDs from EventRegistration table
        from authentication.data_access.database_pool import get_global_connection
        async with get_global_connection() as conn:
            query = """
            SELECT "paymentId" FROM "EventRegistration" 
            WHERE "paymentId" IS NOT NULL AND "paymentId" != ''
            """
            rows = await conn.fetch(query)
            for row in rows:
                registered_payment_ids.add(row['paymentId'])
        
        print(f"📊 Found {len(registered_payment_ids)} registered payment IDs in database")
        
        # Step 3: Find unregistered payments
        unregistered_payments = []
        
        for payment in all_payments:
            payment_id = payment.get('id')
            status = payment.get('status')
            
            # Only process COMPLETED payments
            if status != 'COMPLETED':
                continue
            
            # Check if this payment ID is NOT in our database
            if payment_id not in registered_payment_ids:
                # This is an unregistered payment
                amount = payment.get('amount_money', {}).get('amount', 0)
                created_at = payment.get('created_at')
                customer_id = payment.get('customer_id')
                order_id = payment.get('order_id')
                
                # Try to get user email from customer_id or order_id (fast method)
                user_email = await unregistered_repo.get_user_email_by_identifiers(customer_id, order_id)
                
                # If no email found from identifiers, try to get from Square payment data (slow method)
                # Skip this for now to avoid timeout - we'll get email later if needed
                if not user_email:
                    user_email = 'Unknown'  # Skip Square API call to avoid timeout
                
                # Check if this payment has been refunded
                refund_status = await unregistered_repo.get_payment_refund_status(payment_id)
                
                # Determine status
                payment_status = 'refunded' if refund_status else 'pending'
                print(f"🔍 Payment {payment_id} status: {payment_status} (refund_status: {refund_status is not None})")
                
                unregistered_payment = {
                    'id': len(unregistered_payments) + 1,
                    'paymentId': payment_id,
                    'email': user_email or 'Unknown',
                    'amount': amount / 100,  # Convert from cents
                    'currency': payment.get('amount_money', {}).get('currency', 'CAD'),
                    'customerId': customer_id,
                    'orderId': order_id,
                    'createdAt': created_at,
                    'status': payment_status,
                    'refundId': refund_status.get('refundId') if refund_status else None,
                    'refundDate': refund_status.get('refundDate') if refund_status else None,
                    'rawPaymentData': payment
                }
                
                unregistered_payments.append(unregistered_payment)
                print(f"❌ UNREGISTERED PAYMENT FOUND: {payment_id} - {user_email or 'Unknown'} - ${amount/100:.2f} CAD")
        
        print(f"📊 Summary: Found {len(unregistered_payments)} unregistered payments")
        
        return {
            "success": True,
            "unregisteredPayments": unregistered_payments,
            "count": len(unregistered_payments),
            "email": email,
            "dateRange": {
                "start": start_dt.strftime('%Y-%m-%d'),
                "end": end_dt.strftime('%Y-%m-%d')
            }
        }
                
    except Exception as e:
        print(f"❌ Error getting unregistered payments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve unregistered payments: {str(e)}")

@unregistered_payments_router.post("/refund")
async def process_unregistered_payment_refund(refund_data: UnregisteredPaymentRefund):
    """Process refund for an unregistered payment"""
    try:
        print(f"💰 Processing refund for unregistered payment {refund_data.paymentId}")
        
        # Get Square access token
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            raise HTTPException(status_code=500, detail="Square access token not found")
        
        # Determine if sandbox or production
        base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
        
        # Process refund with Square API
        headers = {
            'Authorization': f'Bearer {square_token}',
            'Square-Version': '2024-07-17',
            'Content-Type': 'application/json'
        }
        
        # Generate unique idempotency key for refund
        import time
        import random
        idempotency_key = f"unregistered_refund_{int(time.time())}_{random.randint(1000, 9999)}"
        
        refund_request = {
            'idempotency_key': idempotency_key,
            'payment_id': refund_data.paymentId,
            'amount_money': {
                'amount': int(refund_data.amount * 100),  # Convert to cents
                'currency': refund_data.currency.upper()
            },
            'reason': refund_data.reason or 'Refund for failed registration - payment succeeded but registration failed'
        }
        
        print(f"🔁 Square refund request: {json.dumps(refund_request, indent=2)}")
        
        # Call Square API to process refund
        url = f"{base_url}/refunds"
        response = requests.post(url, headers=headers, json=refund_request)
        
        if response.status_code == 200:
            refund_result = response.json()
            refund_id = refund_result.get('refund', {}).get('id')
            
            print(f"✅ Square refund processed successfully: {refund_id}")
            
            # Store refund record in database
            unregistered_repo = UnregisteredPaymentsRepository()
            # Note: ensure_tables_exist() is called during app startup, not here
            
            await unregistered_repo.create_refund_record(
                payment_id=refund_data.paymentId,
                refund_id=refund_id,
                amount=refund_data.amount,
                currency=refund_data.currency,
                email=refund_data.email,
                reason=refund_data.reason,
                square_refund_data=refund_result
            )
            
            return {
                "success": True,
                "message": "Refund processed successfully",
                "refundId": refund_id,
                "paymentId": refund_data.paymentId,
                "amount": refund_data.amount,
                "currency": refund_data.currency
            }
        else:
            error_data = response.json()
            print(f"❌ Square refund failed: {json.dumps(error_data, indent=2)}")
            raise HTTPException(status_code=500, detail=f"Square refund failed: {error_data}")
            
    except Exception as e:
        print(f"❌ Error processing unregistered payment refund: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process refund: {str(e)}")