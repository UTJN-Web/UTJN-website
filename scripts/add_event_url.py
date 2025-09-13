#!/usr/bin/env python3
"""
Database migration script to add URL column to Event table
Uses the same database connection method as the backend
"""

import asyncio
import os
import sys

# Add the parent directory to the path so we can import from authentication
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from authentication.data_access.database_pool import get_pool_manager

async def add_event_url_column():
    """Add url column to Event table for external event links"""
    
    print("🚀 Starting event URL migration...")
    
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
                
                # Check if url column already exists
                column_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                        AND table_name = 'Event'
                        AND column_name = 'url'
                    );
                """)
                
                if column_exists:
                    print("✅ url column already exists")
                else:
                    # Add url column
                    print("🆕 Adding url column to Event table...")
                    await conn.execute("""
                        ALTER TABLE "Event" 
                        ADD COLUMN "url" TEXT;
                    """)
                    print("✅ url column added successfully")
                
                # Show current event count
                event_count = await conn.fetchval('SELECT COUNT(*) FROM "Event"')
                print(f"📊 Current events in database: {event_count}")
                
                print("\n🚀 Migration completed successfully!")
                print("📋 Summary:")
                print(f"   - Added url column to Event table")
                print(f"   - Events can now have external URLs for registration")
                print(f"   - Total events: {event_count}")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        # Close the pool
        if pool_manager._pool:
            await pool_manager._pool.close()

if __name__ == "__main__":
    asyncio.run(add_event_url_column())
