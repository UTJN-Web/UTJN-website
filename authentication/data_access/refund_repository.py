# authentication/data_access/refund_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class RefundStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class RefundRepository:
    def __init__(self):
        self.pool = None
    
    def list_available_secrets(self):
        """List all available secrets in AWS Secrets Manager"""
        region_name = "us-east-2"
        
        # Create a Secrets Manager client
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name=region_name
        )
        
        try:
            response = client.list_secrets()
            secret_names = [secret['Name'] for secret in response['SecretList']]
            print(f"🔍 Available secrets in AWS Secrets Manager: {secret_names}")
            return secret_names
        except Exception as e:
            print(f"❌ Error listing secrets: {e}")
            return []
    
    def get_database_url_from_secrets(self):
        """Get database URL from AWS Secrets Manager"""
        # First, list available secrets
        available_secrets = self.list_available_secrets()
        
        # Try different possible secret names
        possible_secret_names = [
            "rdsdb-2454f7d1-b6f2-4366-95f6-1ccf8b4be221",  # Original
            "rdsdb",  # Simplified
            "database-credentials",  # Alternative
            "utjn-database",  # Another alternative
            "utjn-rds",  # Simple name
            "postgres-credentials"  # Very simple name
        ]
        
        # Add any available secrets to the list
        for secret_name in available_secrets:
            if secret_name not in possible_secret_names:
                possible_secret_names.append(secret_name)
        
        region_name = "us-east-2"
        
        # Create a Secrets Manager client
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name=region_name
        )
        
        for secret_name in possible_secret_names:
            try:
                get_secret_value_response = client.get_secret_value(
                    SecretId=secret_name
                )
                
                secret = get_secret_value_response['SecretString']
                secret_dict = json.loads(secret)
                
                # Check if this is a database secret
                required_fields = ['username', 'password', 'host', 'port', 'dbname']
                if not all(field in secret_dict for field in required_fields):
                    print(f"⚠️ Secret '{secret_name}' exists but is not a database secret (missing required fields)")
                    continue
                
                # URLエンコードで安全な形式に
                import urllib.parse
                encoded_password = urllib.parse.quote_plus(secret_dict['password'])
                
                # DATABASE_URL を構築
                database_url = f"postgresql://{secret_dict['username']}:{encoded_password}@{secret_dict['host']}:{secret_dict['port']}/{secret_dict['dbname']}"
                
                print(f"✅ Successfully retrieved database secret: {secret_name}")
                return database_url
            except Exception as e:
                continue
        
        # If all secrets fail, return None to fallback to environment variable
        print("⚠️ No valid database secret found in AWS Secrets Manager")
        return None
    
    async def connect(self):
        """Connect to the database"""
        if self.pool:
            return  # Already connected
        
        try:
            # Get database URL from AWS Secrets Manager
            database_url = self.get_database_url_from_secrets()
            if not database_url:
                # Fallback to environment variable if AWS fails
                database_url = os.getenv("DATABASE_URL")
                if not database_url:
                    raise Exception("DATABASE_URL environment variable not set and AWS Secrets Manager failed")
                print("⚠️ Using DATABASE_URL from environment variable")
        except Exception as e:
            # Fallback to environment variable if AWS fails
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise Exception("DATABASE_URL environment variable not set and AWS Secrets Manager failed")
            print("⚠️ Using DATABASE_URL from environment variable")
        
        try:
            self.pool = await asyncpg.create_pool(database_url)
            print("✅ RefundRepository connected to database")
        except Exception as e:
            print(f"❌ RefundRepository connection failed: {e}")
            raise e
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.pool:
            await self.pool.close()
            self.pool = None
            print("🔌 RefundRepository disconnected from database")
    
    async def ensure_tables_exist(self):
        """Ensure RefundRequest table exists"""
        if not self.pool:
            raise Exception("Database not connected")
        
        async with self.pool.acquire() as conn:
            try:
                # Check if RefundRequest table exists
                refund_table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'RefundRequest'
                    );
                """)
                
                if not refund_table_exists:
                    print("🆕 Creating RefundRequest table...")
                    await conn.execute("""
                        CREATE TABLE "RefundRequest" (
                            id SERIAL PRIMARY KEY,
                            "eventId" INTEGER NOT NULL,
                            "userId" INTEGER NOT NULL,
                            email VARCHAR(255) NOT NULL,
                            amount DECIMAL(10,2) NOT NULL,
                            currency VARCHAR(3) DEFAULT 'CAD',
                            reason TEXT,
                            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                            "requestDate" TIMESTAMP DEFAULT NOW(),
                            "processedDate" TIMESTAMP,
                            "adminNotes" TEXT,
                            "processedBy" VARCHAR(255),
                            "paymentId" VARCHAR(255),
                            FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
                            FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE
                        );
                    """)
                    
                    # Create indexes for better performance
                    await conn.execute('CREATE INDEX idx_refund_status ON "RefundRequest"(status);')
                    await conn.execute('CREATE INDEX idx_refund_user ON "RefundRequest"("userId");')
                    await conn.execute('CREATE INDEX idx_refund_event ON "RefundRequest"("eventId");')
                    await conn.execute('CREATE INDEX idx_refund_request_date ON "RefundRequest"("requestDate");')
                    
                    print("✅ RefundRequest table created")
                else:
                    print("✅ RefundRequest table already exists")
                    # Check if paymentId column exists and add it if not
                    payment_id_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'RefundRequest'
                            AND column_name = 'paymentId'
                        );
                    """)
                    
                    if not payment_id_exists:
                        print("🆕 Adding paymentId column to RefundRequest table...")
                        await conn.execute("""
                            ALTER TABLE "RefundRequest" 
                            ADD COLUMN "paymentId" VARCHAR(255);
                        """)
                        print("✅ paymentId column added to RefundRequest table")
                    else:
                        print("✅ paymentId column already exists in RefundRequest table")
                    
            except Exception as e:
                print(f"❌ Error ensuring refund tables exist: {e}")
                raise e
    
    async def create_refund_request(self, event_id: int, user_id: int, email: str, 
                                  amount: float, reason: str = None, currency: str = "CAD", payment_id: str = None) -> Dict[str, Any]:
        """Create a new refund request"""
        if not self.pool:
            raise Exception("Database not connected")
        
        async with self.pool.acquire() as conn:
            try:
                # Insert the refund request
                result = await conn.fetchrow("""
                    INSERT INTO "RefundRequest" ("eventId", "userId", email, amount, currency, reason, "paymentId")
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, "requestDate"
                """, event_id, user_id, email, amount, currency, reason, payment_id)
                
                refund_id = result['id']
                request_date = result['requestDate']
                
                print(f"✅ Refund request created: ID {refund_id} for user {user_id}, event {event_id}, amount {currency} ${amount}")
                
                return {
                    'id': refund_id,
                    'eventId': event_id,
                    'userId': user_id,
                    'email': email,
                    'amount': amount,
                    'currency': currency,
                    'reason': reason,
                    'status': 'pending',
                    'requestDate': request_date,
                    'processedDate': None,
                    'adminNotes': None,
                    'processedBy': None
                }
                
            except Exception as e:
                print(f"❌ Error creating refund request: {e}")
                raise e
    
    async def get_all_refund_requests(self) -> List[Dict[str, Any]]:
        """Get all refund requests with event and user information"""
        if not self.pool:
            raise Exception("Database not connected")
        
        async with self.pool.acquire() as conn:
            try:
                rows = await conn.fetch("""
                    SELECT 
                        r.id,
                        r."eventId",
                        r."userId",
                        r.email,
                        r.amount,
                        r.currency,
                        r.reason,
                        r.status,
                        r."requestDate",
                        r."processedDate",
                        r."adminNotes",
                        r."processedBy",
                        r."paymentId",
                        e.name as "eventName",
                        u."firstName",
                        u."lastName"
                    FROM "RefundRequest" r
                    LEFT JOIN "Event" e ON r."eventId" = e.id
                    LEFT JOIN "User" u ON r."userId" = u.id
                    ORDER BY r."requestDate" DESC
                """)
                
                refunds = []
                for row in rows:
                    refund = dict(row)
                    # Convert Decimal to float for JSON serialization
                    if refund['amount']:
                        refund['amount'] = float(refund['amount'])
                    refunds.append(refund)
                
                print(f"✅ Retrieved {len(refunds)} refund requests")
                return refunds
                
            except Exception as e:
                print(f"❌ Error getting refund requests: {e}")
                raise e
    
    async def update_refund_status(self, refund_id: int, status: str, admin_notes: str = None, 
                                 processed_by: str = None) -> bool:
        """Update the status of a refund request"""
        if not self.pool:
            raise Exception("Database not connected")
        
        if status not in ['pending', 'approved', 'rejected']:
            raise ValueError(f"Invalid status: {status}")
        
        async with self.pool.acquire() as conn:
            try:
                # Update the refund request status
                result = await conn.execute("""
                    UPDATE "RefundRequest" 
                    SET status = $1, "processedDate" = NOW(), "adminNotes" = $2, "processedBy" = $3
                    WHERE id = $4
                """, status, admin_notes, processed_by, refund_id)
                
                if result == "UPDATE 1":
                    print(f"✅ Refund request {refund_id} status updated to {status}")
                    return True
                else:
                    print(f"⚠️ No refund request found with ID {refund_id}")
                    return False
                
            except Exception as e:
                print(f"❌ Error updating refund status: {e}")
                raise e
    
    async def get_refund_request_by_id(self, refund_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific refund request by ID"""
        if not self.pool:
            raise Exception("Database not connected")
        
        async with self.pool.acquire() as conn:
            try:
                row = await conn.fetchrow("""
                    SELECT 
                        r.id,
                        r."eventId",
                        r."userId",
                        r.email,
                        r.amount,
                        r.currency,
                        r.reason,
                        r.status,
                        r."requestDate",
                        r."processedDate",
                        r."adminNotes",
                        r."processedBy",
                        r."paymentId",
                        e.name as "eventName",
                        u."firstName",
                        u."lastName"
                    FROM "RefundRequest" r
                    LEFT JOIN "Event" e ON r."eventId" = e.id
                    LEFT JOIN "User" u ON r."userId" = u.id
                    WHERE r.id = $1
                """, refund_id)
                
                if row:
                    refund = dict(row)
                    # Convert Decimal to float for JSON serialization
                    if refund['amount']:
                        refund['amount'] = float(refund['amount'])
                    print(f"✅ Retrieved refund request {refund_id}")
                    return refund
                else:
                    print(f"⚠️ No refund request found with ID {refund_id}")
                    return None
                
            except Exception as e:
                print(f"❌ Error getting refund request: {e}")
                raise e 