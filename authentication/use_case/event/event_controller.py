# authentication/use_case/event/event_controller.py
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from authentication.data_access.event_repository import EventRepository
from fastapi.responses import StreamingResponse
import io
import csv

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
    enableAdvancedTicketing: bool = False  # Enable pricing tiers
    enableSubEvents: bool = False  # Enable sub-events
    ticketTiers: Optional[List[dict]] = []  # Ticket tier configurations
    subEvents: Optional[List[dict]] = []  # Sub-event configurations
    url: Optional[str] = None  # External URL for event registration

class TicketTierRequest(BaseModel):
    eventId: int
    name: str  # "Early Bird", "Regular", "Walk-in"
    price: float
    capacity: int
    targetYear: str = "All years"  # Target year for this specific tier
    startDate: Optional[str] = None  # ISO format
    endDate: Optional[str] = None  # ISO format
    isActive: bool = True
    subEventPrices: Optional[List[float]] = None  # For complex pricing with sub-events

class SubEventRequest(BaseModel):
    eventId: int
    name: str  # "1st Party", "2nd Party", "Combined"
    description: Optional[str] = None
    price: float
    capacity: int
    isStandalone: bool = True   # Can be purchased alone
    isComboOption: bool = False  # Part of a combo ticket

class EventRegistrationRequest(BaseModel):
    userId: int
    paymentId: Optional[str] = None
    tierId: Optional[int] = None
    subEventIds: Optional[List[int]] = None
    creditsUsed: Optional[float] = 0
    finalPrice: Optional[float] = None
    paymentEmail: Optional[str] = None  # Email used for payment (should match user account email)
    reservationId: Optional[str] = None  # Reservation ID to convert to registration

# Dummy payment simulation
async def simulate_payment(amount: float) -> bool:
    """Simulate payment processing with 100% success rate for testing"""
    import asyncio
    
    # Simulate payment processing delay
    await asyncio.sleep(0.5)
    
    # Always succeed for testing
    is_successful = True
    
    print(f"💳 Dummy payment processing: ${amount} - {'SUCCESS' if is_successful else 'FAILED'}")
    
    return is_successful

async def verify_square_payment(payment_id: str, expected_amount: float) -> bool:
    """Verify Square payment using payment ID"""
    try:
        import requests
        import os
        
        square_token = os.environ.get('SQUARE_ACCESS_TOKEN')
        if not square_token:
            print(f"❌ SQUARE_ACCESS_TOKEN not found")
            return False
        
        # Determine if sandbox or production
        base_url = 'https://connect.squareupsandbox.com/v2' if 'sandbox' in square_token else 'https://connect.squareup.com/v2'
        
        headers = {
            'Authorization': f'Bearer {square_token}',
            'Square-Version': '2024-07-17',
            'Content-Type': 'application/json'
        }
        
        url = f"{base_url}/payments/{payment_id}"
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            payment_data = response.json()
            payment = payment_data.get('payment', {})
            
            # Check payment status
            if payment.get('status') != 'COMPLETED':
                print(f"❌ Payment {payment_id} status is {payment.get('status')}, expected COMPLETED")
                return False
            
            # Check payment amount
            amount_money = payment.get('amount_money', {})
            actual_amount = amount_money.get('amount', 0) / 100  # Convert from cents
            currency = amount_money.get('currency', 'CAD')
            
            if abs(actual_amount - expected_amount) > 0.01:  # Allow for small rounding differences
                print(f"❌ Payment {payment_id} amount mismatch: expected ${expected_amount}, got ${actual_amount} {currency}")
                return False
            
            print(f"✅ Payment {payment_id} verified: ${actual_amount} {currency}, status: {payment.get('status')}")
            return True
        else:
            print(f"❌ Failed to verify Square payment {payment_id}: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying Square payment {payment_id}: {e}")
        return False

@event_router.get("")
async def get_all_events(user_email: Optional[str] = None):
    """Get all events, filtered by user's university if provided"""
    try:
        print(f"📅 Getting all events for user: {user_email}")
        
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            
            # If user_email is provided, get user info to check university and current year
            user_university = None
            user_current_year = None
            if user_email:
                from authentication.data_access.user_repository import UserRepository
                user_repo = UserRepository()
                try:
                    user = await user_repo.get_user_by_email(user_email)
                    if user:
                        user_university = user.get('university', 'University of Toronto')
                        user_current_year = user.get('currentYear', '1st year')
                        print(f"🎓 User university: {user_university}, current year: {user_current_year}")
                    else:
                        print(f"⚠️ User not found: {user_email}")
                finally:
                    pass
            
            events = await event_repo.get_all_events()
            
            # Debug: Check pricing configuration for each event
            for event in events:
                print(f"📊 Event '{event['name']}': enableAdvancedTicketing={event.get('enableAdvancedTicketing')}, enableSubEvents={event.get('enableSubEvents')}")
                if event.get('enableAdvancedTicketing'):
                    print(f"🎫 Event '{event['name']}' has advanced ticketing enabled")
                    if event.get('ticketTiers'):
                        for tier in event['ticketTiers']:
                            print(f"  🎫 Tier '{tier['name']}': price={tier.get('price')}, subEventPrices={tier.get('subEventPrices')}")
                if event.get('enableSubEvents'):
                    print(f"🎊 Event '{event['name']}' has sub-events enabled")
                    if event.get('subEvents'):
                        for subEvent in event['subEvents']:
                            print(f"  🎊 SubEvent '{subEvent['name']}': price={subEvent.get('price')}, capacity={subEvent.get('capacity')}")
            
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
            raise e
            
    except Exception as e:
        print(f"❌ Error getting events: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve events: {str(e)}")

