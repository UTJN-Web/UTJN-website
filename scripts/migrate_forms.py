#!/usr/bin/env python3
"""
Migration script to add public access functionality to forms
Run this script to update the database schema for form public access
"""

import asyncio
import asyncpg
import os
import sys
import secrets
from typing import Optional

# Add the parent directory to the path so we can import from authentication
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from authentication.data_access.form_repository import FormRepository

async def run_migration():
    """Run the form migration to add public access fields"""
    print("🚀 Starting form public access migration...")
    
    # Initialize repository to get database connection
    form_repo = FormRepository()
    
    try:
        await form_repo.connect()
        print("✅ Connected to database")
        
        async with form_repo.pool.acquire() as conn:
            async with conn.transaction():
                print("📝 Checking if migration is needed...")
                
                # Check if accessToken column already exists
                token_check = await conn.fetchval("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'Form' AND column_name = 'accessToken'
                """)
                
                if token_check:
                    print("⚠️  Migration already applied - accessToken column exists")
                    return
                
                print("🔧 Adding accessToken and allowPublicAccess columns...")
                
                # Add the new columns
                await conn.execute("""
                    ALTER TABLE "Form" 
                    ADD COLUMN "accessToken" TEXT,
                    ADD COLUMN "allowPublicAccess" BOOLEAN DEFAULT true
                """)
                
                print("🔑 Generating access tokens for existing forms...")
                
                # Get all existing forms
                existing_forms = await conn.fetch('SELECT id FROM "Form"')
                
                # Generate unique access tokens for existing forms
                for form in existing_forms:
                    access_token = f"form_{secrets.token_urlsafe(32)}"
                    await conn.execute(
                        'UPDATE "Form" SET "accessToken" = $1 WHERE id = $2',
                        access_token, form['id']
                    )
                
                print(f"✅ Generated access tokens for {len(existing_forms)} existing forms")
                
                # Make accessToken NOT NULL and unique
                await conn.execute("""
                    ALTER TABLE "Form" 
                    ALTER COLUMN "accessToken" SET NOT NULL
                """)
                
                await conn.execute("""
                    ALTER TABLE "Form"
                    ADD CONSTRAINT "Form_accessToken_unique" UNIQUE ("accessToken")
                """)
                
                # Create indexes for performance
                await conn.execute("""
                    CREATE INDEX "Form_accessToken_idx" ON "Form"("accessToken")
                """)
                
                await conn.execute("""
                    CREATE INDEX "Form_allowPublicAccess_idx" ON "Form"("allowPublicAccess")
                """)
                
                print("🚀 Migration completed successfully!")
                print("📋 Summary:")
                print(f"   - Added accessToken and allowPublicAccess columns to Form table")
                print(f"   - Generated unique access tokens for {len(existing_forms)} existing forms")
                print(f"   - Created indexes for performance")
                print(f"   - Forms can now be accessed via public links like: /form/{{accessToken}}")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        await form_repo.disconnect()

if __name__ == "__main__":
    asyncio.run(run_migration()) 