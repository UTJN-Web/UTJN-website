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
    """Get unregistered payments filtered by email and date range"""
    try:
        print(f"🔍 Getting unregistered payments for email: {email or 'ALL'}")
        
        # Get Square access token
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            raise HTTPException(status_code=500, detail="Square access token not found")
        
        # Determine if sandbox or production
        base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
        
        # Get registered payments for specific email or all if no email specified
        unregistered_repo = UnregisteredPaymentsRepository()
        # Note: ensure_tables_exist() is called during app startup, not here
        
        if email:
            # Get registered payments for specific email
            registered_payments = await unregistered_repo.get_registered_payments_by_email(email)
        else:
            # Get all registered payments (fallback for admin view)
            registered_payments = await unregistered_repo.get_registered_payments()
        
        if not registered_payments:
            print(f"⚠️ No registered payments found for email: {email or 'ALL'}")
            return {
                "success": True,
                "unregisteredPayments": [],
                "count": 0,
                "email": email
            }
        
        # Collect user identifiers (customer IDs and order IDs)
        user_customer_ids = set()
        user_order_ids = set()
        
        for payment in registered_payments:
            if payment.get('customerId'):
                user_customer_ids.add(payment['customerId'])
            if payment.get('orderId'):
                user_order_ids.add(payment['orderId'])
        
        print(f"🔍 Found {len(user_customer_ids)} customer IDs and {len(user_order_ids)} order IDs from registered payments")
        
        if not user_customer_ids and not user_order_ids:
            print("⚠️ No customer IDs or order IDs found from registered payments")
            return {
                "success": True,
                "unregisteredPayments": [],
                "count": 0,
                "email": email
            }
        
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
        
        # Search for payments using customer IDs for more efficient search
        all_payments = []
        
        # Search by customer ID first (more efficient)
        for customer_id in user_customer_ids:
            try:
                url = f"{base_url}/payments"
                params = {
                    'customer_id': customer_id,
                    'begin_time': start_dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'end_time': end_dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                    'limit': 100
                }
                
                response = requests.get(url, headers={
                    'Authorization': f'Bearer {square_token}',
                    'Square-Version': '2024-07-17',
                    'Content-Type': 'application/json'
                }, params=params)
                
                if response.status_code == 200:
                    payments_data = response.json()
                    payments = payments_data.get('payments', [])
                    all_payments.extend(payments)
                    print(f"Found {len(payments)} payments for customer {customer_id}")
                else:
                    print(f"❌ Square API Error for customer {customer_id}: {response.text}")
                    
            except Exception as e:
                print(f"❌ Error searching payments for customer {customer_id}: {e}")
        
        # Also search by order IDs if no customer IDs found
        if not user_customer_ids and user_order_ids:
            for order_id in user_order_ids:
                try:
                    url = f"{base_url}/payments"
                    params = {
                        'begin_time': start_dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'end_time': end_dt.strftime('%Y-%m-%dT%H:%M:%SZ'),
                        'limit': 100
                    }
                    
                    response = requests.get(url, headers={
                        'Authorization': f'Bearer {square_token}',
                        'Square-Version': '2024-07-17',
                        'Content-Type': 'application/json'
                    }, params=params)
                    
                    if response.status_code == 200:
                        payments_data = response.json()
                        payments = payments_data.get('payments', [])
                        # Filter by order ID
                        filtered_payments = [p for p in payments if p.get('order_id') == order_id]
                        all_payments.extend(filtered_payments)
                        print(f"Found {len(filtered_payments)} payments for order {order_id}")
                    else:
                        print(f"❌ Square API Error for order {order_id}: {response.text}")
                        
                except Exception as e:
                    print(f"❌ Error searching payments for order {order_id}: {e}")
        
        print(f"📊 Total payments found: {len(all_payments)}")
        
        # Look for completed payments that belong to the same user(s) but are not in our database
        unregistered_payments = []
        processed_payment_ids = set()  # 重複処理を防ぐためのセット
        
        # 全ユーザー検索時も、個別メール検索と同様の詳細な処理を実行
        if not email:
            print("🔍 全ユーザー検索: 支払い成功したが登録失敗した支払いを詳細検索します")
            # 個別メール検索と同様の処理を実行（ただし、処理件数を制限）
            payment_ids_to_check = []
            for payment in all_payments[:100]:  # 最大100件まで制限（全ユーザー検索のため）
                payment_id = payment.get('id')
                if payment_id not in processed_payment_ids:
                    payment_ids_to_check.append(payment_id)
            
            print(f"🔍 Found {len(payment_ids_to_check)} unique payments to check for all users")
            
            # 返金状態を一括で確認（個別メール検索と同様の処理）
            refund_statuses = {}
            if payment_ids_to_check:
                print(f"🔍 Checking refund status for {len(payment_ids_to_check)} payments...")
                
                # 最大20件ずつバッチ処理（全ユーザー検索のため少し大きめ）
                batch_size = 20
                for i in range(0, len(payment_ids_to_check), batch_size):
                    batch = payment_ids_to_check[i:i + batch_size]
                    print(f"📦 Processing batch {i//batch_size + 1}: {len(batch)} payments")
                    
                    for payment_id in batch:
                        try:
                            print(f"🔍 Checking payment {payment_id}...")
                            
                            # データベースの返金記録を先に確認
                            db_refund_status = await unregistered_repo.get_payment_refund_status(payment_id)
                            if db_refund_status:
                                refund_statuses[payment_id] = {
                                    'status': 'refunded',
                                    'refundId': db_refund_status.get('refundId'),
                                    'refundDate': db_refund_status.get('refundDate'),
                                    'source': 'database'
                                }
                                print(f"✅ Found refund in database for {payment_id}")
                                continue
                            
                            # Square APIで返金状態を確認（必要最小限）
                            refunds_url = f"{base_url}/v2/refunds"
                            print(f"🔗 Calling Square API: {refunds_url} for payment {payment_id}")
                            
                            refunds_response = requests.get(refunds_url, headers={
                                'Authorization': f'Bearer {square_token}',
                                'Square-Version': '2024-07-17',
                                'Content-Type': 'application/json'
                            }, params={'payment_id': payment_id})
                            
                            print(f"📡 Square API response for {payment_id}: Status {refunds_response.status_code}")
                            
                            if refunds_response.status_code == 200:
                                refunds_data = refunds_response.json()
                                refunds = refunds_data.get('refunds', [])
                                print(f"📊 Found {len(refunds)} refunds for payment {payment_id}")
                                
                                if refunds:
                                    # 返金の詳細を確認
                                    refund = refunds[0]
                                    refund_amount = refund.get('amount_money', {}).get('amount', 0)
                                    refund_status = refund.get('status', 'PENDING')
                                    
                                    print(f"💰 Refund details for {payment_id}: Amount=${refund_amount/100:.2f}, Status={refund_status}")
                                    
                                    # 支払い情報を取得して金額を比較
                                    payment_info = next((p for p in all_payments if p.get('id') == payment_id), None)
                                    if payment_info:
                                        payment_amount = payment_info.get('amount_money', {}).get('amount', 0)
                                        payment_currency = payment_info.get('amount_money', {}).get('currency', 'CAD')
                                        refund_currency = refund.get('amount_money', {}).get('currency', 'CAD')
                                        
                                        print(f"💳 Payment details for {payment_id}: Amount=${payment_amount/100:.2f}, Currency={payment_currency}")
                                        
                                        # 金額、通貨、返金ステータスを厳密に確認
                                        if (refund_amount == payment_amount and 
                                            refund_currency == payment_currency and
                                            refund_status == 'COMPLETED'):
                                            
                                            # 返金日時を確認（支払い作成日より後であることを確認）
                                            refund_created = refund.get('created_at')
                                            payment_created = payment_info.get('created_at')
                                            
                                            if refund_created and payment_created:
                                                try:
                                                    refund_date = datetime.fromisoformat(refund_created.replace('Z', '+00:00'))
                                                    payment_date = datetime.fromisoformat(payment_created.replace('Z', '+00:00'))
                                                    
                                                    print(f"📅 Date comparison for {payment_id}: Payment={payment_date}, Refund={refund_date}")
                                                    
                                                    if refund_date > payment_date:
                                                        # 本当にこの支払いに対する返金
                                                        refund_statuses[payment_id] = {
                                                            'status': 'refunded',
                                                            'refundId': refund.get('id'),
                                                            'refundDate': refund_created,
                                                            'source': 'square_api'
                                                        }
                                                        print(f"✅ Found valid refund from Square API for {payment_id}")
                                                except Exception as e:
                                                    print(f"❌ Error parsing dates for {payment_id}: {e}")
                                            else:
                                                print(f"⚠️ Missing date information for {payment_id}")
                                        else:
                                            print(f"⚠️ Amount/currency mismatch or incomplete refund for {payment_id}")
                                    else:
                                        print(f"⚠️ Payment info not found for {payment_id}")
                                else:
                                    print(f"📊 No refunds found for payment {payment_id}")
                                    # 返金がない場合、未返金として扱う
                                    refund_statuses[payment_id] = {
                                        'status': 'pending',
                                        'source': 'square_api'
                                    }
                            else:
                                print(f"❌ Square API Error for {payment_id}: {refunds_response.text}")
                                # API エラーの場合、未返金として扱う
                                refund_statuses[payment_id] = {
                                    'status': 'pending',
                                    'source': 'square_api'
                                }
                                
                        except Exception as e:
                            print(f"❌ Error checking payment {payment_id}: {e}")
                            # エラーの場合、未返金として扱う
                            refund_statuses[payment_id] = {
                                'status': 'pending',
                                'source': 'error'
                            }
                
                # 返金状態に基づいて unregistered payments を作成
                for payment in all_payments:
                    payment_id = payment.get('id')
                    if payment_id in refund_statuses:
                        refund_info = refund_statuses[payment_id]
                        
                        # 支払いの存在確認
                        existing = await unregistered_repo.check_payment_exists(payment_id)
                        
                        if not existing:
                            # 支払い成功したが登録失敗した支払い
                            unregistered_payment = {
                                'id': len(unregistered_payments) + 1,
                                'paymentId': payment_id,
                                'email': 'All Users Search',
                                'amount': payment.get('amount_money', {}).get('amount', 0) / 100,
                                'currency': payment.get('amount_money', {}).get('currency', 'CAD'),
                                'customerId': payment.get('customer_id'),
                                'orderId': payment.get('order_id'),
                                'createdAt': payment.get('created_at'),
                                'status': refund_info['status'],
                                'refundId': refund_info.get('refundId'),
                                'refundDate': refund_info.get('refundDate'),
                                'rawPaymentData': payment
                            }
                            unregistered_payments.append(unregistered_payment)
                            print(f"✅ Added unregistered payment: {payment_id} (Status: {refund_info['status']})")
                
                print(f"📊 All users search: Found {len(unregistered_payments)} unregistered payments")
                return {
                    "success": True,
                    "unregisteredPayments": unregistered_payments,
                    "count": len(unregistered_payments),
                    "dateRange": f"{start_date} to {end_date}",
                    "message": "All users search completed - showing all unregistered payments (pending, refunded, etc.)"
                }
        
        # 特定のメールアドレス検索時は、詳細な処理を実行
        # まず、全ての支払いIDに対して一括で返金状態を確認
        unregistered_payments = []
        processed_payment_ids = set()  # 重複処理を防ぐためのセット
        
        payment_ids_to_check = []
        for payment in all_payments:
            payment_id = payment.get('id')
            if payment_id not in processed_payment_ids:
                payment_ids_to_check.append(payment_id)
        
        print(f"🔍 Found {len(payment_ids_to_check)} unique payments to check for email: {email}")
        
        # 返金状態を一括で確認（Square API呼び出しを削減）
        refund_statuses = {}
        if payment_ids_to_check:
            print(f"🔍 Checking refund status for {len(payment_ids_to_check)} payments...")
            
            # 最大10件ずつバッチ処理
            batch_size = 10
            for i in range(0, len(payment_ids_to_check), batch_size):
                batch = payment_ids_to_check[i:i + batch_size]
                print(f"📦 Processing batch {i//batch_size + 1}: {len(batch)} payments")
                
                for payment_id in batch:
                    try:
                        print(f"🔍 Checking payment {payment_id}...")
                        
                        # データベースの返金記録を先に確認
                        db_refund_status = await unregistered_repo.get_payment_refund_status(payment_id)
                        if db_refund_status:
                            refund_statuses[payment_id] = {
                                'status': 'refunded',
                                'refundId': db_refund_status.get('refundId'),
                                'refundDate': db_refund_status.get('refundDate'),
                                'source': 'database'
                            }
                            print(f"✅ Found refund in database for {payment_id}")
                            continue
                        
                        # Square APIで返金状態を確認（必要最小限）
                        refunds_url = f"{base_url}/v2/refunds"
                        print(f"🔗 Calling Square API: {refunds_url} for payment {payment_id}")
                        
                        refunds_response = requests.get(refunds_url, headers={
                            'Authorization': f'Bearer {square_token}',
                            'Square-Version': '2024-07-17',
                            'Content-Type': 'application/json'
                        }, params={'payment_id': payment_id})
                        
                        print(f"📡 Square API response for {payment_id}: Status {refunds_response.status_code}")
                        
                        if refunds_response.status_code == 200:
                            refunds_data = refunds_response.json()
                            refunds = refunds_data.get('refunds', [])
                            print(f"📊 Found {len(refunds)} refunds for payment {payment_id}")
                            
                            if refunds:
                                # 返金の詳細を確認
                                refund = refunds[0]
                                refund_amount = refund.get('amount_money', {}).get('amount', 0)
                                refund_status = refund.get('status', 'PENDING')
                                
                                print(f"💰 Refund details for {payment_id}: Amount=${refund_amount/100:.2f}, Status={refund_status}")
                                
                                # 支払い情報を取得して金額を比較
                                payment_info = next((p for p in all_payments if p.get('id') == payment_id), None)
                                if payment_info:
                                    payment_amount = payment_info.get('amount_money', {}).get('amount', 0)
                                    payment_currency = payment_info.get('amount_money', {}).get('currency', 'CAD')
                                    refund_currency = refund.get('amount_money', {}).get('currency', 'CAD')
                                    
                                    print(f"💳 Payment details for {payment_id}: Amount=${payment_amount/100:.2f}, Currency={payment_currency}")
                                    
                                    # 金額、通貨、返金ステータスを厳密に確認
                                    if (refund_amount == payment_amount and 
                                        refund_currency == payment_currency and
                                        refund_status == 'COMPLETED'):
                                        
                                        # 返金日時を確認（支払い作成日より後であることを確認）
                                        refund_created = refund.get('created_at')
                                        payment_created = payment_info.get('created_at')
                                        
                                        if refund_created and payment_created:
                                            try:
                                                refund_date = datetime.fromisoformat(refund_created.replace('Z', '+00:00'))
                                                payment_date = datetime.fromisoformat(payment_created.replace('Z', '+00:00'))
                                                
                                                print(f"📅 Date comparison for {payment_id}: Payment={payment_date}, Refund={refund_date}")
                                                
                                                if refund_date > payment_date:
                                                    # 本当にこの支払いに対する返金
                                                    refund_statuses[payment_id] = {
                                                        'status': 'refunded',
                                                        'refundId': refund.get('id'),
                                                        'refundDate': refund_created,
                                                        'source': 'square_api_validated'
                                                    }
                                                    print(f"✅ Found valid refund for payment {payment_id}: {refund.get('id')} (Amount: ${refund_amount/100:.2f}, Status: {refund_status})")
                                                else:
                                                    refund_statuses[payment_id] = {
                                                        'status': 'pending',
                                                        'refundId': None,
                                                        'refundDate': None,
                                                        'source': 'date_invalid'
                                                    }
                                                    print(f"⚠️ Refund date ({refund_date}) is before payment date ({payment_date}) for {payment_id}")
                                            except Exception as e:
                                                print(f"⚠️ Error parsing dates for payment {payment_id}: {e}")
                                                refund_statuses[payment_id] = {
                                                    'status': 'pending',
                                                    'refundId': None,
                                                    'refundDate': None,
                                                    'source': 'date_parse_error'
                                                }
                                        else:
                                            refund_statuses[payment_id] = {
                                                'status': 'pending',
                                                'refundId': None,
                                                'refundDate': None,
                                                'source': 'missing_dates'
                                            }
                                    else:
                                        refund_statuses[payment_id] = {
                                            'status': 'pending',
                                            'refundId': None,
                                            'refundDate': None,
                                            'source': f'validation_failed: amount={refund_amount==payment_amount}, currency={refund_currency==payment_currency}, status={refund_status}'
                                        }
                                        print(f"⚠️ Refund validation failed for payment {payment_id}: Amount match={refund_amount==payment_amount}, Currency match={refund_currency==payment_currency}, Status={refund_status}")
                                else:
                                    refund_statuses[payment_id] = {
                                        'status': 'pending',
                                        'refundId': None,
                                        'refundDate': None,
                                        'source': 'payment_not_found'
                                    }
                            else:
                                refund_statuses[payment_id] = {
                                    'status': 'pending',
                                    'refundId': None,
                                    'refundDate': None,
                                    'source': 'no_refund'
                                }
                        else:
                            refund_statuses[payment_id] = {
                                'status': 'pending',
                                'refundId': None,
                                'refundDate': None,
                                'source': f'api_error_{refunds_response.status_code}'
                            }
                            
                    except Exception as e:
                        print(f"⚠️ Error checking refund status for {payment_id}: {e}")
                        refund_statuses[payment_id] = {
                            'status': 'pending',
                            'refundId': None,
                            'refundDate': None,
                            'source': 'error'
                        }
                
                # バッチ間で少し待機（API制限を避ける）
                if i + batch_size < len(payment_ids_to_check):
                    import time
                    time.sleep(0.1)
        
        print(f"📊 Refund status check completed for {len(refund_statuses)} payments")
        print(f"📋 Refund status summary:")
        for payment_id, status_info in refund_statuses.items():
            print(f"  - {payment_id}: {status_info['status']} (source: {status_info['source']})")
        
        # 支払い情報を処理
        for payment in all_payments:
            payment_id = payment.get('id')
            
            # 既に処理済みの支払いIDはスキップ
            if payment_id in processed_payment_ids:
                continue
            
            status = payment.get('status')
            amount = payment.get('amount_money', {}).get('amount', 0)
            created_at = payment.get('created_at')
            customer_id = payment.get('customer_id')
            order_id = payment.get('order_id')
            
            # Check if this payment belongs to the same user(s)
            is_same_user = (
                (customer_id and customer_id in user_customer_ids) or
                (order_id and order_id in user_order_ids)
            )
            
            # Check all completed payments that belong to the same user(s)
            if status == 'COMPLETED' and is_same_user:
                # Check if this payment is already in our database
                existing = await unregistered_repo.check_payment_exists(payment_id)
                
                if not existing:
                    # Get user email from registered payments
                    user_email = await unregistered_repo.get_user_email_by_identifiers(customer_id, order_id)
                    
                    # 返金状態を確認
                    if payment_id in refund_statuses:
                        refund_status = refund_statuses[payment_id]['status']
                        refund_id = refund_statuses[payment_id]['refundId']
                        refund_date = refund_statuses[payment_id]['refundDate']
                    else:
                        refund_status = 'pending'
                        refund_id = None
                        refund_date = None
                    
                    unregistered_payment = {
                        'id': len(unregistered_payments) + 1,  # Temporary ID
                        'paymentId': payment_id,
                        'email': user_email or 'Unknown',
                        'amount': amount / 100,  # Convert from cents
                        'currency': payment.get('amount_money', {}).get('currency', 'CAD'),
                        'customerId': customer_id,
                        'orderId': order_id,
                        'createdAt': created_at,
                        'status': refund_status,
                        'refundId': refund_id,
                        'refundDate': refund_date,
                        'rawPaymentData': payment
                    }
                    
                    unregistered_payments.append(unregistered_payment)
                    processed_payment_ids.add(payment_id)  # 処理済みとしてマーク
                    print(f"❌ UNREGISTERED PAYMENT FOUND: {payment_id} - {user_email} - ${amount/100:.2f} CAD - Status: {refund_status}")
        
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
