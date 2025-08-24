#!/usr/bin/env python3
"""
Database migration script to add admin permission column to User table
Uses the same database connection method as the backend
"""

import asyncio
import os
import sys

# Add the parent directory to the path so we can import from authentication
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from authentication.data_access.database_pool import get_pool_manager

async def add_admin_permission_column():
    """Add isAdmin column to User table and set initial admin user"""
    
    print("🚀 Starting admin permission migration...")
    
    # Get the pool manager (same as backend)
    pool_manager = get_pool_manager()
    
    try:
        print("🔗 Connecting to database using pool manager...")
        
        # Initialize the pool
        await pool_manager.initialize_pool()
        print("✅ Pool initialized")
        
        # Get a connection from the pool
        async with pool_manager.get_connection() as conn:
            async with conn.transaction():
                print("📝 Checking if migration is needed...")
                
                # Check if isAdmin column already exists
                column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = 'User'
                        AND column_name = 'isAdmin'
                    );
                """)
                
                if column_exists:
                    print("✅ isAdmin column already exists")
                else:
                    # Add isAdmin column
                    print("🆕 Adding isAdmin column to User table...")
                    await conn.execute("""
                        ALTER TABLE "User" 
                        ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE;
                    """)
                    print("✅ isAdmin column added successfully")
                
                # Set initial admin user
                admin_email = "koseiuemura1227@gmail.com"
                print(f"👑 Setting {admin_email} as admin...")
                
                result = await conn.execute("""
                    UPDATE "User" 
                    SET "isAdmin" = TRUE 
                    WHERE email = $1;
                """, admin_email)
                
                # Check if user was updated
                admin_user = await conn.fetchrow("""
                    SELECT id, email, "isAdmin" 
                    FROM "User" 
                    WHERE email = $1;
                """, admin_email)
                
                if admin_user:
                    print(f"✅ {admin_email} is now admin (ID: {admin_user['id']})")
                else:
                    print(f"⚠️ User {admin_email} not found in database")
                
                # Show all admin users
                admin_users = await conn.fetch("""
                    SELECT id, email, "firstName", "lastName", "isAdmin"
                    FROM "User" 
                    WHERE "isAdmin" = TRUE;
                """)
                
                print(f"\n👑 Current admin users ({len(admin_users)}):")
                for user in admin_users:
                    print(f"  - {user['email']} (ID: {user['id']}) - {user['firstName']} {user['lastName']}")
                
                print("\n🚀 Migration completed successfully!")
                print("📋 Summary:")
                print(f"   - Added isAdmin column to User table")
                print(f"   - Set {admin_email} as initial admin user")
                print(f"   - Total admin users: {len(admin_users)}")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        # Close the pool
        if pool_manager._pool:
            await pool_manager._pool.close()

if __name__ == "__main__":
    asyncio.run(add_admin_permission_column()) 