# authentication/use_case/event/event_controller.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from authentication.data_access.event_repository import EventRepository

event_router = APIRouter(prefix="/events", tags=["events"])

class EventRequest(BaseModel):
    name: str
    description: str
    targetYear: str
    fee: float = 0
    capacity: int
    date: str  # ISO format
    type: str
    image: Optional[str] = None
    refundDeadline: Optional[str] = None  # ISO format
    isArchived: bool = False
    isUofTOnly: bool = False

class EventRegistrationRequest(BaseModel):
    userId: int
    paymentId: Optional[str] = None

# Dummy payment simulation
async def simulate_payment(amount: float) -> bool:
    """Simulate payment processing with 95% success rate"""
    import asyncio
    import random
    
    # Simulate payment processing delay
    await asyncio.sleep(1)
    
    # Simulate 95% success rate
    is_successful = random.random() > 0.05
    
    print(f"💳 Dummy payment processing: ${amount} - {'SUCCESS' if is_successful else 'FAILED'}")
    
    return is_successful

@event_router.get("")
async def get_all_events(user_email: Optional[str] = None):
    """Get all events, filtered by user's university if provided"""
    try:
        print(f"📅 Getting all events for user: {user_email}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            await event_repo.ensure_tables_exist()
            
            # If user_email is provided, get user info to check university and current year
            user_university = None
            user_current_year = None
            if user_email:
                from authentication.data_access.user_repository import UserRepository
                user_repo = UserRepository()
                await user_repo.connect()
                try:
                    user = await user_repo.get_user_by_email(user_email)
                    if user:
                        user_university = user.get('university', 'University of Toronto')
                        user_current_year = user.get('currentYear', '1st year')
                        print(f"🎓 User university: {user_university}, current year: {user_current_year}")
                    else:
                        print(f"⚠️ User not found: {user_email}")
                finally:
                    await user_repo.disconnect()
            
            events = await event_repo.get_all_events()
            
            # Filter events based on user's university and current year
            if user_university or user_current_year:
                filtered_events = []
                for event in events:
                    # If event is UofT-only and user is not from UofT, skip it
                    if event.get('isUofTOnly', False) and user_university != 'University of Toronto':
                        print(f"🚫 Skipping UofT-only event '{event['name']}' for non-UofT user")
                        continue
                    
                    # If event has specific target years, check if user's current year matches
                    target_year = event.get('targetYear', 'All years')
                    if target_year != 'All years' and user_current_year:
                        # Check if user's current year is in the target years
                        target_years = [year.strip() for year in target_year.split(',')]
                        if user_current_year not in target_years:
                            print(f"🚫 Skipping year-restricted event '{event['name']}' (target: {target_year}, user: {user_current_year})")
                            continue
                    
                    filtered_events.append(event)
                events = filtered_events
                print(f"✅ Filtered to {len(events)} events for {user_university} user (year: {user_current_year})")
            else:
                print(f"✅ Retrieved {len(events)} events (no user filter)")
            
            await event_repo.disconnect()
            
            # Convert datetime objects to ISO strings for JSON serialization
            for event in events:
                if event.get('date'):
                    event['date'] = event['date'].isoformat()
                if event.get('refundDeadline'):
                    event['refundDeadline'] = event['refundDeadline'].isoformat()
                if event.get('createdAt'):
                    event['createdAt'] = event['createdAt'].isoformat()
                if event.get('updatedAt'):
                    event['updatedAt'] = event['updatedAt'].isoformat()
            
            return events
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error getting events: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve events: {str(e)}")

@event_router.post("")
async def create_event(event_data: EventRequest):
    """Create a new event"""
    try:
        print(f"🆕 Creating event: {event_data.name}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            await event_repo.ensure_tables_exist()
            event = await event_repo.create_event(event_data.dict())
            await event_repo.disconnect()
            
            # Convert datetime objects to ISO strings
            if event.get('date'):
                event['date'] = event['date'].isoformat()
            if event.get('createdAt'):
                event['createdAt'] = event['createdAt'].isoformat()
            if event.get('updatedAt'):
                event['updatedAt'] = event['updatedAt'].isoformat()
            
            print(f"✅ Created event: {event['name']} (ID: {event['id']})")
            return event
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error creating event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create event: {str(e)}")

@event_router.get("/{event_id}")
async def get_event_by_id(event_id: int):
    """Get event by ID"""
    try:
        print(f"🔍 Getting event by ID: {event_id}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            event = await event_repo.get_event_by_id(event_id)
            await event_repo.disconnect()
            
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Convert datetime objects to ISO strings
            if event.get('date'):
                event['date'] = event['date'].isoformat()
            if event.get('createdAt'):
                event['createdAt'] = event['createdAt'].isoformat()
            if event.get('updatedAt'):
                event['updatedAt'] = event['updatedAt'].isoformat()
            
            print(f"✅ Retrieved event: {event['name']}")
            return event
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error getting event by ID: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to retrieve event: {str(e)}")

@event_router.put("/{event_id}")
async def update_event(event_id: int, event_data: EventRequest):
    """Update an event"""
    try:
        print(f"✏️ Updating event ID: {event_id}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            event = await event_repo.update_event(event_id, event_data.dict())
            await event_repo.disconnect()
            
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Convert datetime objects to ISO strings
            if event.get('date'):
                event['date'] = event['date'].isoformat()
            if event.get('createdAt'):
                event['createdAt'] = event['createdAt'].isoformat()
            if event.get('updatedAt'):
                event['updatedAt'] = event['updatedAt'].isoformat()
            
            print(f"✅ Updated event: {event['name']}")
            return event
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error updating event: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to update event: {str(e)}")

@event_router.delete("/{event_id}")
async def delete_event(event_id: int):
    """Delete an event"""
    try:
        print(f"🗑️ Deleting event ID: {event_id}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            success = await event_repo.delete_event(event_id)
            await event_repo.disconnect()
            
            if not success:
                raise HTTPException(status_code=404, detail="Event not found")
            
            print(f"✅ Deleted event ID: {event_id}")
            return {"message": "Event deleted successfully"}
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error deleting event: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)}")

@event_router.post("/{event_id}/register")
async def register_for_event(event_id: int, registration_data: EventRegistrationRequest):
    """Register for an event"""
    try:
        print(f"📝 Registering user {registration_data.userId} for event {event_id}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            # Ensure tables exist (important for paymentId column migration)
            await event_repo.ensure_tables_exist()
            
            # Get event to check fee
            event = await event_repo.get_event_by_id(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Simulate payment processing
            payment_successful = await simulate_payment(float(event['fee']))
            
            if not payment_successful:
                raise HTTPException(status_code=400, detail="Payment failed")
            
            # Register user
            registration = await event_repo.register_for_event(
                registration_data.userId, 
                event_id, 
                registration_data.paymentId
            )
            await event_repo.disconnect()
            
            print(f"✅ Registration successful for user {registration_data.userId}")
            return {
                "message": "Registration successful",
                "registration": registration,
                "paymentAmount": registration['fee']
            }
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error registering for event: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to register for event: {str(e)}")

@event_router.delete("/{event_id}/register")
async def cancel_registration(event_id: int, registration_data: EventRegistrationRequest):
    """Cancel registration for an event"""
    try:
        print(f"❌ Canceling registration for user {registration_data.userId} from event {event_id}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            success = await event_repo.cancel_registration(registration_data.userId, event_id)
            await event_repo.disconnect()
            
            if not success:
                raise HTTPException(status_code=404, detail="Registration not found")
            
            print(f"✅ Registration cancelled for user {registration_data.userId}")
            return {"message": "Registration cancelled successfully"}
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error canceling registration: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to cancel registration: {str(e)}")

@event_router.get("/{event_id}/payment-id")
async def get_payment_id_for_event(event_id: int, userId: int):
    """Get payment ID for a user's event registration (used before cancellation for refunds)"""
    try:
        print(f"🔍 Getting payment ID for user {userId}, event {event_id}")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            await event_repo.ensure_tables_exist()
            
            payment_id = await event_repo.get_payment_id_for_registration(userId, event_id)
            await event_repo.disconnect()
            
            if payment_id:
                print(f"✅ Found payment ID for user {userId}, event {event_id}")
                return {
                    "success": True,
                    "paymentId": payment_id
                }
            else:
                print(f"⚠️ No payment ID found for user {userId}, event {event_id}")
                return {
                    "success": False,
                    "paymentId": None,
                    "message": "No payment ID found"
                }
                
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error getting payment ID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get payment ID: {str(e)}")

@event_router.post("/seed")
async def seed_events():
    """Seed sample events"""
    try:
        print("🌱 Seeding sample events...")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            await event_repo.ensure_tables_exist()
            await event_repo.seed_sample_events()
            await event_repo.disconnect()
            
            print("✅ Events seeded successfully")
            return {"message": "Events seeded successfully"}
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Error seeding events: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to seed events: {str(e)}")

@event_router.get("/test")
async def test_event_system():
    """Test the event system"""
    try:
        print("🧪 Testing event system...")
        
        event_repo = EventRepository()
        await event_repo.connect()
        
        try:
            await event_repo.ensure_tables_exist()
            stats = await event_repo.get_system_stats()
            await event_repo.disconnect()
            
            print("✅ Event system test completed successfully")
            return {
                "status": "success",
                "message": "Event system is working properly",
                "statistics": stats
            }
            
        except Exception as e:
            await event_repo.disconnect()
            raise e
            
    except Exception as e:
        print(f"❌ Event system test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Event system test failed: {str(e)}") 