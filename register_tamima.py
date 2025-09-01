#!/usr/bin/env python3
"""
Script to manually register Tamima for the 運動会　2次会 event
"""

import asyncio
import asyncpg
import os
from datetime import datetime

async def register_tamima():
    # Get database connection
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return
    
    try:
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
        # User and event details
        user_id = 85  # Tamima Wadageri
        event_id = 30  # 運動会　2次会
        payment_id = "fNBVyOUOaxkXj6LtALISDpLLRJNZY"  # First successful payment
        payment_email = "tamima.wadageri@mail.utoronto.ca"
        final_price = 5.00  # $5 CAD
        
        print(f"🔍 Registering user {user_id} for event {event_id}")
        print(f"💰 Using payment ID: {payment_id}")
        
        # Check if registration already exists
        existing_reg = await conn.fetchrow("""
            SELECT id FROM "EventRegistration" 
            WHERE "userId" = $1 AND "eventId" = $2
        """, user_id, event_id)
        
        if existing_reg:
            print(f"⚠️ Registration already exists for user {user_id} and event {event_id}")
            print(f"   Registration ID: {existing_reg['id']}")
            return
        
        # Create the registration
        registration = await conn.fetchrow("""
            INSERT INTO "EventRegistration" (
                "userId", 
                "eventId", 
                "registeredAt", 
                "paymentStatus", 
                "paymentId", 
                "finalPrice",
                "paymentEmail"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """, user_id, event_id, datetime.now(), 'completed', payment_id, final_price, payment_email)
        
        print(f"✅ Successfully registered Tamima for 運動会　2次会!")
        print(f"   Registration ID: {registration['id']}")
        print(f"   Payment ID: {registration['paymentId']}")
        print(f"   Amount: ${registration['finalPrice']}")
        print(f"   Status: {registration['paymentStatus']}")
        
        # Verify the registration
        verification = await conn.fetchrow("""
            SELECT 
                er.id,
                er."registeredAt",
                er."paymentStatus",
                er."paymentId",
                er."finalPrice",
                u."firstName",
                u."lastName",
                u.email,
                e.name as "eventName"
            FROM "EventRegistration" er
            JOIN "User" u ON er."userId" = u.id
            JOIN "Event" e ON er."eventId" = e.id
            WHERE er.id = $1
        """, registration['id'])
        
        if verification:
            print(f"\n📋 Registration Verification:")
            print(f"   User: {verification['firstName']} {verification['lastName']} ({verification['email']})")
            print(f"   Event: {verification['eventName']}")
            print(f"   Registered: {verification['registeredAt']}")
            print(f"   Payment Status: {verification['paymentStatus']}")
        
        await conn.close()
        print("✅ Database connection closed")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(register_tamima()) 