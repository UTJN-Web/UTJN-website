# authentication/data_access/form_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any, List
from .base_repository import BaseRepository

class FormRepository(BaseRepository):
    def __init__(self):
        super().__init__()
    
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
    
    # connect() and disconnect() methods are now handled by BaseRepository
    
    async def ensure_tables_exist(self):
        """Ensure all form-related tables exist"""
        try:
            async with self.get_connection() as conn:
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
                
                # Create CreditAward table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "CreditAward" (
                        id SERIAL PRIMARY KEY,
                        "formId" INTEGER UNIQUE NOT NULL REFERENCES "Form"(id) ON DELETE CASCADE,
                        "creditsAwarded" DECIMAL(10,2) DEFAULT 1.0,
                        "isActive" BOOLEAN DEFAULT true,
                        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Create CreditTransaction table
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS "CreditTransaction" (
                        id SERIAL PRIMARY KEY,
                        "userId" INTEGER NOT NULL,
                        type VARCHAR(20) NOT NULL,
                        amount DECIMAL(10,2) NOT NULL,
                        description TEXT NOT NULL,
                        "relatedFormId" INTEGER,
                        "relatedEventId" INTEGER,
                        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Add credit fields to User table if they don't exist, or migrate to DECIMAL type
                try:
                    # Check if credits column exists and its type
                    credits_exists = await conn.fetchval("""
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'User' AND column_name = 'credits'
                    """)
                    
                    if credits_exists is None:
                        # Column doesn't exist, create as DECIMAL
                        await conn.execute('ALTER TABLE "User" ADD COLUMN credits DECIMAL(10,2) DEFAULT 0.0')
                        print("✅ credits column added as DECIMAL(10,2)")
                    elif credits_exists == 'integer':
                        # Column exists as INTEGER, migrate to DECIMAL
                        print("🔄 Migrating credits column from INTEGER to DECIMAL...")
                        await conn.execute('ALTER TABLE "User" ALTER COLUMN credits TYPE DECIMAL(10,2)')
                        print("✅ credits column migrated to DECIMAL(10,2)")
                    else:
                        print(f"✅ credits column already exists as {credits_exists}")
                except Exception as e:
                    print(f"❌ Error handling credits column: {e}")
                
                try:
                    # Check if totalCreditsEarned column exists and its type
                    total_credits_exists = await conn.fetchval("""
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'User' AND column_name = 'totalCreditsEarned'
                    """)
                    
                    if total_credits_exists is None:
                        # Column doesn't exist, create as DECIMAL
                        await conn.execute('ALTER TABLE "User" ADD COLUMN "totalCreditsEarned" DECIMAL(10,2) DEFAULT 0.0')
                        print("✅ totalCreditsEarned column added as DECIMAL(10,2)")
                    elif total_credits_exists == 'integer':
                        # Column exists as INTEGER, migrate to DECIMAL
                        print("🔄 Migrating totalCreditsEarned column from INTEGER to DECIMAL...")
                        await conn.execute('ALTER TABLE "User" ALTER COLUMN "totalCreditsEarned" TYPE DECIMAL(10,2)')
                        print("✅ totalCreditsEarned column migrated to DECIMAL(10,2)")
                    else:
                        print(f"✅ totalCreditsEarned column already exists as {total_credits_exists}")
                except Exception as e:
                    print(f"❌ Error handling totalCreditsEarned column: {e}")
                
                # Migrate existing CreditTransaction table to DECIMAL if needed
                try:
                    ct_amount_type = await conn.fetchval("""
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'CreditTransaction' AND column_name = 'amount'
                    """)
                    
                    if ct_amount_type == 'integer':
                        print("🔄 Migrating CreditTransaction.amount from INTEGER to DECIMAL...")
                        await conn.execute('ALTER TABLE "CreditTransaction" ALTER COLUMN amount TYPE DECIMAL(10,2)')
                        print("✅ CreditTransaction.amount migrated to DECIMAL(10,2)")
                    elif ct_amount_type:
                        print(f"✅ CreditTransaction.amount already exists as {ct_amount_type}")
                except Exception as e:
                    print(f"❌ Error migrating CreditTransaction.amount: {e}")
                
                # Migrate existing CreditAward table to DECIMAL if needed
                try:
                    ca_credits_type = await conn.fetchval("""
                        SELECT data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'CreditAward' AND column_name = 'creditsAwarded'
                    """)
                    
                    if ca_credits_type == 'integer':
                        print("🔄 Migrating CreditAward.creditsAwarded from INTEGER to DECIMAL...")
                        await conn.execute('ALTER TABLE "CreditAward" ALTER COLUMN "creditsAwarded" TYPE DECIMAL(10,2)')
                        print("✅ CreditAward.creditsAwarded migrated to DECIMAL(10,2)")
                    elif ca_credits_type:
                        print(f"✅ CreditAward.creditsAwarded already exists as {ca_credits_type}")
                except Exception as e:
                    print(f"❌ Error migrating CreditAward.creditsAwarded: {e}")
                
                print("✅ Form tables ensured to exist")
        except Exception as e:
            print(f"❌ Error ensuring form tables exist: {e}")
            raise e

    # Form CRUD operations
    async def create_form(self, form_data: dict) -> Dict[str, Any]:
        """Create a new form"""
        try:
            async with self.get_connection() as conn:
                async with conn.transaction():
                    # Generate unique access token
                    import secrets
                    access_token = f"form_{secrets.token_urlsafe(32)}"
                    
                    # Create form
                    form_query = """
                        INSERT INTO "Form" ("eventId", title, description, "isActive", "isRequired", "accessToken", "allowPublicAccess")
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id, "eventId", title, description, "isActive", "isRequired", "accessToken", "allowPublicAccess", "createdAt", "updatedAt"
                    """
                    form_row = await conn.fetchrow(
                        form_query,
                        form_data["eventId"],
                        form_data["title"],
                        form_data.get("description"),
                        form_data.get("isActive", True),
                        form_data.get("isRequired", False),
                        access_token,
                        form_data.get("allowPublicAccess", True)
                    )
                    
                    form_id = form_row["id"]
                    
                    # Create fields if provided
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
                    
                    # Create credit award if provided
                    credit_award = None
                    if "creditAward" in form_data and form_data["creditAward"]:
                        credit_award_query = """
                            INSERT INTO "CreditAward" ("formId", "creditsAwarded", "isActive")
                            VALUES ($1, $2, $3)
                            RETURNING id, "formId", "creditsAwarded", "isActive", "createdAt", "updatedAt"
                        """
                        credit_award_row = await conn.fetchrow(
                            credit_award_query,
                            form_id,
                            form_data["creditAward"]["creditsAwarded"],
                            form_data["creditAward"]["isActive"]
                        )
                        credit_award = dict(credit_award_row)
                    
                    return {
                        **dict(form_row),
                        "fields": fields,
                        "creditAward": credit_award
                    }
        except Exception as e:
            print(f"❌ Error creating form: {e}")
            raise e
    
    async def get_form_by_event_id(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Get form by event ID with fields"""
        try:
            async with self.get_connection() as conn:
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

                # Get credit award settings (safely handle missing table)
                credit_award = None
                try:
                    # First check if CreditAward table exists
                    table_check_query = """
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = 'CreditAward'
                        );
                    """
                    table_exists = await conn.fetchval(table_check_query)
                    
                    if table_exists:
                        credit_award_query = """
                            SELECT id, "formId", "creditsAwarded", "isActive", "createdAt", "updatedAt"
                            FROM "CreditAward"
                            WHERE "formId" = $1
                        """
                        credit_award_row = await conn.fetchrow(credit_award_query, form_row["id"])
                        credit_award = dict(credit_award_row) if credit_award_row else None
                    else:
                        print(f"⚠️ Warning: CreditAward table does not exist, skipping credit award fetch")
                        credit_award = None
                except Exception as credit_error:
                    print(f"⚠️ Warning: Could not fetch credit award for form {form_row['id']}: {credit_error}")
                    credit_award = None
                
                return {
                    **dict(form_row),
                    "fields": fields,
                    "creditAward": credit_award
                }
        except Exception as e:
            print(f"❌ Error getting form by event ID {event_id}: {str(e)}")
            import traceback
            print(f"❌ Full traceback: {traceback.format_exc()}")
            raise e
    
    async def update_form(self, form_id: int, form_data: dict) -> Dict[str, Any]:
        """Update a form and its fields"""
        try:
            async with self.get_connection() as conn:
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
                    
                    # Update credit award settings
                    credit_award = None
                    # First delete existing credit award
                    await conn.execute('DELETE FROM "CreditAward" WHERE "formId" = $1', form_id)
                    
                    # Create new credit award if provided
                    if "creditAward" in form_data and form_data["creditAward"]:
                        credit_award_query = """
                            INSERT INTO "CreditAward" ("formId", "creditsAwarded", "isActive")
                            VALUES ($1, $2, $3)
                            RETURNING id, "formId", "creditsAwarded", "isActive", "createdAt", "updatedAt"
                        """
                        credit_award_row = await conn.fetchrow(
                            credit_award_query,
                            form_id,
                            form_data["creditAward"]["creditsAwarded"],
                            form_data["creditAward"]["isActive"]
                        )
                        credit_award = dict(credit_award_row)
                    
                    return {
                        **dict(form_row),
                        "fields": fields,
                        "creditAward": credit_award
                    }
        except Exception as e:
            print(f"❌ Error updating form: {e}")
            raise e
    
    async def delete_form(self, form_id: int) -> bool:
        """Delete a form"""
        try:
            async with self.get_connection() as conn:
                result = await conn.execute('DELETE FROM "Form" WHERE id = $1', form_id)
                return result == "DELETE 1"
        except Exception as e:
            print(f"❌ Error deleting form: {e}")
            raise e
    
    # Form submission operations
    async def submit_form(self, submission_data: dict) -> Dict[str, Any]:
        """Submit a form"""
        try:
            async with self.get_connection() as conn:
                async with conn.transaction():
                    # Check if submission already exists
                    existing_query = """
                        SELECT id FROM "FormSubmission" 
                        WHERE "formId" = $1 AND "userId" = $2
                    """
                    existing_submission = await conn.fetchrow(
                        existing_query,
                        submission_data["formId"],
                        submission_data["userId"]
                    )
                    
                    if existing_submission:
                        raise Exception("You have already submitted this form")
                    
                    # Create new submission
                    submission_query = """
                        INSERT INTO "FormSubmission" ("formId", "userId")
                        VALUES ($1, $2)
                        RETURNING id, "formId", "userId", "submittedAt"
                    """
                    submission_row = await conn.fetchrow(
                        submission_query,
                        submission_data["formId"],
                        submission_data["userId"]
                    )
                    
                    submission_id = submission_row["id"]
                    
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
    
    async def award_credits_for_form_submission(self, form_id: int, user_id: int) -> float:
        """Award credits to user for completing a form"""
        try:
            async with self.get_connection() as conn:
                # Check if this form has credit awards configured
                credit_award_query = """
                    SELECT ca.* FROM "CreditAward" ca 
                    WHERE ca."formId" = $1 AND ca."isActive" = true
                """
                credit_award = await conn.fetchrow(credit_award_query, form_id)
                
                if not credit_award:
                    print(f"ℹ️ No credit award configured for form {form_id}")
                    return 0
                
                credits_to_award = credit_award["creditsAwarded"]
                if credits_to_award <= 0:
                    print(f"ℹ️ No credits to award for form {form_id}")
                    return 0
                
                # Check if user already received credits for this form
                existing_transaction = await conn.fetchrow("""
                    SELECT id FROM "CreditTransaction" 
                    WHERE "userId" = $1 AND "relatedFormId" = $2 AND type = 'earned'
                """, user_id, form_id)
                
                if existing_transaction:
                    print(f"ℹ️ User {user_id} already received credits for form {form_id}")
                    return 0
                
                async with conn.transaction():
                    # Update user's credit balance
                    await conn.execute("""
                        UPDATE "User" 
                        SET credits = credits + $1, "totalCreditsEarned" = "totalCreditsEarned" + $1
                        WHERE id = $2
                    """, credits_to_award, user_id)
                    
                    # Record the credit transaction
                    await conn.execute("""
                        INSERT INTO "CreditTransaction" ("userId", type, amount, description, "relatedFormId")
                        VALUES ($1, 'earned', $2, $3, $4)
                    """, user_id, credits_to_award, f"Form completion reward", form_id)
                    
                    print(f"💰 Awarded {credits_to_award} credits to user {user_id} for form {form_id}")
                    return credits_to_award
                    
        except Exception as e:
            print(f"❌ Error awarding credits: {e}")
            raise e
    
    async def get_form_submissions(self, form_id: int) -> List[Dict[str, Any]]:
        """Get all submissions for a form"""
        try:
            async with self.get_connection() as conn:
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
            async with self.get_connection() as conn:
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
            async with self.get_connection() as conn:
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
            async with self.get_connection() as conn:
                query = 'SELECT * FROM "Coupon" WHERE code = $1 AND "isActive" = true'
                row = await conn.fetchrow(query, code)
                return dict(row) if row else None
        except Exception as e:
            print(f"❌ Error getting coupon by code: {e}")
            raise e
    
    async def use_coupon(self, usage_data: dict) -> Dict[str, Any]:
        """Record coupon usage"""
        try:
            async with self.get_connection() as conn:
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
            async with self.get_connection() as conn:
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
    
    async def get_form_by_token(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get form by access token for public access"""
        try:
            async with self.get_connection() as conn:
                query = """
                    SELECT f.*, 
                           array_agg(
                               json_build_object(
                                   'id', ff.id,
                                   'type', ff.type,
                                   'question', ff.question,
                                   'description', ff.description,
                                   'isRequired', ff."isRequired",
                                   'options', CASE 
                                       WHEN ff.options IS NOT NULL THEN (ff.options::json)
                                       ELSE '[]'::json
                                   END,
                                   'order', ff."order"
                               ) ORDER BY ff."order"
                           ) as fields
                    FROM "Form" f
                    LEFT JOIN "FormField" ff ON f.id = ff."formId"
                    WHERE f."accessToken" = $1 
                    AND f."isActive" = true 
                    AND f."allowPublicAccess" = true
                    GROUP BY f.id
                """
                row = await conn.fetchrow(query, access_token)
                if row:
                    form_dict = dict(row)
                    # Remove null fields if no fields exist
                    if form_dict['fields'] == [None]:
                        form_dict['fields'] = []
                    return form_dict
                return None
        except Exception as e:
            print(f"❌ Error getting form by token: {e}")
            raise e
    
    async def get_event_by_id(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Get event by ID"""
        try:
            async with self.get_connection() as conn:
                query = 'SELECT * FROM "Event" WHERE id = $1'
                row = await conn.fetchrow(query, event_id)
                return dict(row) if row else None
        except Exception as e:
            print(f"❌ Error getting event by ID: {e}")
            raise e
    
    async def find_or_create_guest_user(self, email: str, name: str) -> int:
        """Find existing user by email or create a guest user entry"""
        try:
            async with self.get_connection() as conn:
                # First try to find existing user by email
                existing_user_query = 'SELECT id FROM "User" WHERE email = $1'
                existing_user = await conn.fetchrow(existing_user_query, email)
                
                if existing_user:
                    return existing_user["id"]
                
                # Create guest user if not found
                name_parts = name.split(' ', 1)
                first_name = name_parts[0]
                last_name = name_parts[1] if len(name_parts) > 1 else ""
                
                guest_user_query = """
                    INSERT INTO "User" (
                        email, "firstName", "lastName", major, "graduationYear", 
                        "currentYear", university, "cognitoSub"
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                """
                guest_user = await conn.fetchrow(
                    guest_user_query,
                    email,
                    first_name,
                    last_name,
                    "Unknown",  # major
                    2024,  # graduationYear - default
                    "Guest",  # currentYear
                    "Unknown",  # university
                    f"guest-{email}"  # cognitoSub - unique identifier for guests
                )
                return guest_user["id"]
        except Exception as e:
            print(f"❌ Error finding or creating guest user: {e}")
            raise e
    
    async def get_form_by_id(self, form_id: int) -> Optional[Dict[str, Any]]:
        """Get form by ID"""
        try:
            async with self.get_connection() as conn:
                query = """
                    SELECT f.*, 
                           array_agg(
                               json_build_object(
                                   'id', ff.id,
                                   'type', ff.type,
                                   'question', ff.question,
                                   'description', ff.description,
                                   'isRequired', ff."isRequired",
                                   'options', CASE 
                                       WHEN ff.options IS NOT NULL THEN (ff.options::json)
                                       ELSE '[]'::json
                                   END,
                                   'order', ff."order"
                               ) ORDER BY ff."order"
                           ) as fields
                    FROM "Form" f
                    LEFT JOIN "FormField" ff ON f.id = ff."formId"
                    WHERE f.id = $1
                    GROUP BY f.id
                """
                row = await conn.fetchrow(query, form_id)
                if row:
                    form_dict = dict(row)
                    # Remove null fields if no fields exist
                    if form_dict['fields'] == [None]:
                        form_dict['fields'] = []
                    return form_dict
                return None
        except Exception as e:
            print(f"❌ Error getting form by ID: {e}")
            raise e 

    async def get_user_credits(self, user_id: int) -> Dict[str, Any]:
        """Get user's current credit balance"""
        try:
            async with self.get_connection() as conn:
                user_query = """
                    SELECT credits, "totalCreditsEarned" 
                    FROM "User" 
                    WHERE id = $1
                """
                print(f"🔍 Getting credits for user {user_id}")
                user_row = await conn.fetchrow(user_query, user_id)
                
                if not user_row:
                    print(f"❌ User {user_id} not found in database")
                    raise Exception(f"User {user_id} not found")
                
                credits = user_row["credits"]
                total_earned = user_row["totalCreditsEarned"]
                print(f"💰 User {user_id} credits: {credits}, total earned: {total_earned}")
                
                # Handle both int and float types
                current_credits = float(credits) if credits is not None else 0.0
                total_credits_earned = float(total_earned) if total_earned is not None else 0.0
                
                result = {
                    "currentCredits": current_credits,
                    "totalEarned": total_credits_earned
                }
                print(f"✅ Returning credits data: {result}")
                return result
        except Exception as e:
            print(f"❌ Error getting user credits: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    async def get_credit_history(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """Get user's credit transaction history"""
        try:
            async with self.get_connection() as conn:
                history_query = """
                    SELECT ct.*, f.title as form_title, e.name as event_name
                    FROM "CreditTransaction" ct
                    LEFT JOIN "Form" f ON ct."relatedFormId" = f.id
                    LEFT JOIN "Event" e ON ct."relatedEventId" = e.id
                    WHERE ct."userId" = $1
                    ORDER BY ct."createdAt" DESC
                    LIMIT $2
                """
                rows = await conn.fetch(history_query, user_id, limit)
                
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"❌ Error getting credit history: {e}")
            raise e
    
    async def spend_user_credits(self, user_id: int, amount: float, description: str, event_id: int = None) -> Dict[str, Any]:
        """Spend user credits"""
        try:
            async with self.get_connection() as conn:
                async with conn.transaction():
                    # Check user's current balance
                    user_row = await conn.fetchrow("""
                        SELECT credits FROM "User" WHERE id = $1
                    """, user_id)
                    
                    if not user_row:
                        raise Exception(f"User {user_id} not found")
                    
                    current_credits = user_row["credits"] or 0
                    if current_credits < amount:
                        raise Exception(f"Insufficient credits. Current: {current_credits}, Required: {amount}")
                    
                    # Deduct credits from user
                    await conn.execute("""
                        UPDATE "User" 
                        SET credits = credits - $1
                        WHERE id = $2
                    """, amount, user_id)
                    
                    # Record the transaction
                    transaction_row = await conn.fetchrow("""
                        INSERT INTO "CreditTransaction" ("userId", type, amount, description, "relatedEventId")
                        VALUES ($1, 'spent', $2, $3, $4)
                        RETURNING *
                    """, user_id, amount, description, event_id)
                    
                    print(f"💸 User {user_id} spent {amount} credits: {description}")
                    return dict(transaction_row)
                    
        except Exception as e:
            print(f"❌ Error spending credits: {e}")
            raise e 