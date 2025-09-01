# authentication/data_access/database_init.py
import os
import asyncpg
import boto3
import json
from typing import Optional

def list_available_secrets():
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

def get_database_url_from_secrets():
    """Get database URL from AWS Secrets Manager"""
    # First, list available secrets
    available_secrets = list_available_secrets()
    
    # Try different possible secret names
    possible_secret_names = [
        "rdsdb-2454f7d1-b6f2-4366-95f6-1ccf8b4be221",  # Original
        "up_id"  # Existing secret
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
            
            # Check if this is a database secret (has required fields)
            required_fields = ['username', 'password', 'host', 'port', 'dbname']
            if all(field in secret_dict for field in required_fields):
                # URLエンコードで安全な形式に (same as frontend)
                import urllib.parse
                encoded_password = urllib.parse.quote_plus(secret_dict['password'])
                
                # DATABASE_URL を構築
                database_url = f"postgresql://{secret_dict['username']}:{encoded_password}@{secret_dict['host']}:{secret_dict['port']}/{secret_dict['dbname']}"
                
                print(f"✅ Successfully retrieved database secret: {secret_name}")
                return database_url
            else:
                print(f"⚠️ Secret '{secret_name}' exists but is not a database secret (missing required fields)")
                continue
            
        except Exception as e:
            # Suppress error logs since fallback works
            continue
    
    # If all secrets fail, raise an exception
    print("⚠️ Using DATABASE_URL from environment variable (AWS Secrets Manager not configured)")
    return None

async def init_database():
    """Initialize the database with required tables if they don't exist"""
    try:
        # Use global connection pool instead of creating new connection
        from .database_pool import get_global_connection
        
        print("🔌 Using global connection pool for database initialization...")
        
        async with get_global_connection() as conn:
            # Check if User table already exists
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'User'
                );
            """)
            
            if table_exists:
                print("✅ User table already exists, skipping initialization")
                return
            
            # Create the User table with explicit column names
            print("📋 Creating User table with correct structure...")
            await conn.execute("""
                CREATE TABLE "User" (
                    id SERIAL PRIMARY KEY,
                    "firstName" VARCHAR(255) NOT NULL,
                    "lastName" VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    major VARCHAR(255) NOT NULL,
                    "graduationYear" INTEGER NOT NULL,
                    "cognitoSub" VARCHAR(255) UNIQUE NOT NULL,
                    "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Create indexes for better performance
            await conn.execute('CREATE INDEX idx_user_email ON "User"(email);')
            await conn.execute('CREATE INDEX idx_user_cognito_sub ON "User"("cognitoSub");')
            
            print("✅ Database initialized successfully!")
            print("✅ User table created with correct column names")
        
        # Ensure UnregisteredPaymentRefunds table exists
        print("🔍 Ensuring UnregisteredPaymentRefunds table exists...")
        async with get_global_connection() as conn:
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
            
            # Create indexes for better performance
            await conn.execute('CREATE INDEX idx_unregistered_payment_id ON "UnregisteredPaymentRefunds"("paymentId");')
            await conn.execute('CREATE INDEX idx_unregistered_email ON "UnregisteredPaymentRefunds"(email);')
            await conn.execute('CREATE INDEX idx_unregistered_refund_date ON "UnregisteredPaymentRefunds"("refundDate");')
            
            print("✅ UnregisteredPaymentRefunds table ensured")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        raise e

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_database()) 