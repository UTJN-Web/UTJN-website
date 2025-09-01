#!/usr/bin/env python3
"""
Check raw Square Payment Transaction objects for users
"""
import os
import asyncpg
import asyncio
import json
import requests
import argparse
from datetime import datetime, timedelta

async def check_raw_payment_objects(target_emails=None, start_date=None, end_date=None):
    """Check raw Square Payment Transaction objects for specific users"""
    
    # Database connection
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:MyNewPassword123!@utjn-db.ch68m8sgy7on.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("🔍 Checking raw Square Payment Transaction objects")
        print("=" * 80)
        
        # Get Square access token
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            print("❌ SQUARE_ACCESS_TOKEN not found")
            return
        
        # Get payment IDs for specific users
        if target_emails:
            # Use provided email list
            email_list = "', '".join(target_emails)
            q = f"""
            SELECT er."paymentId", u.email, u.id as user_id, e.name as event_name, er."registeredAt"
            FROM "EventRegistration" er
            LEFT JOIN "User" u ON er."userId" = u.id
            LEFT JOIN "Event" e ON er."eventId" = e.id
            WHERE u.email IN ('{email_list}')
            AND er."paymentId" IS NOT NULL AND er."paymentId" != ''
            ORDER BY er."registeredAt" DESC
            """
        else:
            # Get all registered payments
            q = """
            SELECT er."paymentId", u.email, u.id as user_id, e.name as event_name, er."registeredAt"
            FROM "EventRegistration" er
            LEFT JOIN "User" u ON er."userId" = u.id
            LEFT JOIN "Event" e ON er."eventId" = e.id
            WHERE er."paymentId" IS NOT NULL AND er."paymentId" != ''
            ORDER BY er."registeredAt" DESC
            """
        
        registered_payments = await conn.fetch(q)
        
        print(f"Found {len(registered_payments)} registered payments to check:")
        for p in registered_payments:
            print(f"  - {p['email']}: {p['paymentId']} ({p['event_name']})")
        
        # Check each registered payment with Square API and collect user identifiers
        print(f"\n🔍 Checking registered payments with Square API:")
        user_customer_ids = set()
        user_order_ids = set()
        
        for payment in registered_payments:
            payment_id = payment['paymentId']
            print(f"\n📋 Payment ID: {payment_id}")
            print(f"   User: {payment['email']}")
            print(f"   Event: {payment['event_name']}")
            print(f"   Registered: {payment['registeredAt']}")
            
            try:
                # Call Square API to get raw payment details
                headers = {
                    'Authorization': f'Bearer {square_token}',
                    'Square-Version': '2024-07-17',
                    'Content-Type': 'application/json'
                }
                
                # Determine if sandbox or production
                base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
                url = f"{base_url}/payments/{payment_id}"
                
                response = requests.get(url, headers=headers)
                print(f"   Square API Response Status: {response.status_code}")
                
                if response.status_code == 200:
                    payment_data = response.json()
                    payment_obj = payment_data.get('payment', {})
                    
                    # Collect user identifiers for further search
                    customer_id = payment_obj.get('customer_id')
                    order_id = payment_obj.get('order_id')
                    
                    if customer_id:
                        user_customer_ids.add(customer_id)
                        print(f"   Customer ID: {customer_id}")
                    if order_id:
                        user_order_ids.add(order_id)
                        print(f"   Order ID: {order_id}")
                    
                    print(f"   ✅ Raw Square Payment Transaction Object:")
                    print(json.dumps(payment_data, indent=2))
                else:
                    print(f"   ❌ Square API Error: {response.text}")
                    
            except Exception as e:
                print(f"   ❌ Error fetching payment: {e}")
        
        # Now check for unregistered payments for the same user(s)
        if user_customer_ids or user_order_ids:
            print(f"\n🚨 Checking for unregistered payments for the same user(s):")
            print(f"   Customer IDs: {list(user_customer_ids)}")
            print(f"   Order IDs: {list(user_order_ids)}")
            
            headers = {
                'Authorization': f'Bearer {square_token}',
                'Square-Version': '2024-07-17',
                'Content-Type': 'application/json'
            }
            
            base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
            
            # Set default date range if not provided
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)  # Last 30 days
            if not end_date:
                end_date = datetime.now()
            
            print(f"📅 Searching payments from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
            
            # Search for payments with date filtering and pagination
            url = f"{base_url}/payments"
            params = {
                'begin_time': start_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'end_time': end_date.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'limit': 100
            }
            
            all_payments = []
            cursor = None
            
            try:
                while True:
                    if cursor:
                        params['cursor'] = cursor
                    
                    response = requests.get(url, headers=headers, params=params)
                    print(f"Square API Response Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        payments_data = response.json()
                        payments = payments_data.get('payments', [])
                        all_payments.extend(payments)
                        
                        print(f"Retrieved {len(payments)} payments (total: {len(all_payments)})")
                        
                        # Check for next page
                        cursor = payments_data.get('cursor')
                        if not cursor:
                            break
                    else:
                        print(f"❌ Square API Error: {response.text}")
                        break
                
                print(f"\n📊 Total payments found: {len(all_payments)}")
                
                # Look for completed payments that belong to the same user(s) but are not in our database
                unregistered_payments = []
                for payment in all_payments:
                    payment_id = payment.get('id')
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
                        existing = await conn.fetchrow("""
                            SELECT id FROM "EventRegistration" 
                            WHERE "paymentId" = $1
                        """, payment_id)
                        
                        if not existing:
                            unregistered_payments.append(payment)
                            print(f"\n❌ UNREGISTERED PAYMENT FOUND:")
                            print(f"   Payment ID: {payment_id}")
                            print(f"   Created: {created_at}")
                            print(f"   Amount: ${amount/100:.2f} CAD")
                            print(f"   Customer ID: {customer_id}")
                            print(f"   Order ID: {order_id}")
                            print(f"   Raw Square Payment Object:")
                            print(json.dumps(payment, indent=2))
                
                print(f"\n📊 Summary:")
                print(f"   Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
                print(f"   Total payments checked: {len(all_payments)}")
                print(f"   Unregistered payments for target user(s): {len(unregistered_payments)}")
                
                # Calculate total lost revenue
                total_lost = sum(payment.get('amount_money', {}).get('amount', 0) for payment in unregistered_payments)
                print(f"   Total lost revenue: ${total_lost/100:.2f} CAD")
                    
            except Exception as e:
                print(f"❌ Error fetching payments: {e}")
        else:
            print(f"\n⚠️ No customer IDs or order IDs found from registered payments")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def parse_date(date_str):
    """Parse date string in YYYY-MM-DD format"""
    try:
        return datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        raise argparse.ArgumentTypeError(f'Not a valid date: {date_str}')

def main():
    parser = argparse.ArgumentParser(description='Check Square Payment Transaction objects for users')
    parser.add_argument('--emails', nargs='+', help='Target email addresses to check (optional, checks all if not specified)')
    parser.add_argument('--start-date', type=parse_date, help='Start date for payment search (YYYY-MM-DD, defaults to 30 days ago)')
    parser.add_argument('--end-date', type=parse_date, help='End date for payment search (YYYY-MM-DD, defaults to today)')
    
    args = parser.parse_args()
    
    if args.emails:
        print(f"Target emails: {args.emails}")
    else:
        print("No specific emails provided, checking all registered payments")
    
    if args.start_date:
        print(f"Start date: {args.start_date.strftime('%Y-%m-%d')}")
    if args.end_date:
        print(f"End date: {args.end_date.strftime('%Y-%m-%d')}")
    
    asyncio.run(check_raw_payment_objects(args.emails, args.start_date, args.end_date))

if __name__ == "__main__":
    main()
