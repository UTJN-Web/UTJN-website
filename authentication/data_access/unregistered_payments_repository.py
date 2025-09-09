# authentication/data_access/unregistered_payments_repository.py
import asyncpg
import os
import json
import aiohttp
from datetime import datetime
from typing import List, Dict, Optional
from authentication.data_access.database_pool import get_global_connection

class UnregisteredPaymentsRepository:
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:MyNewPassword123!@utjn-db.ch68m8sgy7on.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require")

    async def ensure_tables_exist(self):
        """Ensure the unregistered payments and refunds tables exist"""
        try:
            async with get_global_connection() as conn:
                # Create unregistered payments refunds table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "UnregisteredPaymentRefunds" (
                        id SERIAL PRIMARY KEY,
                        "paymentId" VARCHAR(255) NOT NULL UNIQUE,
                        "refundId" VARCHAR(255),
                        amount DECIMAL(10,2) NOT NULL,
                        currency VARCHAR(10) DEFAULT 'CAD',
                        email VARCHAR(255) NOT NULL,
                        reason TEXT,
                        "squareRefundData" JSONB,
                        "refundDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        "adminNotes" TEXT,
                        "processedBy" VARCHAR(255) DEFAULT 'Admin'
                    )
                """)
                
            print("✅ Unregistered payments tables ensured")
            
        except Exception as e:
            print(f"❌ Error ensuring unregistered payments tables: {e}")
            raise e

    async def process_automatic_refund(self, payment_id: str, amount: float, email: str, reason: str = "Registration failed after successful payment") -> Dict:
        """Process automatic refund through Square API when registration fails after payment"""
        try:
            print(f"🔄 Processing automatic refund for payment {payment_id}, amount: ${amount}")
            
            # Get Square API credentials
            square_application_id = os.getenv('SQUARE_APPLICATION_ID')
            square_access_token = os.getenv('SQUARE_ACCESS_TOKEN')
            square_environment = os.getenv('SQUARE_ENVIRONMENT', 'sandbox')
            
            if not square_application_id or not square_access_token:
                raise Exception("Square API credentials not configured")
            
            # Determine Square API URL based on environment
            if square_environment == 'production':
                square_api_url = "https://connect.squareup.com/v2"
            else:
                square_api_url = "https://connect.squareupsandbox.com/v2"
            
            # Prepare refund request
            refund_data = {
                "idempotency_key": f"refund_{payment_id}_{datetime.now().timestamp()}",
                "payment_id": payment_id,
                "amount_money": {
                    "amount": int(amount * 100),  # Convert to cents
                    "currency": "CAD"
                },
                "reason": reason
            }
            
            headers = {
                "Square-Version": "2023-10-18",
                "Authorization": f"Bearer {square_access_token}",
                "Content-Type": "application/json"
            }
            
            # Process refund through Square API
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{square_api_url}/refunds",
                    headers=headers,
                    json=refund_data
                ) as response:
                    response_data = await response.json()
                    
                    if response.status == 200:
                        refund_info = response_data.get('refund', {})
                        refund_id = refund_info.get('id')
                        
                        print(f"✅ Automatic refund successful: {refund_id}")
                        
                        # Store refund record in database
                        await self.store_refund_record(
                            payment_id=payment_id,
                            refund_id=refund_id,
                            amount=amount,
                            email=email,
                            reason=reason,
                            square_refund_data=refund_info
                        )
                        
                        # Send refund confirmation email
                        try:
                            from authentication.email_sends.ses_functions import send_refund_confirmation
                            email_sent = send_refund_confirmation(
                                email=email,
                                refund_id=refund_id,
                                amount=amount,
                                event_name="Event Registration",  # Could be enhanced to get actual event name
                                reason=reason
                            )
                            if email_sent:
                                print(f"✅ Refund confirmation email sent to {email}")
                            else:
                                print(f"⚠️ Failed to send refund confirmation email to {email}")
                        except Exception as email_error:
                            print(f"⚠️ Error sending refund confirmation email: {email_error}")
                        
                        return {
                            "success": True,
                            "refund_id": refund_id,
                            "amount": amount,
                            "message": "Automatic refund processed successfully"
                        }
                    else:
                        error_message = response_data.get('errors', [{}])[0].get('detail', 'Unknown error')
                        print(f"❌ Square refund failed: {error_message}")
                        
                        return {
                            "success": False,
                            "error": f"Square refund failed: {error_message}",
                            "square_response": response_data
                        }
                        
        except Exception as e:
            print(f"❌ Error processing automatic refund: {e}")
            return {
                "success": False,
                "error": f"Refund processing failed: {str(e)}"
            }

    async def store_refund_record(self, payment_id: str, refund_id: str, amount: float, 
                                 email: str, reason: str, square_refund_data: Dict):
        """Store refund record in database"""
        try:
            async with get_global_connection() as conn:
                await conn.execute("""
                    INSERT INTO "UnregisteredPaymentRefunds" 
                    ("paymentId", "refundId", amount, currency, email, reason, "squareRefundData", "processedBy")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, payment_id, refund_id, amount, 'CAD', email, reason, 
                    json.dumps(square_refund_data), 'Automatic System')
                
                print(f"✅ Refund record stored: {refund_id}")
                
        except Exception as e:
            print(f"❌ Error storing refund record: {e}")
            raise e

    async def get_registered_payments_by_email(self, email: str) -> List[Dict]:
        """Get registered payments for a specific email address"""
        try:
            async with get_global_connection() as conn:
                # Get registered payments with Square payment details for specific email
                query = """
                SELECT 
                    er."paymentId",
                    u.email,
                    er."registeredAt"
                FROM "EventRegistration" er
                LEFT JOIN "User" u ON er."userId" = u.id
                WHERE u.email = $1
                AND er."paymentId" IS NOT NULL AND er."paymentId" != ''
                ORDER BY er."registeredAt" DESC
                """
                
                rows = await conn.fetch(query, email)
                
                # Get Square payment details for each registered payment
                payments = []
                for row in rows:
                    payment_data = await self.get_square_payment_details(row['paymentId'])
                    if payment_data:
                        payments.append({
                            'paymentId': row['paymentId'],
                            'email': row['email'],
                            'registeredAt': row['registeredAt'].isoformat() if row['registeredAt'] else None,
                            'customerId': payment_data.get('customer_id'),
                            'orderId': payment_data.get('order_id')
                        })
                
                return payments
                
        except Exception as e:
            print(f"❌ Error getting registered payments by email: {e}")
            return []

    async def get_registered_payments(self) -> List[Dict]:
        """Get all registered payments with customer IDs and order IDs"""
        try:
            async with get_global_connection() as conn:
                # Get registered payments with Square payment details
                query = """
                SELECT 
                    er."paymentId",
                    u.email,
                    er."registeredAt"
                FROM "EventRegistration" er
                LEFT JOIN "User" u ON er."userId" = u.id
                WHERE er."paymentId" IS NOT NULL AND er."paymentId" != ''
                ORDER BY er."registeredAt" DESC
                """
                
                rows = await conn.fetch(query)
                
                # Get Square payment details for each registered payment
                payments = []
                for row in rows:
                    payment_data = await self.get_square_payment_details(row['paymentId'])
                    if payment_data:
                        payments.append({
                            'paymentId': row['paymentId'],
                            'email': row['email'],
                            'registeredAt': row['registeredAt'].isoformat() if row['registeredAt'] else None,
                            'customerId': payment_data.get('customer_id'),
                            'orderId': payment_data.get('order_id')
                        })
                
                return payments
                
        except Exception as e:
            print(f"❌ Error getting registered payments: {e}")
            return []

    async def get_square_payment_details(self, payment_id: str) -> Optional[Dict]:
        """Get Square payment details for a payment ID"""
        try:
            import requests
            
            square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
            if not square_token:
                return None
            
            base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
            
            headers = {
                'Authorization': f'Bearer {square_token}',
                'Square-Version': '2024-07-17',
                'Content-Type': 'application/json'
            }
            
            url = f"{base_url}/payments/{payment_id}"
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                payment_data = response.json()
                return payment_data.get('payment', {})
            else:
                print(f"❌ Failed to get Square payment details for {payment_id}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting Square payment details: {e}")
            return None

    async def check_payment_exists(self, payment_id: str) -> bool:
        """Check if a payment ID exists in EventRegistration table"""
        try:
            async with get_global_connection() as conn:
                query = """
                SELECT COUNT(*) as count
                FROM "EventRegistration" 
                WHERE "paymentId" = $1
                """
                
                result = await conn.fetchval(query, payment_id)
                return result > 0
                
        except Exception as e:
            print(f"❌ Error checking payment existence: {e}")
            return False

    async def get_payment_refund_status(self, payment_id: str) -> Optional[Dict]:
        """Get refund status for a payment ID from UnregisteredPaymentRefunds table"""
        try:
            async with get_global_connection() as conn:
                query = """
                SELECT "refundId", "refundDate", amount, currency, email, reason
                FROM "UnregisteredPaymentRefunds" 
                WHERE "paymentId" = $1
                """
                
                result = await conn.fetchrow(query, payment_id)
                if result:
                    return {
                        'refundId': result['refundId'],
                        'refundDate': result['refundDate'].isoformat() if result['refundDate'] else None,
                        'amount': result['amount'],
                        'currency': result['currency'],
                        'email': result['email'],
                        'reason': result['reason']
                    }
                return None
                
        except Exception as e:
            print(f"❌ Error getting payment refund status: {e}")
            return None

    async def get_user_email_by_identifiers(self, customer_id: Optional[str], order_id: Optional[str]) -> Optional[str]:
        """Get user email by customer ID or order ID from registered payments"""
        try:
            if not customer_id and not order_id:
                return None
            
            # Get registered payments and their Square details
            registered_payments = await self.get_registered_payments()
            
            for payment in registered_payments:
                if (customer_id and payment.get('customerId') == customer_id) or \
                   (order_id and payment.get('orderId') == order_id):
                    return payment.get('email')
            
            return None
            
        except Exception as e:
            print(f"❌ Error getting user email by identifiers: {e}")
            return None

    async def create_refund_record(self, payment_id: str, refund_id: str, amount: float, 
                                 currency: str, email: str, reason: Optional[str] = None, 
                                 square_refund_data: Optional[Dict] = None):
        """Create a record of processed refund"""
        try:
            async with get_global_connection() as conn:
                query = """
                INSERT INTO "UnregisteredPaymentRefunds" 
                ("paymentId", "refundId", amount, currency, email, reason, "squareRefundData", "refundDate")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT ("paymentId") DO UPDATE SET
                    "refundId" = EXCLUDED."refundId",
                    "refundDate" = CURRENT_TIMESTAMP,
                    "squareRefundData" = EXCLUDED."squareRefundData"
                """
                
                await conn.execute(
                    query,
                    payment_id,
                    refund_id,
                    amount,
                    currency,
                    email,
                    reason,
                    json.dumps(square_refund_data) if square_refund_data else None,
                    datetime.now()
                )
                
            print(f"✅ Refund record created for payment {payment_id}")
            
        except Exception as e:
            print(f"❌ Error creating refund record: {e}")
            raise e

    async def get_refund_records(self) -> List[Dict]:
        """Get all refund records"""
        try:
            async with get_global_connection() as conn:
                query = """
                SELECT * FROM "UnregisteredPaymentRefunds"
                ORDER BY "refundDate" DESC
                """
                
                rows = await conn.fetch(query)
                return [dict(row) for row in rows]
                
        except Exception as e:
            print(f"❌ Error getting refund records: {e}")
            return []
