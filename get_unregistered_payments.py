#!/usr/bin/env python3
"""
Unregistered Payments取得スクリプト
ターミナルで直接未登録Paymentを取得・表示する
"""

import asyncio
import os
import sys
import json
from datetime import datetime, timedelta

# プロジェクトのルートディレクトリをPythonパスに追加
sys.path.append('/opt/UTJN-website')

from authentication.use_case.unregistered_payments.unregistered_payments_controller import get_unregistered_payments
from authentication.use_case.unregistered_payments.unregistered_payments_controller import UnregisteredPaymentRefund

async def main():
    """メイン処理"""
    print("🔍 未登録Payment取得スクリプト開始")
    print("=" * 60)
    
    try:
        # 未登録Paymentを取得
        print("📊 未登録Paymentを取得中...")
        
        # デフォルトで過去30日間のデータを取得
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        print(f"📅 検索期間: {start_date.strftime('%Y-%m-%d')} ～ {end_date.strftime('%Y-%m-%d')}")
        
        # 未登録Paymentを取得
        result = await get_unregistered_payments(
            email=None,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d')
        )
        
        if result.get('success'):
            unregistered_payments = result.get('unregisteredPayments', [])
            count = result.get('count', 0)
            
            print(f"\n✅ 取得完了: {count}件の未登録Paymentが見つかりました")
            print("=" * 60)
            
            if count == 0:
                print("📝 未登録Paymentは見つかりませんでした")
                return
            
            # 各Paymentの詳細を表示
            for i, payment in enumerate(unregistered_payments, 1):
                print(f"\n🔍 Payment #{i}")
                print(f"   Payment ID: {payment['paymentId']}")
                print(f"   Email: {payment['email']}")
                print(f"   Amount: {payment['currency']} ${payment['amount']:.2f}")
                print(f"   Status: {payment['status']}")
                print(f"   Created: {payment['createdAt']}")
                print(f"   Customer ID: {payment.get('customerId', 'N/A')}")
                print(f"   Order ID: {payment.get('orderId', 'N/A')}")
                
                if payment['status'] == 'refunded':
                    print(f"   Refund ID: {payment.get('refundId', 'N/A')}")
                    print(f"   Refund Date: {payment.get('refundDate', 'N/A')}")
                
                print("-" * 40)
            
            # サマリー表示
            print(f"\n📊 サマリー:")
            print(f"   総数: {count}件")
            
            # ステータス別集計
            status_counts = {}
            email_counts = {}
            
            for payment in unregistered_payments:
                status = payment['status']
                email = payment['email']
                
                status_counts[status] = status_counts.get(status, 0) + 1
                if email != 'Unknown':
                    email_counts[email] = email_counts.get(email, 0) + 1
            
            print(f"   ステータス別:")
            for status, count in status_counts.items():
                print(f"     {status}: {count}件")
            
            print(f"   メールアドレス取得済み: {len(email_counts)}件")
            print(f"   メールアドレス不明: {count - len(email_counts)}件")
            
            # メールアドレス別集計
            if email_counts:
                print(f"   メールアドレス別:")
                for email, count in email_counts.items():
                    print(f"     {email}: {count}件")
            
            # 金額合計
            total_amount = sum(payment['amount'] for payment in unregistered_payments)
            print(f"   総金額: CAD ${total_amount:.2f}")
            
            # 未返金の金額
            pending_amount = sum(payment['amount'] for payment in unregistered_payments if payment['status'] == 'pending')
            print(f"   未返金金額: CAD ${pending_amount:.2f}")
            
        else:
            print(f"❌ エラー: {result.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ スクリプト実行エラー: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
