# authentication/data_access/event_repository.py
import os
import sys
import asyncpg
import boto3
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from .base_repository import BaseRepository

class EventRepository(BaseRepository):
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
    
    # connect() and disconnect() methods are now handled by BaseRepository
    # No need to implement them as the global pool is managed centrally
    
    async def ensure_tables_exist(self):
        """Ensure Event and EventRegistration tables exist"""
        try:
            async with self.get_connection() as conn:
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
                            "isUofTOnly" BOOLEAN DEFAULT FALSE,
                            date TIMESTAMP NOT NULL,
                            type TEXT NOT NULL,
                            image TEXT,
                            "refundDeadline" TIMESTAMP,
                            "createdAt" TIMESTAMP DEFAULT NOW(),
                            "updatedAt" TIMESTAMP DEFAULT NOW()
                        );
                    """)
                    print("✅ Event table created")
                else:
                    print("✅ Event table already exists")
                    # Check if refundDeadline column exists and add it if not
                    refund_deadline_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'Event'
                            AND column_name = 'refundDeadline'
                        );
                    """)
                    
                    if not refund_deadline_exists:
                        print("🆕 Adding refundDeadline column to Event table...")
                        await conn.execute("""
                            ALTER TABLE "Event" 
                            ADD COLUMN "refundDeadline" TIMESTAMP;
                        """)
                        # Set default refund deadline to event date for existing events
                        await conn.execute("""
                            UPDATE "Event" 
                            SET "refundDeadline" = date 
                            WHERE "refundDeadline" IS NULL;
                        """)
                        print("✅ refundDeadline column added to Event table")
                    else:
                        print("✅ refundDeadline column already exists in Event table")
                    
                    # Check if isUofTOnly column exists and add it if not
                    is_uof_t_only_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'Event'
                            AND column_name = 'isUofTOnly'
                        );
                    """)
                    
                    if not is_uof_t_only_exists:
                        print("🆕 Adding isUofTOnly column to Event table...")
                        await conn.execute("""
                            ALTER TABLE "Event" 
                            ADD COLUMN "isUofTOnly" BOOLEAN DEFAULT FALSE;
                        """)
                        print("✅ isUofTOnly column added to Event table")
                    else:
                        print("✅ isUofTOnly column already exists in Event table")
                    
                    # Check if advanced ticketing columns exist and add them if not
                    enable_advanced_ticketing_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'Event'
                            AND column_name = 'enableAdvancedTicketing'
                        );
                    """)
                    
                    if not enable_advanced_ticketing_exists:
                        print("🆕 Adding advanced ticketing columns to Event table...")
                        await conn.execute("""
                            ALTER TABLE "Event" 
                            ADD COLUMN "enableAdvancedTicketing" BOOLEAN DEFAULT FALSE,
                            ADD COLUMN "enableSubEvents" BOOLEAN DEFAULT FALSE;
                        """)
                        print("✅ Advanced ticketing columns added to Event table")
                    else:
                        print("✅ Advanced ticketing columns already exist in Event table")
                
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
                    # Check if paymentId column exists and add it if not
                    payment_id_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'EventRegistration'
                            AND column_name = 'paymentId'
                        );
                    """)
                    
                    print(f"🔍 PaymentId column exists check: {payment_id_exists}")
                    
                    if not payment_id_exists:
                        print("🆕 Adding paymentId column to EventRegistration table...")
                        await conn.execute("""
                            ALTER TABLE "EventRegistration" 
                            ADD COLUMN "paymentId" VARCHAR(255);
                        """)
                        print("✅ paymentId column added to EventRegistration table")
                    else:
                        print("✅ paymentId column already exists in EventRegistration table")
                    
                    # Check if advanced ticketing columns exist in EventRegistration
                    ticket_tier_id_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'EventRegistration'
                            AND column_name = 'ticketTierId'
                        );
                    """)
                    
                    if not ticket_tier_id_exists:
                        print("🆕 Adding advanced ticketing columns to EventRegistration table...")
                        await conn.execute("""
                            ALTER TABLE "EventRegistration" 
                            ADD COLUMN "ticketTierId" INTEGER,
                            ADD COLUMN "subEventId" INTEGER,
                            ADD COLUMN "finalPrice" DECIMAL(10,2);
                        """)
                        print("✅ Advanced ticketing columns added to EventRegistration table")
                    else:
                        print("✅ Advanced ticketing columns already exist in EventRegistration table")
                    
                    # Check if paymentEmail column exists in EventRegistration
                    payment_email_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'EventRegistration'
                            AND column_name = 'paymentEmail'
                        );
                    """)
                    
                    if not payment_email_exists:
                        print("🆕 Adding paymentEmail column to EventRegistration table...")
                        await conn.execute("""
                            ALTER TABLE "EventRegistration" 
                            ADD COLUMN "paymentEmail" VARCHAR(255);
                        """)
                        print("✅ paymentEmail column added to EventRegistration table")
                    else:
                        print("✅ paymentEmail column already exists in EventRegistration table")
                
                # Check if TicketTier table exists
                ticket_tier_table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'TicketTier'
                    );
                """)
                
                if not ticket_tier_table_exists:
                    print("🆕 Creating TicketTier table...")
                    await conn.execute("""
                        CREATE TABLE "TicketTier" (
                            id SERIAL PRIMARY KEY,
                            "eventId" INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            price DECIMAL(10,2) NOT NULL,
                            capacity INTEGER NOT NULL,
                            "targetYear" TEXT DEFAULT 'All years',
                            "startDate" TIMESTAMP,
                            "endDate" TIMESTAMP,
                            "isActive" BOOLEAN DEFAULT TRUE,
                            "subEventPrices" TEXT, -- JSON array for complex pricing
                            FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE,
                            UNIQUE ("eventId", name)
                        );
                    """)
                    print("✅ TicketTier table created")
                else:
                    print("✅ TicketTier table already exists")
                    # Check if targetYear column exists and add it if not
                    target_year_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'TicketTier'
                            AND column_name = 'targetYear'
                        );
                    """)
                    
                    if not target_year_exists:
                        print("🆕 Adding targetYear column to TicketTier table...")
                        await conn.execute("""
                            ALTER TABLE "TicketTier" 
                            ADD COLUMN "targetYear" TEXT DEFAULT 'All years';
                        """)
                        print("✅ targetYear column added to TicketTier table")
                    else:
                        print("✅ targetYear column already exists in TicketTier table")
                    
                    # Check if subEventPrices column exists and add it if not
                    sub_event_prices_exists = await conn.fetchval("""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                            AND table_name = 'TicketTier'
                            AND column_name = 'subEventPrices'
                        );
                    """)
                    
                    if not sub_event_prices_exists:
                        print("🆕 Adding subEventPrices column to TicketTier table...")
                        await conn.execute("""
                            ALTER TABLE "TicketTier" 
                            ADD COLUMN "subEventPrices" TEXT;
                        """)
                        print("✅ subEventPrices column added to TicketTier table")
                    else:
                        print("✅ subEventPrices column already exists in TicketTier table")
                
                # Check if SubEvent table exists
                sub_event_table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'SubEvent'
                    );
                """)
                
                if not sub_event_table_exists:
                    print("🆕 Creating SubEvent table...")
                    await conn.execute("""
                        CREATE TABLE "SubEvent" (
                            id SERIAL PRIMARY KEY,
                            "eventId" INTEGER NOT NULL,
                            name TEXT NOT NULL,
                            description TEXT,
                            price DECIMAL(10,2) NOT NULL,
                            capacity INTEGER NOT NULL,
                            "isStandalone" BOOLEAN DEFAULT TRUE,
                            "isComboOption" BOOLEAN DEFAULT FALSE,
                            FOREIGN KEY ("eventId") REFERENCES "Event"(id) ON DELETE CASCADE,
                            UNIQUE ("eventId", name)
                        );
                    """)
                    print("✅ SubEvent table created")
                else:
                    print("✅ SubEvent table already exists")
                    
        except Exception as e:
            print(f"❌ Error ensuring tables exist: {e}")
            raise e
    
    async def get_all_events(self) -> List[Dict[str, Any]]:
        """Get all events with registration counts and registered users"""
        try:
            async with self.get_connection() as conn:
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
                    
                    # Get registered users for this event with finalPrice
                    users_query = """
                    SELECT 
                        u.id,
                        u."firstName",
                        u."lastName", 
                        u.email,
                        er."finalPrice"
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
                            'email': user_row['email'],
                            'finalPrice': float(user_row['finalPrice']) if user_row['finalPrice'] is not None else None
                        })
                    
                    # Get ticket tiers if advanced ticketing is enabled
                    if event_dict.get('enableAdvancedTicketing'):
                        tiers = await self.get_available_ticket_tiers(event_id)
                        event_dict['ticketTiers'] = tiers
                        print(f"🎫 Event {event_id} has {len(tiers)} ticket tiers")
                    
                    # SubEvents disabled by policy
                    event_dict['subEvents'] = []
                    event_dict['enableSubEvents'] = False
                    
                    # Calculate remaining seats
                    if event_dict.get('enableAdvancedTicketing') and event_dict.get('ticketTiers'):
                        # For advanced ticketing, calculate total registrations across all tiers
                        total_registrations = 0
                        for tier in event_dict['ticketTiers']:
                            total_registrations += tier.get('registered_count', 0)
                        event_dict['remainingSeats'] = event_dict['capacity'] - total_registrations
                    else:
                        # For regular events, use basic capacity calculation
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
            async with self.get_connection() as conn:
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
                        'paymentStatus': reg_row['paymentStatus'],
                        'finalPrice': float(reg_row['finalPrice']) if reg_row['finalPrice'] is not None else None
                    }
                    registrations.append(reg_dict)
                    
                    user_dict = {
                        'id': reg_row['user_id'],
                        'firstName': reg_row['firstName'],
                        'lastName': reg_row['lastName'],
                        'email': reg_row['email'],
                        'finalPrice': float(reg_row['finalPrice']) if reg_row['finalPrice'] is not None else None
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
            async with self.get_connection() as conn:
                query = """
                INSERT INTO "Event" (name, description, "targetYear", fee, capacity, date, type, image, "refundDeadline", "isArchived", "isUofTOnly", "enableAdvancedTicketing", "enableSubEvents")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
                """
                
                # Parse refundDeadline if provided, otherwise use event date
                refund_deadline = None
                if event_data.get("refundDeadline"):
                    refund_deadline = datetime.fromisoformat(event_data["refundDeadline"].replace('Z', '+00:00'))
                else:
                    refund_deadline = datetime.fromisoformat(event_data["date"].replace('Z', '+00:00'))
                
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
                    refund_deadline,
                    event_data.get("isArchived", False),
                    event_data.get("isUofTOnly", False),
                    event_data.get("enableAdvancedTicketing", False),
                    event_data.get("enableSubEvents", False)
                )
                
                event_dict = dict(row)
                event_dict['registrations'] = []
                event_dict['registeredUsers'] = []
                event_dict['remainingSeats'] = event_dict['capacity']
                
                return event_dict
        except Exception as e:
            print(f"❌ Error creating event: {e}")
            raise e
    
    async def create_ticket_tier(self, tier_data: dict) -> Dict[str, Any]:
        """Create a new ticket tier for an event"""
        try:
            async with self.get_connection() as conn:
                query = """
                INSERT INTO "TicketTier" ("eventId", name, price, capacity, "targetYear", "startDate", "endDate", "isActive", "subEventPrices", "subEventCapacities")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
                """
                
                start_date = None
                end_date = None
                if tier_data.get("startDate"):
                    start_date = datetime.fromisoformat(tier_data["startDate"].replace('Z', '+00:00'))
                if tier_data.get("endDate"):
                    end_date = datetime.fromisoformat(tier_data["endDate"].replace('Z', '+00:00'))
                
                # Handle subEventPrices and subEventCapacities as JSON
                sub_event_prices_json = None
                if tier_data.get("subEventPrices"):
                    import json
                    sub_event_prices_json = json.dumps(tier_data["subEventPrices"])
                
                sub_event_capacities_json = None
                if tier_data.get("subEventCapacities"):
                    import json
                    sub_event_capacities_json = json.dumps(tier_data["subEventCapacities"])
                
                row = await conn.fetchrow(
                    query,
                    tier_data["eventId"],
                    tier_data["name"],
                    float(tier_data["price"]),
                    int(tier_data["capacity"]),
                    tier_data.get("targetYear", "All years"),
                    start_date,
                    end_date,
                    tier_data.get("isActive", True),
                    sub_event_prices_json,
                    sub_event_capacities_json
                )
                
                return dict(row)
        except Exception as e:
            print(f"Error creating ticket tier: {e}")
            raise e
    
    async def create_sub_event(self, sub_event_data: dict) -> Dict[str, Any]:
        """Create a new sub-event for an event"""
        try:
            async with self.get_connection() as conn:
                query = """
                INSERT INTO "SubEvent" ("eventId", name, description, price, capacity, "isStandalone", "isComboOption")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
                """
                
                row = await conn.fetchrow(
                    query,
                    sub_event_data["eventId"],
                    sub_event_data["name"],
                    sub_event_data.get("description"),
                    float(sub_event_data["price"]),
                    int(sub_event_data["capacity"]),
                    sub_event_data.get("isStandalone", True),
                    sub_event_data.get("isComboOption", False)
                )
                
                return dict(row)
        except Exception as e:
            print(f"Error creating sub-event: {e}")
            raise e
    
    async def get_ticket_tiers(self, event_id: int) -> List[Dict[str, Any]]:
        """Get all ticket tiers for an event"""
        try:
            async with self.get_connection() as conn:
                query = """
                SELECT * FROM "TicketTier" 
                WHERE "eventId" = $1 AND "isActive" = TRUE
                ORDER BY price ASC
                """
                rows = await conn.fetch(query, event_id)
                
                tiers = []
                for row in rows:
                    tier = dict(row)
                    
                    # Parse subEventPrices and subEventCapacities JSON if present
                    if tier.get('subEventPrices'):
                        import json
                        try:
                            tier['subEventPrices'] = json.loads(tier['subEventPrices'])
                        except (json.JSONDecodeError, TypeError):
                            tier['subEventPrices'] = None
                    else:
                        tier['subEventPrices'] = None
                    
                    if tier.get('subEventCapacities'):
                        import json
                        try:
                            tier['subEventCapacities'] = json.loads(tier['subEventCapacities'])
                        except (json.JSONDecodeError, TypeError):
                            tier['subEventCapacities'] = None
                    else:
                        tier['subEventCapacities'] = None
                    
                    tiers.append(tier)
                
                return tiers
        except Exception as e:
            print(f"Error getting ticket tiers: {e}")
            raise e
    
    async def get_available_ticket_tiers(self, event_id: int) -> List[Dict[str, Any]]:
        """Get available ticket tiers with automatic progression logic"""
        try:
            from datetime import datetime
            
            async with self.get_connection() as conn:
                # Get all tiers with current registration counts
                query = """
                SELECT 
                    tt.*,
                    COUNT(er.id) as registered_count,
                    (tt.capacity - COUNT(er.id)) as remaining_capacity
                FROM "TicketTier" tt
                LEFT JOIN "EventRegistration" er ON tt.id = er."ticketTierId"
                WHERE tt."eventId" = $1 AND tt."isActive" = TRUE
                GROUP BY tt.id
                ORDER BY tt.price ASC
                """
                rows = await conn.fetch(query, event_id)
                
                tiers = []
                current_time = datetime.now()
                
                for row in rows:
                    tier = dict(row)
                    
                    # Parse subEventPrices and subEventCapacities JSON if present
                    if tier.get('subEventPrices'):
                        import json
                        try:
                            tier['subEventPrices'] = json.loads(tier['subEventPrices'])
                        except (json.JSONDecodeError, TypeError):
                            tier['subEventPrices'] = None
                    else:
                        tier['subEventPrices'] = None
                    
                    if tier.get('subEventCapacities'):
                        import json
                        try:
                            tier['subEventCapacities'] = json.loads(tier['subEventCapacities'])
                        except (json.JSONDecodeError, TypeError):
                            tier['subEventCapacities'] = None
                    else:
                        tier['subEventCapacities'] = None
                    
                    # Check if tier is within date range
                    is_date_available = True
                    if tier['startDate'] and current_time < tier['startDate']:
                        is_date_available = False
                    if tier['endDate'] and current_time > tier['endDate']:
                        is_date_available = False
                    
                    # Check if tier has capacity
                    has_capacity = tier['remaining_capacity'] > 0
                    
                    # Tier is available if it's within date range AND has capacity
                    tier['isAvailable'] = is_date_available and has_capacity
                    tier['availabilityReason'] = ''
                    
                    # Debug: Log availability details
                    print(f"🔍 Tier '{tier['name']}' availability check:")
                    print(f"  - Date available: {is_date_available} (start: {tier['startDate']}, end: {tier['endDate']}, current: {current_time})")
                    print(f"  - Has capacity: {has_capacity} (remaining: {tier['remaining_capacity']}, total: {tier['capacity']})")
                    print(f"  - Final availability: {tier['isAvailable']}")
                    
                    if not is_date_available:
                        if tier['startDate'] and current_time < tier['startDate']:
                            tier['availabilityReason'] = 'Not yet available'
                        elif tier['endDate'] and current_time > tier['endDate']:
                            tier['availabilityReason'] = 'Registration period ended'
                    elif not has_capacity:
                        tier['availabilityReason'] = 'Sold out'
                    
                    tiers.append(tier)
                
                # Apply automatic progression logic: Early Bird → Regular
                # If Early Bird is sold out, automatically make Regular available
                if len(tiers) >= 2:
                    early_bird = next((t for t in tiers if t['name'].lower() == 'early bird'), None)
                    regular = next((t for t in tiers if t['name'].lower() == 'regular'), None)
                    
                    if early_bird and regular:
                        # If Early Bird is sold out, make Regular available regardless of date
                        if early_bird['remaining_capacity'] <= 0:
                            regular['isAvailable'] = True
                            regular['availabilityReason'] = 'Early Bird sold out - Regular now available'
                            print(f"🔄 Auto-progression: Early Bird sold out, Regular now available for event {event_id}")
                
                return tiers
        except Exception as e:
            print(f"Error getting available ticket tiers: {e}")
            raise e
    
    async def get_sub_events(self, event_id: int) -> List[Dict[str, Any]]:
        """Get all sub-events for an event"""
        try:
            async with self.get_connection() as conn:
                query = """
                SELECT * FROM "SubEvent" 
                WHERE "eventId" = $1
                ORDER BY price ASC
                """
                rows = await conn.fetch(query, event_id)
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error getting sub-events: {e}")
            raise e
    
    async def get_available_sub_events(self, event_id: int) -> List[Dict[str, Any]]:
        """Get available sub-events with capacity information"""
        try:
            async with self.get_connection() as conn:
                # Get all sub-events with current registration counts
                query = """
                SELECT 
                    se.*,
                    COUNT(er.id) as registered_count,
                    (se.capacity - COUNT(er.id)) as remaining_capacity
                FROM "SubEvent" se
                LEFT JOIN "EventRegistration" er ON se.id = er."subEventId"
                WHERE se."eventId" = $1
                GROUP BY se.id
                ORDER BY se.id ASC
                """
                rows = await conn.fetch(query, event_id)
                
                sub_events = []
                for row in rows:
                    sub_event = dict(row)
                    
                    # Check if sub-event has capacity
                    has_capacity = sub_event['remaining_capacity'] > 0
                    sub_event['isAvailable'] = has_capacity
                    sub_event['availabilityReason'] = 'Sold out' if not has_capacity else ''
                    
                    sub_events.append(sub_event)
                
                return sub_events
        except Exception as e:
            print(f"Error getting available sub-events: {e}")
            raise e
    
    async def get_available_capacity(self, tier_id: int = None, sub_event_id: int = None) -> int:
        """Get remaining capacity for a ticket tier or sub-event"""
        try:
            async with self.get_connection() as conn:
                if tier_id:
                    # Get ticket tier capacity and current registrations
                    tier_query = """
                    SELECT 
                        tt.capacity,
                        COUNT(er.id) as registered_count
                    FROM "TicketTier" tt
                    LEFT JOIN "EventRegistration" er ON tt.id = er."ticketTierId"
                    WHERE tt.id = $1
                    GROUP BY tt.capacity
                    """
                    row = await conn.fetchrow(tier_query, tier_id)
                    if row:
                        return row['capacity'] - row['registered_count']
                elif sub_event_id:
                    # Get sub-event capacity and current registrations
                    sub_event_query = """
                    SELECT 
                        se.capacity,
                        COUNT(er.id) as registered_count
                    FROM "SubEvent" se
                    LEFT JOIN "EventRegistration" er ON se.id = er."subEventId"
                    WHERE se.id = $1
                    GROUP BY se.capacity
                    """
                    row = await conn.fetchrow(sub_event_query, sub_event_id)
                    if row:
                        return row['capacity'] - row['registered_count']
                return 0
        except Exception as e:
            print(f"Error getting available capacity: {e}")
            return 0
    
    async def delete_ticket_tiers_by_event(self, event_id: int):
        """Delete all ticket tiers for an event"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    DELETE FROM "TicketTier" WHERE "eventId" = $1
                """, event_id)
        except Exception as e:
            print(f"Error deleting ticket tiers: {e}")
            raise e
    
    async def delete_sub_events_by_event(self, event_id: int):
        """Delete all sub-events for an event"""
        try:
            async with self.get_connection() as conn:
                await conn.execute("""
                    DELETE FROM "SubEvent" WHERE "eventId" = $1
                """, event_id)
        except Exception as e:
            print(f"Error deleting sub-events: {e}")
            raise e
    
    async def get_event_with_tiers_and_subevents(self, event_id: int) -> Dict[str, Any]:
        """Get event with its ticket tiers and sub-events"""
        try:
            async with self.get_connection() as conn:
                # Get the main event
                event_query = """
                SELECT * FROM "Event" WHERE id = $1
                """
                event_row = await conn.fetchrow(event_query, event_id)
                
                if not event_row:
                    return None
                
                event = dict(event_row)
                
                # Get ticket tiers
                tiers = await self.get_ticket_tiers(event_id)
                event['ticketTiers'] = tiers
                
                # Get sub-events
                sub_events = await self.get_sub_events(event_id)
                event['subEvents'] = sub_events
                
                return event
        except Exception as e:
            print(f"Error getting event with tiers and sub-events: {e}")
            raise e
    
    async def update_event(self, event_id: int, event_data: dict) -> Dict[str, Any]:
        """Update an existing event"""
        try:
            async with self.get_connection() as conn:
                query = """
                UPDATE "Event" 
                SET name = $1, description = $2, "targetYear" = $3, fee = $4, 
                    capacity = $5, date = $6, type = $7, image = $8, "refundDeadline" = $9, 
                    "isArchived" = $10, "isUofTOnly" = $11, "enableAdvancedTicketing" = $12, 
                    "enableSubEvents" = $13, "updatedAt" = NOW()
                WHERE id = $14
                RETURNING *
                """
                
                # Parse refundDeadline if provided, otherwise use event date
                refund_deadline = None
                if event_data.get("refundDeadline"):
                    refund_deadline = datetime.fromisoformat(event_data["refundDeadline"].replace('Z', '+00:00'))
                else:
                    refund_deadline = datetime.fromisoformat(event_data["date"].replace('Z', '+00:00'))
                
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
                    refund_deadline,
                    event_data.get("isArchived", False),
                    event_data.get("isUofTOnly", False),
                    event_data.get("enableAdvancedTicketing", False),
                    event_data.get("enableSubEvents", False),
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
            async with self.get_connection() as conn:
                result = await conn.execute(
                    'DELETE FROM "Event" WHERE id = $1',
                    event_id
                )
                return result == "DELETE 1"
        except Exception as e:
            print(f"❌ Error deleting event: {e}")
            raise e
    
    async def register_for_event_advanced(self, user_id: int, event_id: int, payment_id: str = None, 
                                       ticket_tier_id: int = None, sub_event_id: int = None, 
                                       final_price: float = None, payment_email: str = None) -> Dict[str, Any]:
        """Register a user for an event with advanced ticketing support"""
        try:
            async with self.get_connection() as conn:
                # Check if event exists
                event = await conn.fetchrow(
                    'SELECT * FROM "Event" WHERE id = $1',
                    event_id
                )
                
                if not event:
                    raise Exception("Event not found")
                
                # Check if user is already registered for this event
                existing = await conn.fetchrow(
                    'SELECT * FROM "EventRegistration" WHERE "userId" = $1 AND "eventId" = $2',
                    user_id, event_id
                )
                
                if existing:
                    raise Exception("User already registered for this event")
                
                # Validate ticket tier if provided
                if ticket_tier_id:
                    tier = await conn.fetchrow(
                        'SELECT * FROM "TicketTier" WHERE id = $1 AND "eventId" = $2',
                        ticket_tier_id, event_id
                    )
                    if not tier:
                        raise Exception("Invalid ticket tier")
                    
                    # Check tier capacity
                    tier_registrations = await conn.fetchval(
                        'SELECT COUNT(*) FROM "EventRegistration" WHERE "ticketTierId" = $1',
                        ticket_tier_id
                    )
                    if tier_registrations >= tier['capacity']:
                        raise Exception("Ticket tier is full")
                
                # Validate sub-event if provided
                if sub_event_id:
                    sub_event = await conn.fetchrow(
                        'SELECT * FROM "SubEvent" WHERE id = $1 AND "eventId" = $2',
                        sub_event_id, event_id
                    )
                    if not sub_event:
                        raise Exception("Invalid sub-event")
                    
                    # Check sub-event capacity
                    sub_event_registrations = await conn.fetchval(
                        'SELECT COUNT(*) FROM "EventRegistration" WHERE "subEventId" = $1',
                        sub_event_id
                    )
                    if sub_event_registrations >= sub_event['capacity']:
                        raise Exception("Sub-event is full")
                
                # Check overall event capacity if no specific tier/sub-event capacity constraints
                if not ticket_tier_id and not sub_event_id:
                    registration_count = await conn.fetchval(
                        'SELECT COUNT(*) FROM "EventRegistration" WHERE "eventId" = $1',
                        event_id
                    )
                    if registration_count >= event['capacity']:
                        raise Exception("Event is full")
                
                # Create registration with advanced ticketing data
                print(f"🔍 Inserting advanced registration: user_id={user_id}, event_id={event_id}, tier_id={ticket_tier_id}, sub_event_id={sub_event_id}, final_price={final_price}, payment_email={payment_email}")
                registration = await conn.fetchrow("""
                    INSERT INTO "EventRegistration" ("userId", "eventId", "ticketTierId", "subEventId", "finalPrice", "paymentStatus", "paymentId", "paymentEmail")
                    VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7)
                    RETURNING *
                """, user_id, event_id, ticket_tier_id, sub_event_id, final_price, payment_id, payment_email)
                print(f"✅ Advanced registration created with ID: {registration['id']}")
                
                return {
                    'id': registration['id'],
                    'userId': registration['userId'],
                    'eventId': registration['eventId'],
                    'ticketTierId': registration['ticketTierId'],
                    'subEventId': registration['subEventId'],
                    'finalPrice': float(registration['finalPrice']) if registration['finalPrice'] else None,
                    'registeredAt': registration['registeredAt'].isoformat(),
                    'paymentStatus': registration['paymentStatus'],
                    'paymentId': registration['paymentId'],
                    'paymentEmail': registration['paymentEmail']
                }
        except Exception as e:
            print(f"❌ Error in advanced registration: {e}")
            raise e
    
    async def register_for_event(self, user_id: int, event_id: int, payment_id: str = None, payment_email: str = None) -> Dict[str, Any]:
        """Register a user for an event"""
        try:
            async with self.get_connection() as conn:
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
                print(f"🔍 Inserting registration: user_id={user_id}, event_id={event_id}, payment_id={payment_id}, payment_email={payment_email}")
                registration = await conn.fetchrow("""
                    INSERT INTO "EventRegistration" ("userId", "eventId", "paymentStatus", "paymentId", "paymentEmail")
                    VALUES ($1, $2, 'completed', $3, $4)
                    RETURNING *
                """, user_id, event_id, payment_id, payment_email)
                print(f"✅ Registration created with paymentId: {registration['paymentId']}")
                
                return {
                    'id': registration['id'],
                    'userId': registration['userId'],
                    'eventId': registration['eventId'],
                    'registeredAt': registration['registeredAt'].isoformat(),
                    'paymentStatus': registration['paymentStatus'],
                    'paymentId': registration['paymentId'],
                    'fee': float(event['fee'])
                }
        except Exception as e:
            print(f"❌ Error registering for event: {e}")
            raise e

    async def get_payment_id_for_registration(self, user_id: int, event_id: int) -> Optional[str]:
        """Get the payment ID for a user's event registration"""
        try:
            async with self.get_connection() as conn:
                print(f"🔍 Looking for payment ID: user_id={user_id}, event_id={event_id}")
                result = await conn.fetchrow("""
                    SELECT "paymentId" FROM "EventRegistration" 
                    WHERE "userId" = $1 AND "eventId" = $2
                """, user_id, event_id)
                print(f"🔍 Query result: {result}")
                
                if result and result['paymentId']:
                    print(f"✅ Found payment ID {result['paymentId']} for user {user_id}, event {event_id}")
                    return result['paymentId']
                else:
                    print(f"⚠️ No payment ID found for user {user_id}, event {event_id}")
                    return None
                    
        except Exception as e:
            print(f"❌ Error getting payment ID: {e}")
            return None

    async def get_payment_email_for_registration(self, user_id: int, event_id: int) -> Optional[str]:
        """Get the payment email for a user's event registration"""
        try:
            async with self.get_connection() as conn:
                print(f"🔍 Looking for payment email: user_id={user_id}, event_id={event_id}")
                result = await conn.fetchrow("""
                    SELECT "paymentEmail" FROM "EventRegistration" 
                    WHERE "userId" = $1 AND "eventId" = $2
                """, user_id, event_id)
                print(f"🔍 Query result: {result}")
                
                if result and result['paymentEmail']:
                    print(f"✅ Found payment email {result['paymentEmail']} for user {user_id}, event {event_id}")
                    return result['paymentEmail']
                else:
                    print(f"⚠️ No payment email found for user {user_id}, event {event_id}")
                    return None
        except Exception as e:
            print(f"❌ Error getting payment email: {e}")
            return None
    
    async def cancel_registration(self, user_id: int, event_id: int) -> bool:
        """Cancel a user's registration for an event"""
        try:
            async with self.get_connection() as conn:
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
            async with self.get_connection() as conn:
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

    async def get_event_registrations_detailed(self, event_id: int) -> List[Dict[str, Any]]:
        """Get detailed registrations for an event including user and ticket info"""
        try:
            async with self.get_connection() as conn:
                query = """
                SELECT 
                    er.id AS registration_id,
                    er."registeredAt" AS registered_at,
                    er."paymentStatus" AS payment_status,
                    er."paymentId" AS payment_id,
                    er."finalPrice" AS final_price,
                    er."paymentEmail" AS payment_email,
                    u.id AS user_id,
                    u."firstName" AS first_name,
                    u."lastName" AS last_name,
                    u.email AS user_email,
                    u.major AS user_major,
                    u."graduationYear" AS graduation_year,
                    u."currentYear" AS current_year,
                    u.university AS university,
                    tt.name AS tier_name,
                    se.name AS sub_event_name
                FROM "EventRegistration" er
                JOIN "User" u ON er."userId" = u.id
                LEFT JOIN "TicketTier" tt ON er."ticketTierId" = tt.id
                LEFT JOIN "SubEvent" se ON er."subEventId" = se.id
                WHERE er."eventId" = $1
                ORDER BY er."registeredAt" ASC
                """
                rows = await conn.fetch(query, event_id)
                result: List[Dict[str, Any]] = []
                for r in rows:
                    d = dict(r)
                    # Normalize types for JSON/CSV friendliness
                    if d.get('registered_at'):
                        d['registered_at'] = d['registered_at'].isoformat()
                    if d.get('final_price') is not None:
                        try:
                            d['final_price'] = float(d['final_price'])
                        except Exception:
                            pass
                    result.append(d)
                return result
        except Exception as e:
            print(f"❌ Error getting detailed registrations: {e}")
            raise e 