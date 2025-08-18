#!/usr/bin/env python3
"""
Fix existing image URLs in the database to use the correct backend URL
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def fix_image_urls():
    """Update existing image URLs to use the correct backend URL"""
    
    # Database connection
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:MyNewPassword123!@utjn-db.ch68m8sgy7on.us-east-2.rds.amazonaws.com:5432/postgres?sslmode=require")
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get all events with image URLs
        cursor.execute("SELECT id, image FROM events WHERE image IS NOT NULL AND image != ''")
        events = cursor.fetchall()
        
        print(f"Found {len(events)} events with images")
        
        updated_count = 0
        for event in events:
            image_url = event['image']
            
            # Check if URL needs to be updated
            if image_url.startswith('/uploads/') and not image_url.startswith(BACKEND_URL):
                new_url = f"{BACKEND_URL}{image_url}"
                
                # Update the database
                cursor.execute(
                    "UPDATE events SET image = %s WHERE id = %s",
                    (new_url, event['id'])
                )
                
                print(f"Updated event {event['id']}: {image_url} -> {new_url}")
                updated_count += 1
        
        # Commit changes
        conn.commit()
        print(f"Successfully updated {updated_count} image URLs")
        
    except Exception as e:
        print(f"Error fixing image URLs: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    fix_image_urls() 