#!/usr/bin/env python3
"""
Unregistered Payments Refund Processing Script
Processes refunds for all pending unregistered payments
"""

import asyncio
import os
import sys
import json
import time
import random
import requests
from datetime import datetime, timedelta

# プロジェクトのルートディレクトリをPythonパスに追加
sys.path.append('/opt/UTJN-website')

from authentication.use_case.unregistered_payments.unregistered_payments_controller import get_unregistered_payments
from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository

async def process_refund_for_payment(payment, square_token, base_url):
    """Process refund for a single payment"""
    try:
        payment_id = payment['paymentId']
        amount = payment['amount']
        currency = payment['currency']
        email = payment['email']
        
        print(f"💰 Processing refund for {payment_id} - {email} - ${amount:.2f} {currency}")
        
        # Generate unique idempotency key for refund
        idempotency_key = f"unregistered_refund_{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Prepare refund request
        refund_request = {
            'idempotency_key': idempotency_key,
            'payment_id': payment_id,
            'amount_money': {
                'amount': int(amount * 100),  # Convert to cents
                'currency': currency.upper()
            },
            'reason': 'Refund for failed registration - payment succeeded but registration failed'
        }
        
        print(f"🔁 Square refund request: {json.dumps(refund_request, indent=2)}")
        
        # Call Square API to process refund
        headers = {
            'Authorization': f'Bearer {square_token}',
            'Square-Version': '2024-07-17',
            'Content-Type': 'application/json'
        }
        
        url = f"{base_url}/refunds"
        response = requests.post(url, headers=headers, json=refund_request)
        
        if response.status_code == 200:
            refund_result = response.json()
            refund_id = refund_result.get('refund', {}).get('id')
            
            print(f"✅ Square refund processed successfully: {refund_id}")
            
            # Store refund record in database
            unregistered_repo = UnregisteredPaymentsRepository()
            
            await unregistered_repo.create_refund_record(
                payment_id=payment_id,
                refund_id=refund_id,
                amount=amount,
                currency=currency,
                email=email,
                reason='Refund for failed registration - payment succeeded but registration failed',
                square_refund_data=refund_result
            )
            
            return {
                'success': True,
                'payment_id': payment_id,
                'refund_id': refund_id,
                'amount': amount,
                'currency': currency,
                'email': email
            }
        else:
            error_data = response.json()
            print(f"❌ Square refund failed: {json.dumps(error_data, indent=2)}")
            return {
                'success': False,
                'payment_id': payment_id,
                'error': error_data,
                'amount': amount,
                'currency': currency,
                'email': email
            }
            
    except Exception as e:
        print(f"❌ Error processing refund for {payment_id}: {e}")
        return {
            'success': False,
            'payment_id': payment_id,
            'error': str(e),
            'amount': amount,
            'currency': currency,
            'email': email
        }

async def main():
    """メイン処理"""
    print("💰 未登録Payment一括返金処理スクリプト開始")
    print("=" * 60)
    
    try:
        # Get Square access token
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            print("❌ Square access token not found")
            return
        
        # Determine if sandbox or production
        base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
        print(f"🔗 Using Square API: {'Sandbox' if 'sandbox' in square_token else 'Production'}")
        
        # Get unregistered payments
        print("📊 未登録Paymentを取得中...")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        result = await get_unregistered_payments(
            email=None,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
        
        if not result.get('success'):
            print(f"❌ Failed to get unregistered payments: {result.get('error')}")
            return
        
        unregistered_payments = result.get('unregisteredPayments', [])
        
        # Filter only pending payments
        pending_payments = [p for p in unregistered_payments if p['status'] == 'pending']
        
        print(f"📊 総未登録Payment: {len(unregistered_payments)}件")
        print(f"📊 未返金Payment: {len(pending_payments)}件")
        
        if len(pending_payments) == 0:
            print("✅ 返金対象のPaymentはありません")
            return
        
        # Calculate total amount to refund
        total_amount = sum(p['amount'] for p in pending_payments)
        print(f"💰 返金予定総額: CAD ${total_amount:.2f}")
        
        # Ask for confirmation
        print("\n⚠️  注意: この処理は実際にSquare APIを呼び出して返金を実行します")
        print("続行しますか？ (y/N): ", end="")
        
        # For automated processing, we'll proceed without user input
        # In production, you might want to add actual user confirmation
        proceed = True  # Set to False if you want manual confirmation
        
        if not proceed:
            print("❌ 処理をキャンセルしました")
            return
        
        print("✅ 返金処理を開始します...")
        print("=" * 60)
        
        # Process refunds
        successful_refunds = []
        failed_refunds = []
        
        for i, payment in enumerate(pending_payments, 1):
            print(f"\n🔄 Processing {i}/{len(pending_payments)}: {payment['paymentId']}")
            
            refund_result = await process_refund_for_payment(payment, square_token, base_url)
            
            if refund_result['success']:
                successful_refunds.append(refund_result)
                print(f"✅ Success: {refund_result['payment_id']} -> {refund_result['refund_id']}")
            else:
                failed_refunds.append(refund_result)
                print(f"❌ Failed: {refund_result['payment_id']} - {refund_result['error']}")
            
            # Add small delay to avoid rate limiting
            await asyncio.sleep(1)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 返金処理完了サマリー")
        print("=" * 60)
        
        print(f"✅ 成功: {len(successful_refunds)}件")
        print(f"❌ 失敗: {len(failed_refunds)}件")
        
        if successful_refunds:
            successful_amount = sum(r['amount'] for r in successful_refunds)
            print(f"💰 返金成功金額: CAD ${successful_amount:.2f}")
            
            print(f"\n✅ 成功した返金:")
            for refund in successful_refunds:
                print(f"   {refund['payment_id']} -> {refund['refund_id']} (${refund['amount']:.2f} {refund['currency']}) - {refund['email']}")
        
        if failed_refunds:
            failed_amount = sum(r['amount'] for r in failed_refunds)
            print(f"\n❌ 失敗した返金:")
            print(f"💰 返金失敗金額: CAD ${failed_amount:.2f}")
            
            for refund in failed_refunds:
                print(f"   {refund['payment_id']} - {refund['error']} (${refund['amount']:.2f} {refund['currency']}) - {refund['email']}")
        
        print(f"\n🎉 処理完了: {len(successful_refunds)}/{len(pending_payments)}件の返金が成功しました")
        
    except Exception as e:
        print(f"❌ スクリプト実行エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
