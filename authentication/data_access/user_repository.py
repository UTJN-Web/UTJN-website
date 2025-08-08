# authentication/data_access/user_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any

# Major options for user selection
MAJOR_OPTIONS = [
    "Computer Science",
    "Computer Engineering", 
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
    "Industrial Engineering",
    "Materials Science & Engineering",
    "Mineral Engineering",
    "Engineering Science",
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Psychology",
    "Economics",
    "Business Administration",
    "Commerce",
    "Arts & Science",
    "Architecture",
    "Urban Planning",
    "Forestry",
    "Kinesiology",
    "Nursing",
    "Pharmacy",
    "Medicine",
    "Law",
    "Education",
    "Social Work",
    "Other"
]

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
    
    async def ensure_tables_exist(self):
        """Ensure User table exists with proper major constraints"""
        if not self.pool:
            raise Exception("Database not connected")
        
        async with self.pool.acquire() as conn:
            try:
                # Check if User table exists
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'User'
                    );
                """)
                
                if not table_exists:
                    print("🆕 Creating User table...")
                    await conn.execute("""
                        CREATE TABLE "User" (
                            id SERIAL PRIMARY KEY,
                            "firstName" VARCHAR(255) NOT NULL,
                            "lastName" VARCHAR(255) NOT NULL,
                            email VARCHAR(255) UNIQUE NOT NULL,
                            major VARCHAR(255) NOT NULL CHECK (major IN (
                                'Computer Science', 'Computer Engineering', 'Electrical Engineering',
                                'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
                                'Industrial Engineering', 'Materials Science & Engineering', 'Mineral Engineering',
                                'Engineering Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
                                'Psychology', 'Economics', 'Business Administration', 'Commerce',
                                'Arts & Science', 'Architecture', 'Urban Planning', 'Forestry',
                                'Kinesiology', 'Nursing', 'Pharmacy', 'Medicine', 'Law', 'Education',
                                'Social Work', 'Other'
                            )),
                            "graduationYear" INTEGER NOT NULL,
                            university VARCHAR(255) NOT NULL DEFAULT 'University of Toronto',
                            "cognitoSub" VARCHAR(255) UNIQUE NOT NULL,
                            "joinedAt" TIMESTAMP DEFAULT NOW()
                        );
                    """)
                    
                    # Create indexes for better performance
                    await conn.execute('CREATE INDEX idx_user_email ON "User"(email);')
                    await conn.execute('CREATE INDEX idx_user_cognito_sub ON "User"("cognitoSub");')
                    
                    print("✅ User table created with major constraints")
                else:
                    print("✅ User table already exists")
                    # Check if major constraint exists
                    constraint_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.check_constraints 
                            WHERE constraint_name LIKE '%major%'
                        );
                    """)
                    
                    if not constraint_exists:
                        print("🆕 Adding major constraint to existing User table...")
                        
                        # First, check for any existing data that would violate the constraint
                        invalid_majors = await conn.fetch("""
                            SELECT id, email, major FROM "User" 
                            WHERE major NOT IN (
                                'Computer Science', 'Computer Engineering', 'Electrical Engineering',
                                'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
                                'Industrial Engineering', 'Materials Science & Engineering', 'Mineral Engineering',
                                'Engineering Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
                                'Psychology', 'Economics', 'Business Administration', 'Commerce',
                                'Arts & Science', 'Architecture', 'Urban Planning', 'Forestry',
                                'Kinesiology', 'Nursing', 'Pharmacy', 'Medicine', 'Law', 'Education',
                                'Social Work', 'Other'
                            )
                        """)
                        
                        if invalid_majors:
                            print(f"🔍 Found {len(invalid_majors)} user(s) with invalid majors:")
                            for user in invalid_majors:
                                print(f"  - ID: {user['id']}, Email: {user['email']}, Major: {user['major']}")
                            
                            # Fix common abbreviations
                            await conn.execute("""
                                UPDATE "User" SET major = 'Computer Science' WHERE major = 'CS'
                            """)
                            await conn.execute("""
                                UPDATE "User" SET major = 'Computer Engineering' WHERE major = 'CE'
                            """)
                            await conn.execute("""
                                UPDATE "User" SET major = 'Electrical Engineering' WHERE major = 'EE'
                            """)
                            await conn.execute("""
                                UPDATE "User" SET major = 'Mechanical Engineering' WHERE major = 'ME'
                            """)
                            await conn.execute("""
                                UPDATE "User" SET major = 'Civil Engineering' WHERE major = 'CivE'
                            """)
                            
                            print("✅ Fixed common major abbreviations")
                        
                        # Now add the constraint
                        await conn.execute("""
                            ALTER TABLE "User" 
                            ADD CONSTRAINT check_major 
                            CHECK (major IN (
                                'Computer Science', 'Computer Engineering', 'Electrical Engineering',
                                'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
                                'Industrial Engineering', 'Materials Science & Engineering', 'Mineral Engineering',
                                'Engineering Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
                                'Psychology', 'Economics', 'Business Administration', 'Commerce',
                                'Arts & Science', 'Architecture', 'Urban Planning', 'Forestry',
                                'Kinesiology', 'Nursing', 'Pharmacy', 'Medicine', 'Law', 'Education',
                                'Social Work', 'Other'
                            ));
                        """)
                        print("✅ Major constraint added to User table")
                    else:
                        print("✅ Major constraint already exists")
                    
                    # Check if university column exists and add it if not
                    university_column_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'User'
                            AND column_name = 'university'
                        );
                    """)
                    
                    if not university_column_exists:
                        print("🆕 Adding university column to User table...")
                        await conn.execute("""
                            ALTER TABLE "User" 
                            ADD COLUMN university VARCHAR(255) NOT NULL DEFAULT 'University of Toronto';
                        """)
                        print("✅ university column added to User table")
                    else:
                        print("✅ university column already exists in User table")
                        
            except Exception as e:
                print(f"❌ Error ensuring tables exist: {e}")
                raise e
    
    async def create_user(self, user_data: dict) -> Dict[str, Any]:
        """Create a new user in the database"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                INSERT INTO "User" ("firstName", "lastName", email, major, "graduationYear", university, "cognitoSub", "joinedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                RETURNING id, "firstName", "lastName", email, major, "graduationYear", university, "cognitoSub", "joinedAt"
                """
                
                row = await conn.fetchrow(
                    query,
                    user_data["firstName"],
                    user_data["lastName"],
                    user_data["email"],
                    user_data["major"],
                    user_data["graduationYear"],
                    user_data.get("university", "University of Toronto"),
                    user_data["cognitoSub"]
                )
                
                return {
                    "id": row["id"],
                    "firstName": row["firstName"],
                    "lastName": row["lastName"],
                    "email": row["email"],
                    "major": row["major"],
                    "graduationYear": row["graduationYear"],
                    "university": row["university"],
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
                SELECT id, "firstName", "lastName", email, major, "graduationYear", university, "cognitoSub", "joinedAt"
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
                        "university": row["university"],
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
                SELECT id, "firstName", "lastName", email, major, "graduationYear", university, "cognitoSub", "joinedAt"
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
                        "university": row["university"],
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
                SET "firstName" = $1, "lastName" = $2, major = $3, "graduationYear" = $4, university = $5, "cognitoSub" = $6
                WHERE email = $7
                RETURNING id, "firstName", "lastName", email, major, "graduationYear", university, "cognitoSub", "joinedAt"
                """
                
                row = await conn.fetchrow(
                    query,
                    user_data["firstName"],
                    user_data["lastName"],
                    user_data["major"],
                    user_data["graduationYear"],
                    user_data.get("university", "University of Toronto"),
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
                    "university": row["university"],
                    "cognitoSub": row["cognitoSub"],
                    "joinedAt": row["joinedAt"]
                }
        except Exception as e:
            print(f"Error updating user: {e}")
            raise e 