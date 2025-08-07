# authentication/data_access/event_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any, List
from datetime import datetime

class EventRepository:
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
                
                print(f"✅ Successfully retrieved secret: {secret_name}")
                return database_url
                
            except Exception as e:
                # Suppress error logs since fallback works
                continue
        
        # If all secrets fail, return None
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
        
        # Extract database URL for logging
        if database_url:
            # Extract components for safe logging (hide password)
            import re
            match = re.match(r'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', database_url)
            if match:
                username, password, host, port, dbname = match.groups()
                safe_url = f"postgresql://{username}:***@{host}:{port}/{dbname}"
                print(f"🔗 Database URL: {safe_url}")
        
        print("🔌 Attempting to connect to database...")
        self.pool = await asyncpg.create_pool(database_url)
        print("✅ Successfully connected to database")
    
    async def disconnect(self):
        """Disconnect from the database"""
        if self.pool:
            await self.pool.close()
    
    async def ensure_tables_exist(self):
        """Ensure Event and EventRegistration tables exist"""
        try:
            async with self.pool.acquire() as conn:
                # Check if Event table exists
                event_table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'Event'
                    );
                """)
                
                if not event_table_exists:
                    print("🆕 Creating Event table...")
                    await conn.execute("""
                        CREATE TABLE "Event" (
                            id SERIAL PRIMARY KEY,
                            name TEXT NOT NULL,
                            description TEXT NOT NULL,
                            "targetYear" TEXT NOT NULL,
                            fee DECIMAL(10,2) DEFAULT 0,
                            capacity INTEGER NOT NULL,
                            "isArchived" BOOLEAN DEFAULT FALSE,
                            date TIMESTAMP NOT NULL,
                            type TEXT NOT NULL,
                            image TEXT,
                            "createdAt" TIMESTAMP DEFAULT NOW(),
                            "updatedAt" TIMESTAMP DEFAULT NOW()
                        );
                    """)
                    print("✅ Event table created")
                else:
                    print("✅ Event table already exists")
                
                # Check if EventRegistration table exists
                registration_table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'EventRegistration'
                    );
                """)
                
                if not registration_table_exists:
                    print("🆕 Creating EventRegistration table...")
                    await conn.execute("""
                        CREATE TABLE "EventRegistration" (
                            id SERIAL PRIMARY KEY,
                            "userId" INTEGER NOT NULL,
                            "eventId" INTEGER NOT NULL,
                            "registeredAt" TIMESTAMP DEFAULT NOW(),
                            "paymentStatus" TEXT DEFAULT 'pending',
                            FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
                            FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE,
                            UNIQUE ("userId", "eventId")
                        );
                    """)
                    print("✅ EventRegistration table created")
                else:
                    print("✅ EventRegistration table already exists")
                    
        except Exception as e:
            print(f"❌ Error ensuring tables exist: {e}")
            raise e
    
    async def get_all_events(self) -> List[Dict[str, Any]]:
        """Get all events with registration counts and registered users"""
        try:
            async with self.pool.acquire() as conn:
                # First get all events
                events_query = """
                SELECT 
                    e.*,
                    COUNT(er.id) as registration_count
                FROM "Event" e
                LEFT JOIN "EventRegistration" er ON e.id = er."eventId"
                GROUP BY e.id
                ORDER BY e.date ASC
                """
                
                event_rows = await conn.fetch(events_query)
                
                events = []
                for row in event_rows:
                    event_dict = dict(row)
                    event_id = event_dict['id']
                    
                    # Get registered users for this event
                    users_query = """
                    SELECT 
                        u.id,
                        u."firstName",
                        u."lastName", 
                        u.email
                    FROM "EventRegistration" er
                    JOIN "User" u ON er."userId" = u.id
                    WHERE er."eventId" = $1
                    """
                    
                    user_rows = await conn.fetch(users_query, event_id)
                    registered_users = []
                    for user_row in user_rows:
                        registered_users.append({
                            'id': user_row['id'],
                            'firstName': user_row['firstName'],
                            'lastName': user_row['lastName'],
                            'email': user_row['email']
                        })
                    
                    # Calculate remaining seats
                    event_dict['remainingSeats'] = event_dict['capacity'] - event_dict['registration_count']
                    event_dict['registeredUsers'] = registered_users
                    events.append(event_dict)
                
                return events
        except Exception as e:
            print(f"❌ Error getting all events: {e}")
            raise e
    
    async def get_event_by_id(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Get event by ID with registrations"""
        try:
            async with self.pool.acquire() as conn:
                # Get event details
                event_query = """
                SELECT * FROM "Event" WHERE id = $1
                """
                event_row = await conn.fetchrow(event_query, event_id)
                
                if not event_row:
                    return None
                
                # Get registrations with user details
                registrations_query = """
                SELECT 
                    er.*,
                    u.id as user_id,
                    u."firstName",
                    u."lastName",
                    u.email
                FROM "EventRegistration" er
                JOIN "User" u ON er."userId" = u.id
                WHERE er."eventId" = $1
                """
                registration_rows = await conn.fetch(registrations_query, event_id)
                
                event_dict = dict(event_row)
                registrations = []
                registered_users = []
                
                for reg_row in registration_rows:
                    reg_dict = {
                        'id': reg_row['id'],
                        'userId': reg_row['userId'],
                        'eventId': reg_row['eventId'],
                        'registeredAt': reg_row['registeredAt'].isoformat() if reg_row['registeredAt'] else None,
                        'paymentStatus': reg_row['paymentStatus']
                    }
                    registrations.append(reg_dict)
                    
                    user_dict = {
                        'id': reg_row['user_id'],
                        'firstName': reg_row['firstName'],
                        'lastName': reg_row['lastName'],
                        'email': reg_row['email']
                    }
                    registered_users.append(user_dict)
                
                event_dict['registrations'] = registrations
                event_dict['registeredUsers'] = registered_users
                event_dict['remainingSeats'] = event_dict['capacity'] - len(registrations)
                
                return event_dict
        except Exception as e:
            print(f"❌ Error getting event by ID: {e}")
            raise e
    
    async def create_event(self, event_data: dict) -> Dict[str, Any]:
        """Create a new event"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                INSERT INTO "Event" (name, description, "targetYear", fee, capacity, date, type, image, "isArchived")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
                """
                
                row = await conn.fetchrow(
                    query,
                    event_data["name"],
                    event_data["description"],
                    event_data["targetYear"],
                    float(event_data.get("fee", 0)),
                    int(event_data["capacity"]),
                    datetime.fromisoformat(event_data["date"].replace('Z', '+00:00')),
                    event_data["type"],
                    event_data.get("image"),
                    event_data.get("isArchived", False)
                )
                
                event_dict = dict(row)
                event_dict['registrations'] = []
                event_dict['registeredUsers'] = []
                event_dict['remainingSeats'] = event_dict['capacity']
                
                return event_dict
        except Exception as e:
            print(f"❌ Error creating event: {e}")
            raise e
    
    async def update_event(self, event_id: int, event_data: dict) -> Dict[str, Any]:
        """Update an existing event"""
        try:
            async with self.pool.acquire() as conn:
                query = """
                UPDATE "Event" 
                SET name = $1, description = $2, "targetYear" = $3, fee = $4, 
                    capacity = $5, date = $6, type = $7, image = $8, "isArchived" = $9,
                    "updatedAt" = NOW()
                WHERE id = $10
                RETURNING *
                """
                
                row = await conn.fetchrow(
                    query,
                    event_data["name"],
                    event_data["description"],
                    event_data["targetYear"],
                    float(event_data.get("fee", 0)),
                    int(event_data["capacity"]),
                    datetime.fromisoformat(event_data["date"].replace('Z', '+00:00')),
                    event_data["type"],
                    event_data.get("image"),
                    event_data.get("isArchived", False),
                    event_id
                )
                
                if not row:
                    return None
                
                return dict(row)
        except Exception as e:
            print(f"❌ Error updating event: {e}")
            raise e
    
    async def delete_event(self, event_id: int) -> bool:
        """Delete an event"""
        try:
            async with self.pool.acquire() as conn:
                result = await conn.execute(
                    'DELETE FROM "Event" WHERE id = $1',
                    event_id
                )
                return result == "DELETE 1"
        except Exception as e:
            print(f"❌ Error deleting event: {e}")
            raise e
    
    async def register_for_event(self, user_id: int, event_id: int) -> Dict[str, Any]:
        """Register a user for an event"""
        try:
            async with self.pool.acquire() as conn:
                # Check if event exists and has capacity
                event = await conn.fetchrow(
                    'SELECT * FROM "Event" WHERE id = $1',
                    event_id
                )
                
                if not event:
                    raise Exception("Event not found")
                
                # Check current registrations
                registration_count = await conn.fetchval(
                    'SELECT COUNT(*) FROM "EventRegistration" WHERE "eventId" = $1',
                    event_id
                )
                
                if registration_count >= event['capacity']:
                    raise Exception("Event is full")
                
                # Check if user is already registered
                existing = await conn.fetchrow(
                    'SELECT * FROM "EventRegistration" WHERE "userId" = $1 AND "eventId" = $2',
                    user_id, event_id
                )
                
                if existing:
                    raise Exception("User already registered for this event")
                
                # Create registration
                registration = await conn.fetchrow("""
                    INSERT INTO "EventRegistration" ("userId", "eventId", "paymentStatus")
                    VALUES ($1, $2, 'completed')
                    RETURNING *
                """, user_id, event_id)
                
                return {
                    'id': registration['id'],
                    'userId': registration['userId'],
                    'eventId': registration['eventId'],
                    'registeredAt': registration['registeredAt'].isoformat(),
                    'paymentStatus': registration['paymentStatus'],
                    'fee': float(event['fee'])
                }
        except Exception as e:
            print(f"❌ Error registering for event: {e}")
            raise e
    
    async def cancel_registration(self, user_id: int, event_id: int) -> bool:
        """Cancel a user's registration for an event"""
        try:
            async with self.pool.acquire() as conn:
                result = await conn.execute(
                    'DELETE FROM "EventRegistration" WHERE "userId" = $1 AND "eventId" = $2',
                    user_id, event_id
                )
                return result == "DELETE 1"
        except Exception as e:
            print(f"❌ Error canceling registration: {e}")
            raise e
    
    async def seed_sample_events(self):
        """Seed sample events"""
        sample_events = [
            {
                "name": "外資コンサルティング企業説明会",
                "description": "KPMGやPwCなど外資系コンサルの採用担当者とのネットワーキング。",
                "targetYear": "All years",
                "fee": 0,
                "capacity": 40,
                "date": "2025-09-02T18:00:00",
                "type": "career",
                "image": "/events/event1.jpg"
            },
            {
                "name": "秋の新歓BBQ",
                "description": "トロントの湖畔で新入生歓迎BBQ！日本食も用意します。",
                "targetYear": "1st-2nd year",
                "fee": 15,
                "capacity": 25,
                "date": "2025-09-05T12:00:00",
                "type": "social",
                "image": "/events/event2.jpg"
            },
            {
                "name": "トロント・アイススケート交流会",
                "description": "ダウンタウンのスケートリンクを貸し切り！初心者歓迎。",
                "targetYear": "All years",
                "fee": 10,
                "capacity": 30,
                "date": "2025-09-10T19:00:00",
                "type": "social",
                "image": "/events/event3.jpg"
            },
            {
                "name": "就活ワークショップ：履歴書の書き方",
                "description": "カナダ企業向けレジュメの書き方をプロが指導。",
                "targetYear": "3rd-4th year",
                "fee": 5,
                "capacity": 50,
                "date": "2025-09-15T14:00:00",
                "type": "career",
                "image": "/events/event4.jpg"
            },
            {
                "name": "OB・OG座談会 〜キャリアパスを語ろう〜",
                "description": "卒業生からリアルなキャリア体験を聞ける少人数座談会。",
                "targetYear": "All years",
                "fee": 0,
                "capacity": 20,
                "date": "2025-09-20T16:00:00",
                "type": "career",
                "image": "/events/event5.jpg"
            },
            # Archived events
            {
                "name": "桜鑑賞ピクニック",
                "description": "ハイパークでお花見＆お弁当交流会を開催しました。",
                "targetYear": "All years",
                "fee": 0,
                "capacity": 35,
                "date": "2025-04-05T11:00:00",
                "type": "social",
                "image": "/events/event6.jpg",
                "isArchived": True
            },
            {
                "name": "夏祭り in Toronto",
                "description": "盆踊りと屋台で日本の夏を再現！400名超が参加。",
                "targetYear": "All years",
                "fee": 20,
                "capacity": 60,
                "date": "2024-08-12T18:00:00",
                "type": "social",
                "image": "/events/event7.jpg",
                "isArchived": True
            }
        ]
        
        try:
            for event_data in sample_events:
                try:
                    await self.create_event(event_data)
                    print(f"✅ Created event: {event_data['name']}")
                except Exception as e:
                    print(f"⚠️ Event {event_data['name']} already exists or error occurred: {e}")
            
            print("✅ Sample events seeded successfully!")
        except Exception as e:
            print(f"❌ Error seeding events: {e}")
            raise e
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        try:
            async with self.pool.acquire() as conn:
                event_count = await conn.fetchval('SELECT COUNT(*) FROM "Event"')
                user_count = await conn.fetchval('SELECT COUNT(*) FROM "User"')
                registration_count = await conn.fetchval('SELECT COUNT(*) FROM "EventRegistration"')
                
                # Get a sample event
                sample_event = await conn.fetchrow("""
                    SELECT e.*, COUNT(er.id) as registration_count
                    FROM "Event" e
                    LEFT JOIN "EventRegistration" er ON e.id = er."eventId"
                    GROUP BY e.id
                    LIMIT 1
                """)
                
                sample_event_data = None
                if sample_event:
                    sample_event_data = {
                        'id': sample_event['id'],
                        'name': sample_event['name'],
                        'capacity': sample_event['capacity'],
                        'registrationCount': sample_event['registration_count'],
                        'remainingSeats': sample_event['capacity'] - sample_event['registration_count']
                    }
                
                return {
                    'totalEvents': event_count,
                    'totalUsers': user_count,
                    'totalRegistrations': registration_count,
                    'sampleEvent': sample_event_data
                }
        except Exception as e:
            print(f"❌ Error getting system stats: {e}")
            raise e 