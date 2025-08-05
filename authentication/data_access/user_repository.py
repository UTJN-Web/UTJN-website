# authentication/data_access/user_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any

class UserRepository:
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
                
                # URLエンコードで安全な形式に (same as frontend)
                import urllib.parse
                encoded_password = urllib.parse.quote_plus(secret_dict['password'])
                
                # DATABASE_URL を構築
                database_url = f"postgresql://{secret_dict['username']}:{encoded_password}@{secret_dict['host']}:{secret_dict['port']}/{secret_dict['dbname']}"
                
                print(f"✅ Successfully retrieved secret: {secret_name}")
                return database_url
                
            except Exception as e:
                # Suppress error logs since fallback works
                continue
        
        # If all secrets fail, raise an exception
        print("⚠️ Using DATABASE_URL from environment variable (AWS Secrets Manager not configured)")
        return None
    
    async def connect(self):
        """Connect to the database using AWS Secrets Manager or environment variables"""
        try:
            # Try to get database URL from AWS Secrets Manager
            database_url = self.get_database_url_from_secrets()
            if database_url:
                print("✅ Retrieved database credentials from AWS Secrets Manager")
            else:
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
        
        self.pool = await asyncpg.create_pool(database_url)
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.pool:
            await self.pool.close()
    
    async def create_user(self, user_data: dict) -> Dict[str, Any]:
        """Create a new user in the database"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                INSERT INTO "User" ("firstName", "lastName", email, major, "graduationYear", "cognitoSub", "joinedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id, "firstName", "lastName", email, major, "graduationYear", "cognitoSub", "joinedAt"
                """
                
                row = await conn.fetchrow(
                    query,
                    user_data["firstName"],
                    user_data["lastName"],
                    user_data["email"],
                    user_data["major"],
                    user_data["graduationYear"],
                    user_data["cognitoSub"]
                )
                
                return {
                    "id": row["id"],
                    "firstName": row["firstName"],
                    "lastName": row["lastName"],
                    "email": row["email"],
                    "major": row["major"],
                    "graduationYear": row["graduationYear"],
                    "cognitoSub": row["cognitoSub"],
                    "joinedAt": row["joinedAt"]
                }
        except Exception as e:
            print(f"Error creating user: {e}")
            raise e
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                SELECT id, "firstName", "lastName", email, major, "graduationYear", "cognitoSub", "joinedAt"
                FROM "User"
                WHERE email = $1
                """
                
                row = await conn.fetchrow(query, email)
                
                if row:
                    return {
                        "id": row["id"],
                        "firstName": row["firstName"],
                        "lastName": row["lastName"],
                        "email": row["email"],
                        "major": row["major"],
                        "graduationYear": row["graduationYear"],
                        "cognitoSub": row["cognitoSub"],
                        "joinedAt": row["joinedAt"]
                    }
                return None
        except Exception as e:
            print(f"❌ Error getting user by email: {e}")
            print(f"🔍 Error type: {type(e).__name__}")
            raise e
    
    async def get_user_by_cognito_sub(self, cognito_sub: str) -> Optional[Dict[str, Any]]:
        """Get user by Cognito sub"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                SELECT id, "firstName", "lastName", email, major, "graduationYear", "cognitoSub", "joinedAt"
                FROM "User"
                WHERE "cognitoSub" = $1
                """
                
                row = await conn.fetchrow(query, cognito_sub)
                
                if row:
                    return {
                        "id": row["id"],
                        "firstName": row["firstName"],
                        "lastName": row["lastName"],
                        "email": row["email"],
                        "major": row["major"],
                        "graduationYear": row["graduationYear"],
                        "cognitoSub": row["cognitoSub"],
                        "joinedAt": row["joinedAt"]
                    }
                return None
        except Exception as e:
            print(f"Error getting user by cognito sub: {e}")
            raise e 

    async def update_user(self, user_data: dict) -> Dict[str, Any]:
        """Update an existing user in the database"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                UPDATE "User" 
                SET "firstName" = $1, "lastName" = $2, major = $3, "graduationYear" = $4, "cognitoSub" = $5
                WHERE email = $6
                RETURNING id, "firstName", "lastName", email, major, "graduationYear", "cognitoSub", "joinedAt"
                """
                
                row = await conn.fetchrow(
                    query,
                    user_data["firstName"],
                    user_data["lastName"],
                    user_data["major"],
                    user_data["graduationYear"],
                    user_data["cognitoSub"],
                    user_data["email"]
                )
                
                if not row:
                    raise Exception("User not found for update")
                
                return {
                    "id": row["id"],
                    "firstName": row["firstName"],
                    "lastName": row["lastName"],
                    "email": row["email"],
                    "major": row["major"],
                    "graduationYear": row["graduationYear"],
                    "cognitoSub": row["cognitoSub"],
                    "joinedAt": row["joinedAt"]
                }
        except Exception as e:
            print(f"Error updating user: {e}")
            raise e 