@event_router.post("")
async def create_event(event_data: EventRequest):
    """Create a new event"""
    try:
        print(f"🆕 Creating event: {event_data.name}")
        print(f"📊 Event data: enableAdvancedTicketing={event_data.enableAdvancedTicketing}, enableSubEvents={event_data.enableSubEvents}")
        print(f"🎫 Ticket tiers count: {len(event_data.ticketTiers or [])}")
        print(f"🎊 Sub-events count: {len(event_data.subEvents or [])}")
        
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            
            # Create the main event first
            event_dict = event_data.dict()
            ticket_tiers = event_dict.pop('ticketTiers', [])
            sub_events = event_dict.pop('subEvents', [])
            
            print(f"🎫 Processing ticket tiers: {ticket_tiers}")
            print(f"🎊 Processing sub-events: {sub_events}")
            
            event = await event_repo.create_event(event_dict)
            event_id = event['id']
            
            # Create ticket tiers if advanced ticketing is enabled
            if event_data.enableAdvancedTicketing and ticket_tiers:
                print(f"🎫 Creating {len(ticket_tiers)} ticket tiers for event {event_id}")
                for tier_data in ticket_tiers:
                    tier_data['eventId'] = event_id
                    print(f"🎫 Creating tier: {tier_data}")
                    await event_repo.create_ticket_tier(tier_data)
            elif event_data.enableAdvancedTicketing:
                print(f"⚠️ Advanced ticketing enabled but no ticket tiers provided")
            
            # Create sub-events if sub-events are enabled
            if event_data.enableSubEvents and sub_events:
                print(f"🎊 Creating {len(sub_events)} sub-events for event {event_id}")
                for sub_event_data in sub_events:
                    sub_event_data['eventId'] = event_id
                    print(f"🎊 Creating sub-event: {sub_event_data}")
                    await event_repo.create_sub_event(sub_event_data)
            elif event_data.enableSubEvents:
                print(f"⚠️ Sub-events enabled but no sub-events provided")
            
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
        try:
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Convert datetime objects to ISO strings
            if event.get('date'):
                event['date'] = event['date'].isoformat()
            if event.get('createdAt'):
                event['createdAt'] = event['createdAt'].isoformat()
            if event.get('updatedAt'):
                event['updatedAt'] = event['updatedAt'].isoformat()
            if event.get('refundDeadline'):
                event['refundDeadline'] = event['refundDeadline'].isoformat()
            
            # Convert datetime fields in ticket tiers
            for tier in event.get('ticketTiers', []):
                if tier.get('startDate'):
                    tier['startDate'] = tier['startDate'].isoformat()
                if tier.get('endDate'):
                    tier['endDate'] = tier['endDate'].isoformat()
            
            print(f"✅ Retrieved event with tiers and sub-events: {event['name']}")
            return event
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting event by ID: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to retrieve event: {str(e)}")

@event_router.get("/{event_id}/export_csv")
async def export_event_registrations_csv(event_id: int):
    """Export event participants as CSV"""
    try:
        repo = EventRepository()
        await repo.ensure_tables_exist()
        # Verify event exists
        event = await repo.get_event_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        rows = await repo.get_event_registrations_detailed(event_id)

        # Prepare CSV with only requested columns
        output = io.StringIO()
        writer = csv.writer(output)
        header = [
            "first_name",
            "last_name",
            "user_email",
            "user_major",
            "graduation_year",
            "current_year",
            "university",
        ]
        writer.writerow(header)
        for r in rows:
            writer.writerow([
                r.get("first_name"),
                r.get("last_name"),
                r.get("user_email"),
                r.get("user_major"),
                r.get("graduation_year"),
                r.get("current_year"),
                r.get("university"),
            ])

        output.seek(0)
        filename = f"event_{event_id}_participants.csv"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\""
            },
        )
    except Exception as e:
        print(f"❌ Error exporting CSV: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to export CSV")

