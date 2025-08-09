# authentication/data_access/form_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any, List

class FormRepository:
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
        print("✅ FormRepository connected to database")
        await self.ensure_tables_exist()
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.pool:
            await self.pool.close()
            print("🔌 FormRepository disconnected from database")
    
    async def ensure_tables_exist(self):
        """Ensure all form-related tables exist"""
        try:
            async with self.pool.acquire() as conn:
                # Create Form table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "Form" (
                        id SERIAL PRIMARY KEY,
                        "eventId" INTEGER NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        "isActive" BOOLEAN DEFAULT true,
                        "isRequired" BOOLEAN DEFAULT false,
                        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE("eventId")
                    )
                """)
                
                # Create FormField table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "FormField" (
                        id SERIAL PRIMARY KEY,
                        "formId" INTEGER NOT NULL REFERENCES "Form"(id) ON DELETE CASCADE,
                        type VARCHAR(50) NOT NULL,
                        question TEXT NOT NULL,
                        description TEXT,
                        "isRequired" BOOLEAN DEFAULT false,
                        options TEXT,
                        "order" INTEGER DEFAULT 0
                    )
                """)
                
                # Create FormSubmission table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "FormSubmission" (
                        id SERIAL PRIMARY KEY,
                        "formId" INTEGER NOT NULL REFERENCES "Form"(id) ON DELETE CASCADE,
                        "userId" INTEGER NOT NULL,
                        "submittedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE("formId", "userId")
                    )
                """)
                
                # Create FormResponse table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "FormResponse" (
                        id SERIAL PRIMARY KEY,
                        "submissionId" INTEGER NOT NULL REFERENCES "FormSubmission"(id) ON DELETE CASCADE,
                        "fieldId" INTEGER NOT NULL REFERENCES "FormField"(id) ON DELETE CASCADE,
                        value TEXT NOT NULL,
                        UNIQUE("submissionId", "fieldId")
                    )
                """)
                
                # Create Coupon table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "Coupon" (
                        id SERIAL PRIMARY KEY,
                        code VARCHAR(100) UNIQUE NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        "discountType" VARCHAR(20) NOT NULL,
                        "discountValue" FLOAT NOT NULL,
                        "minAmount" FLOAT,
                        "maxUses" INTEGER,
                        "currentUses" INTEGER DEFAULT 0,
                        "isActive" BOOLEAN DEFAULT true,
                        "expiresAt" TIMESTAMP,
                        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        "autoGenerated" BOOLEAN DEFAULT false,
                        "triggerEventId" INTEGER,
                        "requiredSubmissions" INTEGER
                    )
                """)
                
                # Create CouponUsage table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "CouponUsage" (
                        id SERIAL PRIMARY KEY,
                        "couponId" INTEGER NOT NULL REFERENCES "Coupon"(id) ON DELETE CASCADE,
                        "userId" INTEGER NOT NULL,
                        "eventId" INTEGER NOT NULL,
                        "discountAmount" FLOAT NOT NULL,
                        "usedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                print("✅ Form tables ensured to exist")
        except Exception as e:
            print(f"❌ Error ensuring form tables exist: {e}")
            raise e

    # Form CRUD operations
    async def create_form(self, form_data: dict) -> Dict[str, Any]:
        """Create a new form"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.transaction():
                    # Create form
                    form_query = """
                        INSERT INTO "Form" ("eventId", title, description, "isActive", "isRequired")
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id, "eventId", title, description, "isActive", "isRequired", "createdAt", "updatedAt"
                    """
                    form_row = await conn.fetchrow(
                        form_query,
                        form_data["eventId"],
                        form_data["title"],
                        form_data.get("description"),
                        form_data.get("isActive", True),
                        form_data.get("isRequired", False)
                    )
                    
                    form_id = form_row["id"]
                    
                    # Create form fields
                    fields = []
                    if "fields" in form_data:
                        for i, field_data in enumerate(form_data["fields"]):
                            field_query = """
                                INSERT INTO "FormField" ("formId", type, question, description, "isRequired", options, "order")
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                RETURNING id, "formId", type, question, description, "isRequired", options, "order"
                            """
                            field_row = await conn.fetchrow(
                                field_query,
                                form_id,
                                field_data["type"],
                                field_data["question"],
                                field_data.get("description"),
                                field_data.get("isRequired", False),
                                json.dumps(field_data.get("options")) if field_data.get("options") else None,
                                field_data.get("order", i)
                            )
                            fields.append(dict(field_row))
                    
                    return {
                        **dict(form_row),
                        "fields": fields
                    }
        except Exception as e:
            print(f"❌ Error creating form: {e}")
            raise e
    
    async def get_form_by_event_id(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Get form by event ID with fields"""
        try:
            async with self.pool.acquire() as conn:
                # Get form
                form_query = """
                    SELECT id, "eventId", title, description, "isActive", "isRequired", "createdAt", "updatedAt"
                    FROM "Form"
                    WHERE "eventId" = $1
                """
                form_row = await conn.fetchrow(form_query, event_id)
                
                if not form_row:
                    return None
                
                # Get form fields
                fields_query = """
                    SELECT id, "formId", type, question, description, "isRequired", options, "order"
                    FROM "FormField"
                    WHERE "formId" = $1
                    ORDER BY "order", id
                """
                field_rows = await conn.fetch(fields_query, form_row["id"])
                
                fields = []
                for field_row in field_rows:
                    field = dict(field_row)
                    if field["options"]:
                        field["options"] = json.loads(field["options"])
                    fields.append(field)
                
                return {
                    **dict(form_row),
                    "fields": fields
                }
        except Exception as e:
            print(f"❌ Error getting form by event ID: {e}")
            raise e
    
    async def update_form(self, form_id: int, form_data: dict) -> Dict[str, Any]:
        """Update a form and its fields"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.transaction():
                    # Update form
                    form_query = """
                        UPDATE "Form" 
                        SET title = $2, description = $3, "isActive" = $4, "isRequired" = $5, "updatedAt" = CURRENT_TIMESTAMP
                        WHERE id = $1
                        RETURNING id, "eventId", title, description, "isActive", "isRequired", "createdAt", "updatedAt"
                    """
                    form_row = await conn.fetchrow(
                        form_query,
                        form_id,
                        form_data["title"],
                        form_data.get("description"),
                        form_data.get("isActive", True),
                        form_data.get("isRequired", False)
                    )
                    
                    # Delete existing fields
                    await conn.execute('DELETE FROM "FormField" WHERE "formId" = $1', form_id)
                    
                    # Create new fields
                    fields = []
                    if "fields" in form_data:
                        for i, field_data in enumerate(form_data["fields"]):
                            field_query = """
                                INSERT INTO "FormField" ("formId", type, question, description, "isRequired", options, "order")
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                                RETURNING id, "formId", type, question, description, "isRequired", options, "order"
                            """
                            field_row = await conn.fetchrow(
                                field_query,
                                form_id,
                                field_data["type"],
                                field_data["question"],
                                field_data.get("description"),
                                field_data.get("isRequired", False),
                                json.dumps(field_data.get("options")) if field_data.get("options") else None,
                                field_data.get("order", i)
                            )
                            fields.append(dict(field_row))
                    
                    return {
                        **dict(form_row),
                        "fields": fields
                    }
        except Exception as e:
            print(f"❌ Error updating form: {e}")
            raise e
    
    async def delete_form(self, form_id: int) -> bool:
        """Delete a form"""
        try:
            async with self.pool.acquire() as conn:
                result = await conn.execute('DELETE FROM "Form" WHERE id = $1', form_id)
                return result == "DELETE 1"
        except Exception as e:
            print(f"❌ Error deleting form: {e}")
            raise e
    
    # Form submission operations
    async def submit_form(self, submission_data: dict) -> Dict[str, Any]:
        """Submit a form"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.transaction():
                    # Create submission
                    submission_query = """
                        INSERT INTO "FormSubmission" ("formId", "userId")
                        VALUES ($1, $2)
                        ON CONFLICT ("formId", "userId") 
                        DO UPDATE SET "submittedAt" = CURRENT_TIMESTAMP
                        RETURNING id, "formId", "userId", "submittedAt"
                    """
                    submission_row = await conn.fetchrow(
                        submission_query,
                        submission_data["formId"],
                        submission_data["userId"]
                    )
                    
                    submission_id = submission_row["id"]
                    
                    # Delete existing responses
                    await conn.execute('DELETE FROM "FormResponse" WHERE "submissionId" = $1', submission_id)
                    
                    # Create responses
                    responses = []
                    if "responses" in submission_data:
                        for response_data in submission_data["responses"]:
                            response_query = """
                                INSERT INTO "FormResponse" ("submissionId", "fieldId", value)
                                VALUES ($1, $2, $3)
                                RETURNING id, "submissionId", "fieldId", value
                            """
                            response_row = await conn.fetchrow(
                                response_query,
                                submission_id,
                                response_data["fieldId"],
                                json.dumps(response_data["value"]) if isinstance(response_data["value"], (list, dict)) else str(response_data["value"])
                            )
                            responses.append(dict(response_row))
                    
                    return {
                        **dict(submission_row),
                        "responses": responses
                    }
        except Exception as e:
            print(f"❌ Error submitting form: {e}")
            raise e
    
    async def get_form_submissions(self, form_id: int) -> List[Dict[str, Any]]:
        """Get all submissions for a form"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                    SELECT 
                        fs.id, fs."formId", fs."userId", fs."submittedAt",
                        u."firstName", u."lastName", u.email
                    FROM "FormSubmission" fs
                    JOIN "User" u ON fs."userId" = u.id
                    WHERE fs."formId" = $1
                    ORDER BY fs."submittedAt" DESC
                """
                submission_rows = await conn.fetch(query, form_id)
                
                submissions = []
                for submission_row in submission_rows:
                    # Get responses for this submission
                    responses_query = """
                        SELECT fr.id, fr."fieldId", fr.value, ff.question, ff.type
                        FROM "FormResponse" fr
                        JOIN "FormField" ff ON fr."fieldId" = ff.id
                        WHERE fr."submissionId" = $1
                        ORDER BY ff."order", ff.id
                    """
                    response_rows = await conn.fetch(responses_query, submission_row["id"])
                    
                    responses = []
                    for response_row in response_rows:
                        response = dict(response_row)
                        try:
                            response["value"] = json.loads(response["value"])
                        except:
                            pass  # Keep as string if not JSON
                        responses.append(response)
                    
                    submissions.append({
                        **dict(submission_row),
                        "responses": responses
                    })
                
                return submissions
        except Exception as e:
            print(f"❌ Error getting form submissions: {e}")
            raise e
    
    # Coupon operations
    async def create_coupon(self, coupon_data: dict) -> Dict[str, Any]:
        """Create a new coupon"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                    INSERT INTO "Coupon" (
                        code, name, description, "discountType", "discountValue", 
                        "minAmount", "maxUses", "isActive", "expiresAt",
                        "autoGenerated", "triggerEventId", "requiredSubmissions"
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING *
                """
                row = await conn.fetchrow(
                    query,
                    coupon_data["code"],
                    coupon_data["name"],
                    coupon_data.get("description"),
                    coupon_data["discountType"],
                    coupon_data["discountValue"],
                    coupon_data.get("minAmount"),
                    coupon_data.get("maxUses"),
                    coupon_data.get("isActive", True),
                    coupon_data.get("expiresAt"),
                    coupon_data.get("autoGenerated", False),
                    coupon_data.get("triggerEventId"),
                    coupon_data.get("requiredSubmissions")
                )
                return dict(row)
        except Exception as e:
            print(f"❌ Error creating coupon: {e}")
            raise e
    
    async def get_all_coupons(self) -> List[Dict[str, Any]]:
        """Get all coupons"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                    SELECT c.*, e.name as "triggerEventName"
                    FROM "Coupon" c
                    LEFT JOIN "Event" e ON c."triggerEventId" = e.id
                    ORDER BY c."createdAt" DESC
                """
                rows = await conn.fetch(query)
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"❌ Error getting coupons: {e}")
            raise e
    
    async def get_coupon_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Get coupon by code"""
        try:
            async with self.pool.acquire() as conn:
                query = 'SELECT * FROM "Coupon" WHERE code = $1 AND "isActive" = true'
                row = await conn.fetchrow(query, code)
                return dict(row) if row else None
        except Exception as e:
            print(f"❌ Error getting coupon by code: {e}")
            raise e
    
    async def use_coupon(self, usage_data: dict) -> Dict[str, Any]:
        """Record coupon usage"""
        try:
            async with self.pool.acquire() as conn:
                async with conn.transaction():
                    # Record usage
                    usage_query = """
                        INSERT INTO "CouponUsage" ("couponId", "userId", "eventId", "discountAmount")
                        VALUES ($1, $2, $3, $4)
                        RETURNING *
                    """
                    usage_row = await conn.fetchrow(
                        usage_query,
                        usage_data["couponId"],
                        usage_data["userId"],
                        usage_data["eventId"],
                        usage_data["discountAmount"]
                    )
                    
                    # Increment usage count
                    await conn.execute(
                        'UPDATE "Coupon" SET "currentUses" = "currentUses" + 1 WHERE id = $1',
                        usage_data["couponId"]
                    )
                    
                    return dict(usage_row)
        except Exception as e:
            print(f"❌ Error using coupon: {e}")
            raise e
    
    async def check_and_generate_auto_coupons(self, event_id: int) -> List[Dict[str, Any]]:
        """Check if auto-coupons should be generated based on form submissions"""
        try:
            async with self.pool.acquire() as conn:
                # Get events that trigger coupons based on this event's submissions
                query = """
                    SELECT c.*, COUNT(fs.id) as submission_count
                    FROM "Coupon" c
                    LEFT JOIN "Form" f ON c."triggerEventId" = f."eventId"
                    LEFT JOIN "FormSubmission" fs ON f.id = fs."formId"
                    WHERE c."autoGenerated" = true 
                    AND c."triggerEventId" = $1
                    AND c."isActive" = true
                    GROUP BY c.id
                """
                coupon_rows = await conn.fetch(query, event_id)
                
                generated_coupons = []
                for coupon_row in coupon_rows:
                    coupon = dict(coupon_row)
                    required_submissions = coupon.get("requiredSubmissions", 1)
                    current_submissions = coupon["submission_count"]
                    
                    if current_submissions >= required_submissions:
                        # Generate individual coupons for users who submitted forms
                        users_query = """
                            SELECT DISTINCT fs."userId", u.email, u."firstName", u."lastName"
                            FROM "FormSubmission" fs
                            JOIN "Form" f ON fs."formId" = f.id
                            JOIN "User" u ON fs."userId" = u.id
                            WHERE f."eventId" = $1
                        """
                        user_rows = await conn.fetch(users_query, event_id)
                        
                        for user_row in user_rows:
                            user_coupon_code = f"{coupon['code']}-{user_row['userId']}"
                            
                            # Check if user already has this coupon
                            existing_check = await conn.fetchrow(
                                'SELECT id FROM "Coupon" WHERE code = $1',
                                user_coupon_code
                            )
                            
                            if not existing_check:
                                user_coupon_query = """
                                    INSERT INTO "Coupon" (
                                        code, name, description, "discountType", "discountValue",
                                        "minAmount", "maxUses", "isActive", "expiresAt", "autoGenerated"
                                    )
                                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                    RETURNING *
                                """
                                user_coupon = await conn.fetchrow(
                                    user_coupon_query,
                                    user_coupon_code,
                                    f"{coupon['name']} - {user_row['firstName']}",
                                    f"Auto-generated for {user_row['firstName']} {user_row['lastName']}",
                                    coupon["discountType"],
                                    coupon["discountValue"],
                                    coupon["minAmount"],
                                    1,  # maxUses = 1 for individual coupons
                                    True,
                                    coupon["expiresAt"],
                                    True
                                )
                                generated_coupons.append({
                                    **dict(user_coupon),
                                    "userId": user_row["userId"],
                                    "userEmail": user_row["email"]
                                })
                
                return generated_coupons
        except Exception as e:
            print(f"❌ Error checking auto-coupons: {e}")
            raise e 