@event_router.put("/{event_id}")
async def update_event(event_id: int, event_data: EventRequest):
    """Update an event"""
    try:
        print(f"✏️ Updating event ID: {event_id}")
        
        event_repo = EventRepository()
        try:
            # Update the main event first
            event_dict = event_data.dict()
            ticket_tiers = event_dict.pop('ticketTiers', [])
            sub_events = event_dict.pop('subEvents', [])
            
            event = await event_repo.update_event(event_id, event_dict)
            
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Delete existing ticket tiers and sub-events, then recreate them
            await event_repo.delete_ticket_tiers_by_event(event_id)
            await event_repo.delete_sub_events_by_event(event_id)
            
            # Create new ticket tiers if advanced ticketing is enabled
            if event_data.enableAdvancedTicketing and ticket_tiers:
                for tier_data in ticket_tiers:
                    tier_data['eventId'] = event_id
                    await event_repo.create_ticket_tier(tier_data)
            
            # Create new sub-events if sub-events are enabled
            if event_data.enableSubEvents and sub_events:
                for sub_event_data in sub_events:
                    sub_event_data['eventId'] = event_id
                    await event_repo.create_sub_event(sub_event_data)
            
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
        try:
            success = await event_repo.delete_event(event_id)
            if not success:
                raise HTTPException(status_code=404, detail="Event not found")
            
            print(f"✅ Deleted event ID: {event_id}")
            return {"message": "Event deleted successfully"}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error deleting event: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to delete event: {str(e)}")

@event_router.post("/{event_id}/reserve")
async def reserve_event_registration(event_id: int, registration_data: EventRegistrationRequest):
    """Reserve a spot for event registration (without payment)"""
    try:
        print(f"🎫 Reserving spot for user {registration_data.userId} for event {event_id}")
        print(f"🎫 Reservation details: tier={registration_data.tierId}, subEvents={registration_data.subEventIds}")
        
        event_repo = EventRepository()
        try:
            # Ensure tables exist
            await event_repo.ensure_tables_exist()
            
            # Get event to check configuration and availability
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Check capacity BEFORE any payment processing
            registration_count = await event_repo.get_registration_count(event_id)
            if registration_count >= event['capacity']:
                raise HTTPException(status_code=400, detail="Event is full")
            
            # Check if user is already registered
            existing = await event_repo.check_existing_registration(registration_data.userId, event_id)
            if existing:
                raise HTTPException(status_code=400, detail="User already registered for this event")
            
            # Validate advanced ticketing selections
            if registration_data.tierId:
                tier_capacity = await event_repo.get_available_capacity(tier_id=registration_data.tierId)
                if tier_capacity <= 0:
                    raise HTTPException(status_code=400, detail="Selected ticket tier is no longer available")
            
            if registration_data.subEventIds:
                for sub_event_id in registration_data.subEventIds:
                    sub_event_capacity = await event_repo.get_available_capacity(sub_event_id=sub_event_id)
                    if sub_event_capacity <= 0:
                        raise HTTPException(status_code=400, detail=f"Sub-event {sub_event_id} is no longer available")
            
            # Create a temporary reservation (without payment)
            reservation_id = await event_repo.create_reservation(
                user_id=registration_data.userId,
                event_id=event_id,
                tier_id=registration_data.tierId,
                sub_event_ids=registration_data.subEventIds,
                final_price=registration_data.finalPrice,
                payment_email=registration_data.paymentEmail
            )
            
            print(f"✅ Reservation created for user {registration_data.userId}: {reservation_id}")
            return {
                "message": "Registration spot reserved successfully",
                "reservationId": reservation_id,
                "expiresAt": (datetime.now() + timedelta(minutes=15)).isoformat()  # 15 minute reservation
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error creating reservation: {e}")
        error_message = str(e)
        
        # Provide user-friendly error messages
        if "Event is full" in error_message:
            raise HTTPException(status_code=400, detail="Sorry, this event is now full. Please try another event or check back later.")
        elif "capacity" in error_message.lower():
            raise HTTPException(status_code=400, detail="This event has reached its capacity limit. Please try another event.")
        else:
            raise HTTPException(status_code=500, detail="Unable to reserve a spot at this time. Please try again.")

@event_router.post("/{event_id}/register")
async def register_for_event(event_id: int, registration_data: EventRegistrationRequest):
    """Register for an event with support for advanced ticketing"""
    try:
        print(f"📝 Registering user {registration_data.userId} for event {event_id}")
        print(f"🎫 Registration details: tier={registration_data.tierId}, subEvents={registration_data.subEventIds}")
        
        event_repo = EventRepository()
        try:
            # Ensure tables exist (important for paymentId column migration)
            await event_repo.ensure_tables_exist()
            
            # Get event to check configuration and availability
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Get user email and ensure payment email is set
            user_email = await event_repo.get_user_email(registration_data.userId)
            if not user_email:
                raise HTTPException(status_code=400, detail="User email not found")
            
            # Use user email as payment email (unified approach)
            if not registration_data.paymentEmail:
                registration_data.paymentEmail = user_email
            elif registration_data.paymentEmail != user_email:
                print(f"⚠️ Payment email mismatch: user_email={user_email}, payment_email={registration_data.paymentEmail}")
                # For security, use user's account email instead
                registration_data.paymentEmail = user_email
            
            # Validate advanced ticketing selections
            if registration_data.tierId:
                # Check if ticket tier exists and is available
                tier_capacity = await event_repo.get_available_capacity(tier_id=registration_data.tierId)
                if tier_capacity <= 0:
                    raise HTTPException(status_code=400, detail="Selected ticket tier is no longer available")
            
            if registration_data.subEventIds:
                # Check if sub-events exist and are available
                for sub_event_id in registration_data.subEventIds:
                    sub_event_capacity = await event_repo.get_available_capacity(sub_event_id=sub_event_id)
                    if sub_event_capacity <= 0:
                        raise HTTPException(status_code=400, detail=f"Sub-event {sub_event_id} is no longer available")
            
            # Determine payment amount - use finalPrice if provided (credits already applied), otherwise use event fee
            if registration_data.finalPrice is not None:
                payment_amount = float(registration_data.finalPrice)
                print(f"💰 Using provided final price: ${payment_amount} (credits applied: ${registration_data.creditsUsed})")
            else:
                payment_amount = float(event['fee'])
                # Apply credits if provided but no finalPrice
                if registration_data.creditsUsed > 0:
                    payment_amount = max(0, payment_amount - registration_data.creditsUsed)
                    print(f"💰 Applied ${registration_data.creditsUsed} credits. Final amount: ${payment_amount}")
                else:
                    print(f"💰 Using standard event fee: ${payment_amount}")
            
            # Verify actual Square payment if amount > 0
            if payment_amount > 0:
                if not registration_data.paymentId:
                    # If payment amount > 0 but no payment ID, user may have paid but registration failed
                    # Process automatic refund to be safe
                    if payment_amount > 0:
                        print(f"🔄 Payment amount > 0 but no payment ID. Processing automatic refund...")
                        try:
                            from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                            refund_repo = UnregisteredPaymentsRepository()
                            
                            # Get user email for refund
                            user_email = await event_repo.get_user_email(registration_data.userId)
                            if user_email:
                                # Use a placeholder payment ID for refund processing
                                refund_result = await refund_repo.process_automatic_refund(
                                    payment_id="NO_PAYMENT_ID_PROVIDED",
                                    amount=payment_amount,
                                    email=user_email,
                                    reason="Payment ID missing but amount > 0 - potential payment without registration"
                                )
                                
                                if refund_result.get("success"):
                                    print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                                else:
                                    print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                            else:
                                print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                                
                        except Exception as refund_error:
                            print(f"❌ Error processing automatic refund: {refund_error}")
                    
                    raise HTTPException(status_code=400, detail="Payment ID is required for paid events")
                
                # Verify the Square payment
                payment_verified = await verify_square_payment(registration_data.paymentId, payment_amount)
                if not payment_verified:
                    # Payment verification failed - process automatic refund
                    print(f"🔄 Payment verification failed. Processing automatic refund...")
                    try:
                        from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                        refund_repo = UnregisteredPaymentsRepository()
                        
                        # Get user email for refund
                        user_email = await event_repo.get_user_email(registration_data.userId)
                        if user_email:
                            refund_result = await refund_repo.process_automatic_refund(
                                payment_id=registration_data.paymentId,
                                amount=payment_amount,
                                email=user_email,
                                reason="Payment verification failed after successful payment"
                            )
                            
                            if refund_result.get("success"):
                                print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                            else:
                                print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                        else:
                            print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                            
                    except Exception as refund_error:
                        print(f"❌ Error processing automatic refund: {refund_error}")
                    
                    raise HTTPException(status_code=400, detail="Payment verification failed")
            
            # Convert reservation to registration if reservation ID is provided
            if registration_data.reservationId:
                print(f"🔄 Converting reservation {registration_data.reservationId} to registration")
                try:
                    # Verify reservation exists and belongs to user
                    reservation = await event_repo.get_reservation(registration_data.reservationId, registration_data.userId)
                    if not reservation:
                        # Invalid reservation - if payment was processed, refund it
                        if registration_data.paymentId and payment_amount > 0:
                            print(f"🔄 Invalid reservation but payment was processed. Processing automatic refund...")
                            try:
                                from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                                refund_repo = UnregisteredPaymentsRepository()
                                
                                # Get user email for refund
                                user_email = await event_repo.get_user_email(registration_data.userId)
                                if user_email:
                                    refund_result = await refund_repo.process_automatic_refund(
                                        payment_id=registration_data.paymentId,
                                        amount=payment_amount,
                                        email=user_email,
                                        reason="Invalid reservation but payment was processed"
                                    )
                                    
                                    if refund_result.get("success"):
                                        print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                                    else:
                                        print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                                else:
                                    print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                                    
                            except Exception as refund_error:
                                print(f"❌ Error processing automatic refund: {refund_error}")
                        
                        raise HTTPException(status_code=400, detail="Invalid or expired reservation")
                    
                    # Convert reservation to registration
                    registration = await event_repo.convert_reservation_to_registration(
                        reservation_id=registration_data.reservationId,
                        payment_id=registration_data.paymentId,
                        payment_email=registration_data.paymentEmail
                    )
                    additional_registrations = []
                    
                except Exception as e:
                    print(f"❌ Error converting reservation: {e}")
                    
                    # If payment was verified but reservation conversion failed, process automatic refund
                    if registration_data.paymentId and payment_amount > 0:
                        print(f"🔄 Reservation conversion failed after payment verification. Processing automatic refund...")
                        try:
                            from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                            refund_repo = UnregisteredPaymentsRepository()
                            
                            # Get user email for refund
                            user_email = await event_repo.get_user_email(registration_data.userId)
                            if user_email:
                                refund_result = await refund_repo.process_automatic_refund(
                                    payment_id=registration_data.paymentId,
                                    amount=payment_amount,
                                    email=user_email,
                                    reason="Reservation conversion failed after successful payment verification"
                                )
                                
                                if refund_result.get("success"):
                                    print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                                else:
                                    print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                            else:
                                print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                                
                        except Exception as refund_error:
                            print(f"❌ Error processing automatic refund: {refund_error}")
                    
                    raise HTTPException(status_code=400, detail="Failed to convert reservation")
            else:
                # Handle registration based on advanced settings
                if registration_data.subEventIds and len(registration_data.subEventIds) > 0:
                    # Sub-events registration
                    if len(registration_data.subEventIds) > 1:
                        # Multiple sub-events - register for each one
                        try:
                            registrations = []
                            for i, sub_event_id in enumerate(registration_data.subEventIds):
                                reg = await event_repo.register_for_event_advanced(
                                    user_id=registration_data.userId,
                                    event_id=event_id,
                                    payment_id=registration_data.paymentId,
                                    ticket_tier_id=registration_data.tierId,
                                    sub_event_id=sub_event_id,
                                    final_price=payment_amount / len(registration_data.subEventIds),  # Split cost among sub-events
                                    payment_email=registration_data.paymentEmail
                                )
                                registrations.append(reg)
                            
                            registration = registrations[0]  # Main registration
                            additional_registrations = registrations[1:]  # Additional ones
                        except Exception as e:
                            print(f"❌ Error registering for multiple sub-events: {e}")
                            
                            # If payment was verified but registration failed, process automatic refund
                            if registration_data.paymentId and payment_amount > 0:
                                print(f"🔄 Multiple sub-events registration failed after payment verification. Processing automatic refund...")
                                try:
                                    from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                                    refund_repo = UnregisteredPaymentsRepository()
                                    
                                    # Get user email for refund
                                    user_email = await event_repo.get_user_email(registration_data.userId)
                                    if user_email:
                                        refund_result = await refund_repo.process_automatic_refund(
                                            payment_id=registration_data.paymentId,
                                            amount=payment_amount,
                                            email=user_email,
                                            reason="Multiple sub-events registration failed after successful payment verification"
                                        )
                                        
                                        if refund_result.get("success"):
                                            print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                                        else:
                                            print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                                    else:
                                        print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                                        
                                except Exception as refund_error:
                                    print(f"❌ Error processing automatic refund: {refund_error}")
                            
                            raise HTTPException(status_code=400, detail=f"Failed to register for multiple sub-events: {str(e)}")
                    else:
                        # Single sub-event registration
                        try:
                            registration = await event_repo.register_for_event_advanced(
                                user_id=registration_data.userId,
                                event_id=event_id,
                                payment_id=registration_data.paymentId,
                                ticket_tier_id=registration_data.tierId,
                                sub_event_id=registration_data.subEventIds[0],
                                final_price=payment_amount,
                                payment_email=registration_data.paymentEmail
                            )
                            additional_registrations = []
                        except Exception as e:
                            print(f"❌ Error registering for single sub-event: {e}")
                            
                            # If payment was verified but registration failed, process automatic refund
                            if registration_data.paymentId and payment_amount > 0:
                                print(f"🔄 Single sub-event registration failed after payment verification. Processing automatic refund...")
                                try:
                                    from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                                    refund_repo = UnregisteredPaymentsRepository()
                                    
                                    # Get user email for refund
                                    user_email = await event_repo.get_user_email(registration_data.userId)
                                    if user_email:
                                        refund_result = await refund_repo.process_automatic_refund(
                                            payment_id=registration_data.paymentId,
                                            amount=payment_amount,
                                            email=user_email,
                                            reason="Single sub-event registration failed after successful payment verification"
                                        )
                                        
                                        if refund_result.get("success"):
                                            print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                                        else:
                                            print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                                    else:
                                        print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                                        
                                except Exception as refund_error:
                                    print(f"❌ Error processing automatic refund: {refund_error}")
                            
                            raise HTTPException(status_code=400, detail=f"Failed to register for sub-event: {str(e)}")
                else:
                    # Tier-based or basic registration
                    try:
                        registration = await event_repo.register_for_event_advanced(
                            user_id=registration_data.userId,
                            event_id=event_id,
                            payment_id=registration_data.paymentId,
                            ticket_tier_id=registration_data.tierId,
                            sub_event_id=None,
                            final_price=payment_amount,
                            payment_email=registration_data.paymentEmail
                        )
                        additional_registrations = []
                    except Exception as e:
                        print(f"❌ Error registering for tier-based event: {e}")
                        
                        # If payment was verified but registration failed, process automatic refund
                        if registration_data.paymentId and payment_amount > 0:
                            print(f"🔄 Tier-based registration failed after payment verification. Processing automatic refund...")
                            try:
                                from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                                refund_repo = UnregisteredPaymentsRepository()
                                
                                # Get user email for refund
                                user_email = await event_repo.get_user_email(registration_data.userId)
                                if user_email:
                                    refund_result = await refund_repo.process_automatic_refund(
                                        payment_id=registration_data.paymentId,
                                        amount=payment_amount,
                                        email=user_email,
                                        reason="Tier-based registration failed after successful payment verification"
                                    )
                                    
                                    if refund_result.get("success"):
                                        print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                                    else:
                                        print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                                else:
                                    print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                                    
                            except Exception as refund_error:
                                print(f"❌ Error processing automatic refund: {refund_error}")
                        
                        raise HTTPException(status_code=400, detail=f"Failed to register for event: {str(e)}")
            
            print(f"✅ Registration successful for user {registration_data.userId}")
            return {
                "message": "Registration successful",
                "registration": registration,
                "additionalRegistrations": additional_registrations,
                "paymentAmount": payment_amount
            }
            
        except Exception as e:
            # If registration fails after payment verification, process automatic refund
            if registration_data.paymentId and payment_amount > 0:
                print(f"🔄 Registration failed after payment verification. Processing automatic refund...")
                try:
                    from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                    refund_repo = UnregisteredPaymentsRepository()
                    
                    # Get user email for refund
                    user_email = await event_repo.get_user_email(registration_data.userId)
                    if user_email:
                        refund_result = await refund_repo.process_automatic_refund(
                            payment_id=registration_data.paymentId,
                            amount=payment_amount,
                            email=user_email,
                            reason="Registration failed after successful payment verification"
                        )
                        
                        if refund_result.get("success"):
                            print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                        else:
                            print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                    else:
                        print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                        
                except Exception as refund_error:
                    print(f"❌ Error processing automatic refund: {refund_error}")
            
            raise e
            
    except Exception as e:
        print(f"❌ Error registering for event: {e}")
        
        # CRITICAL: If payment was verified but registration failed, process automatic refund
        if registration_data.paymentId and payment_amount > 0:
            print(f"🔄 Registration failed after payment verification. Processing automatic refund...")
            try:
                from authentication.data_access.unregistered_payments_repository import UnregisteredPaymentsRepository
                refund_repo = UnregisteredPaymentsRepository()
                
                # Get user email for refund
                user_email = await event_repo.get_user_email(registration_data.userId)
                if user_email:
                    refund_result = await refund_repo.process_automatic_refund(
                        payment_id=registration_data.paymentId,
                        amount=payment_amount,
                        email=user_email,
                        reason="Registration failed after successful payment verification"
                    )
                    
                    if refund_result.get("success"):
                        print(f"✅ Automatic refund processed: {refund_result.get('refund_id')}")
                    else:
                        print(f"⚠️ Automatic refund failed: {refund_result.get('error')}")
                else:
                    print(f"⚠️ Cannot process refund: user email not found for user {registration_data.userId}")
                    
            except Exception as refund_error:
                print(f"❌ Error processing automatic refund: {refund_error}")
        
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to register for event: {str(e)}")

@event_router.delete("/{event_id}/reserve/{reservation_id}")
async def cancel_reservation(event_id: int, reservation_id: str, user_id: int = Query(...)):
    """Cancel a reservation (cleanup on payment failure)"""
    try:
        print(f"🗑️ Canceling reservation {reservation_id} for user {user_id}")
        
        event_repo = EventRepository()
        try:
            success = await event_repo.cancel_reservation(reservation_id, user_id)
            if not success:
                raise HTTPException(status_code=404, detail="Reservation not found or already expired")
            
            print(f"✅ Reservation {reservation_id} cancelled for user {user_id}")
            return {"message": "Reservation cancelled successfully"}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error canceling reservation: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to cancel reservation: {str(e)}")

@event_router.delete("/{event_id}/register")
async def cancel_registration(event_id: int, registration_data: EventRegistrationRequest):
    """Cancel registration for an event"""
    try:
        print(f"❌ Canceling registration for user {registration_data.userId} from event {event_id}")
        
        event_repo = EventRepository()
        try:
            success = await event_repo.cancel_registration(registration_data.userId, event_id)
            if not success:
                raise HTTPException(status_code=404, detail="Registration not found")
            
            print(f"✅ Registration cancelled for user {registration_data.userId}")
            return {"message": "Registration cancelled successfully"}
            
        except Exception as e:
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
        try:
            await event_repo.ensure_tables_exist()
            
            payment_id = await event_repo.get_payment_id_for_registration(userId, event_id)
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
            raise e
            
    except Exception as e:
        print(f"❌ Error getting payment ID: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get payment ID: {str(e)}")

@event_router.get("/{event_id}/payment-email")
async def get_payment_email_for_event(event_id: int, userId: int):
    """Get payment email for a user's event registration (used for refund notifications)"""
    try:
        print(f"🔍 Getting payment email for user {userId}, event {event_id}")
        
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            
            payment_email = await event_repo.get_payment_email_for_registration(userId, event_id)
            if payment_email:
                print(f"✅ Found payment email for user {userId}, event {event_id}")
                return {
                    "success": True,
                    "paymentEmail": payment_email
                }
            else:
                print(f"⚠️ No payment email found for user {userId}, event {event_id}")
                return {
                    "success": False,
                    "paymentEmail": None,
                    "message": "No payment email found"
                }
                
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting payment email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get payment email: {str(e)}")

@event_router.post("/seed")
async def seed_events():
    """Seed sample events"""
    try:
        print("🌱 Seeding sample events...")
        
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            await event_repo.seed_sample_events()
            print("✅ Events seeded successfully")
            return {"message": "Events seeded successfully"}
            
        except Exception as e:
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
        try:
            await event_repo.ensure_tables_exist()
            stats = await event_repo.get_system_stats()
            print("✅ Event system test completed successfully")
            return {
                "status": "success",
                "message": "Event system is working properly",
                "statistics": stats
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Event system test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Event system test failed: {str(e)}")

# Advanced Ticketing Endpoints
@event_router.post("/ticket-tiers")
async def create_ticket_tier(tier_data: TicketTierRequest):
    """Create a new ticket tier for an event"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            tier_dict = tier_data.dict()
            result = await event_repo.create_ticket_tier(tier_dict)
            return {"success": True, "tier": result}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error creating ticket tier: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create ticket tier: {str(e)}")

@event_router.get("/{event_id}/ticket-tiers")
async def get_ticket_tiers(event_id: int):
    """Get all ticket tiers for an event"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            tiers = await event_repo.get_ticket_tiers(event_id)
            return {"success": True, "tiers": tiers}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting ticket tiers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get ticket tiers: {str(e)}")

@event_router.post("/sub-events")
async def create_sub_event(sub_event_data: SubEventRequest):
    """Create a new sub-event for an event"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            sub_event_dict = sub_event_data.dict()
            result = await event_repo.create_sub_event(sub_event_dict)
            return {"success": True, "subEvent": result}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error creating sub-event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create sub-event: {str(e)}")

@event_router.get("/{event_id}/sub-events")
async def get_sub_events(event_id: int):
    """Get all sub-events for an event"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            sub_events = await event_repo.get_sub_events(event_id)
            return {"success": True, "subEvents": sub_events}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting sub-events: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sub-events: {str(e)}")

@event_router.get("/{event_id}/capacity")
async def get_event_capacity(event_id: int):
    """Get available capacity for an event"""
    try:
        event_repo = EventRepository()
        try:
            # Get event details
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Get current registration count
            registration_count = await event_repo.get_registration_count(event_id)
            total_capacity = event['capacity']
            available_capacity = max(0, total_capacity - registration_count)
            
            print(f"📊 Event {event_id} capacity: {available_capacity}/{total_capacity} available")
            
            return {
                "success": True, 
                "availableCapacity": available_capacity,
                "totalCapacity": total_capacity,
                "registrationCount": registration_count
            }
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting event capacity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get event capacity: {str(e)}")

@event_router.get("/capacity/{tier_id}")
async def get_tier_capacity(tier_id: int):
    """Get available capacity for a ticket tier"""
    try:
        event_repo = EventRepository()
        try:
            capacity = await event_repo.get_available_capacity(tier_id=tier_id)
            return {"success": True, "availableCapacity": capacity}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting tier capacity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get tier capacity: {str(e)}")

@event_router.get("/sub-event-capacity/{sub_event_id}")
async def get_sub_event_capacity(sub_event_id: int):
    """Get available capacity for a sub-event"""
    try:
        event_repo = EventRepository()
        try:
            capacity = await event_repo.get_available_capacity(sub_event_id=sub_event_id)
            return {"success": True, "availableCapacity": capacity}
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting sub-event capacity: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sub-event capacity: {str(e)}")

@event_router.get("/{event_id}/ticket-options")
async def get_ticket_options(event_id: int, user_email: Optional[str] = None):
    """Get available ticket options for an event with automatic progression logic"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            
            # Get the event first
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Get user info for filtering if provided
            user_current_year = None
            user_university = None
            if user_email:
                from authentication.data_access.user_repository import UserRepository
                user_repo = UserRepository()
                try:
                    user = await user_repo.get_user_by_email(user_email)
                    if user:
                        user_current_year = user.get('currentYear', '1st year')
                        user_university = user.get('university', 'University of Toronto')
                finally:
                    pass
            
            # Check university restrictions
            if event.get('isUofTOnly', False) and user_university != 'University of Toronto':
                return {"success": False, "message": "This event is restricted to University of Toronto students only"}
            
            result = {
                "success": True,
                "event": {
                    "id": event['id'],
                    "name": event['name'],
                    "description": event['description'],
                    "date": event['date'].isoformat() if event.get('date') else None,
                    "enableAdvancedTicketing": event.get('enableAdvancedTicketing', False),
                    "enableSubEvents": event.get('enableSubEvents', False)
                },
                "ticketTiers": [],
                "subEvents": []
            }
            
            # Get available ticket tiers with automatic progression
            if event.get('enableAdvancedTicketing', False):
                tiers = await event_repo.get_available_ticket_tiers(event_id)
                
                # Filter by user's current year
                filtered_tiers = []
                for tier in tiers:
                    target_year = tier.get('targetYear', 'All years')
                    if target_year == 'All years' or not user_current_year:
                        filtered_tiers.append(tier)
                    else:
                        target_years = [year.strip() for year in target_year.split(',')]
                        if user_current_year in target_years:
                            filtered_tiers.append(tier)
                
                # Convert datetime fields
                for tier in filtered_tiers:
                    if tier.get('startDate'):
                        tier['startDate'] = tier['startDate'].isoformat()
                    if tier.get('endDate'):
                        tier['endDate'] = tier['endDate'].isoformat()
                
                result['ticketTiers'] = filtered_tiers
            else:
                # Use default event pricing
                result['defaultPrice'] = event.get('fee', 0)
            
            # Get available sub-events
            if event.get('enableSubEvents', False):
                sub_events = await event_repo.get_available_sub_events(event_id)
                result['subEvents'] = sub_events
            
            return result
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting ticket options: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to get ticket options: {str(e)}")

@event_router.get("/{event_id}/ticket-tiers-analytics")
async def get_ticket_tiers_for_analytics(event_id: int):
    """Get ticket tiers with registration counts for analytics (no user restrictions)"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            
            # Get the event first
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            result = {
                "success": True,
                "event": {
                    "id": event['id'],
                    "name": event['name'],
                    "enableAdvancedTicketing": event.get('enableAdvancedTicketing', False)
                },
                "ticketTiers": []
            }
            
            # Get ticket tiers with registration counts (no restrictions)
            if event.get('enableAdvancedTicketing', False):
                tiers = await event_repo.get_available_ticket_tiers(event_id)
                
                # Convert datetime fields
                for tier in tiers:
                    if tier.get('startDate'):
                        tier['startDate'] = tier['startDate'].isoformat()
                    if tier.get('endDate'):
                        tier['endDate'] = tier['endDate'].isoformat()
                
                result['ticketTiers'] = tiers
            
            return result
            
        except Exception as e:
            raise e
            
    except Exception as e:
        print(f"❌ Error getting ticket tiers for analytics: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to get ticket tiers for analytics: {str(e)}")

@event_router.get("/{event_id}/debug-registrations")
async def debug_event_registrations(event_id: int):
    """Debug endpoint to check registration data for an event"""
    try:
        event_repo = EventRepository()
        try:
            await event_repo.ensure_tables_exist()
            
            # Get the event first
            event = await event_repo.get_event_with_tiers_and_subevents(event_id)
            if not event:
                raise HTTPException(status_code=404, detail="Event not found")
            
            # Get raw registration data
            async with event_repo.get_connection() as conn:
                query = """
                SELECT er.*, tt.name as tier_name, tt.price as tier_price
                FROM "EventRegistration" er
                LEFT JOIN "TicketTier" tt ON er."ticketTierId" = tt.id
                WHERE er."eventId" = $1
                ORDER BY er.id DESC
                """
                raw_registrations = await conn.fetch(query, event_id)
            
            # Get ticket tiers
            ticket_tiers = await event_repo.get_available_ticket_tiers(event_id)
            
            result = {
                "success": True,
                "event": {
                    "id": event["id"],
                    "name": event["name"],
                    "enableAdvancedTicketing": event.get("enableAdvancedTicketing", False)
                },
                "registrations": [dict(reg) for reg in raw_registrations],
                "ticketTiers": ticket_tiers,
                "summary": {
                    "totalRegistrations": len(raw_registrations),
                    "registrationsWithTicketTier": len([r for r in raw_registrations if r["ticketTierId"] is not None]),
                    "registrationsWithoutTicketTier": len([r for r in raw_registrations if r["ticketTierId"] is None])
                }
            }
            
            return result
        except Exception as e:
            print(f"Error debugging registrations: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to debug registrations: {str(e)}")
    except Exception as e:
        print(f"Error in debug_event_registrations: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")