// app/events/page.tsx
'use client';

import { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { ChevronDown, ChevronUp, CreditCard, CheckCircle, X, Coins } from 'lucide-react';
import Link from 'next/link';
import { UserContext } from '../contexts/UserContext';
import ConfirmationModal from '../components/ConfirmationModal';
import RefundRequestModal from '../components/RefundRequestModal';
import Toast from '../components/Toast';

interface TicketTier {
  id: number;
  name: string;
  price: number;
  capacity: number;
  targetYear: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isAvailable: boolean;
  availabilityReason: string;
  registered_count: number;
  remaining_capacity: number;
}

interface SubEvent {
  id: number;
  name: string;
  description: string;
  price: number;
  capacity: number;
  isStandalone: boolean;
  isComboOption: boolean;
  isAvailable: boolean;
  availabilityReason: string;
  registered_count: number;
  remaining_capacity: number;
}

interface Event {
  id: number;
  name: string;
  description: string;
  targetYear: string;
  fee: number;
  capacity: number;
  isArchived: boolean;
  date: string;
  type: string;
  image?: string;
  refundDeadline?: string;
  remainingSeats: number;
  registeredUsers: any[];
  registrations?: any[];
  registration_count?: number;
  enableAdvancedTicketing?: boolean;
  enableSubEvents?: boolean;
  ticketTiers?: TicketTier[];
  subEvents?: SubEvent[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<'all' | 'career' | 'social'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [registering, setRegistering] = useState<number | null>(null);

  // Credit system state
  const [userCredits, setUserCredits] = useState<number>(0);
  const [useCredits, setUseCredits] = useState<{[eventId: number]: boolean}>({});
  const [creditsToUse, setCreditsToUse] = useState<{[eventId: number]: number}>({});

  // Modal and Toast states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    eventId: number;
    eventName: string;
  }>({ isOpen: false, eventId: 0, eventName: '' });

  const [refundModal, setRefundModal] = useState<{
    isOpen: boolean;
    eventId: number;
    eventName: string;
    amount: number;
  }>({ isOpen: false, eventId: 0, eventName: '', amount: 0 });

  // Ticket selection states
  const [selectedTicketTier, setSelectedTicketTier] = useState<{[eventId: number]: number}>({});
  const [selectedSubEvents, setSelectedSubEvents] = useState<{[eventId: number]: number[]}>({});
  const [showTicketOptions, setShowTicketOptions] = useState<{[eventId: number]: boolean}>({});

  const [toast, setToast] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'success' });
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  
  // Use ref to prevent multiple simultaneous fetch requests
  const isFetchingRef = useRef(false);
  const lastUserEmailRef = useRef<string | null>(null);

  // Helper functions for notifications
  const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ isOpen: true, title, message, type });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  // Helper function to check if refund is still allowed
  const isRefundAllowed = (event: any) => {
    const now = new Date();
    const refundDeadline = event.refundDeadline ? new Date(event.refundDeadline) : new Date(event.date);
    return now <= refundDeadline;
  };

  useEffect(() => {
    // Only fetch if user email changed or it's the initial load
    const currentUserEmail = user?.email || null;
    if (currentUserEmail !== lastUserEmailRef.current) {
      console.log('🔄 User email changed, current:', currentUserEmail);
      lastUserEmailRef.current = currentUserEmail;
      fetchEvents();
      if (user?.id) {
        console.log('👤 User ID exists, fetching credits for user:', user.id);
        fetchUserCredits();
      } else {
        console.log('❌ No user ID, cannot fetch credits');
      }
    }
  }, [user?.email]);

  // Separate useEffect for polling to avoid refetching on state changes
  useEffect(() => {
    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      if (!registering && !isFetchingRef.current) {
        fetchEvents();
      }
    }, 60000); // Increase to 60 seconds to reduce frequency

    return () => clearInterval(pollInterval);
  }, []);

  const fetchEvents = async () => {
    // Prevent multiple simultaneous fetch requests
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }

    try {
      isFetchingRef.current = true;
      console.log('🚀 Starting fetchEvents...');
      
      let url = '/api/events';
      if (user?.email) {
        url += `?user_email=${encodeURIComponent(user.email)}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Fetched events:', data.length);
        
        // Set initial events data
        setEvents(data);
        
        // Fetch all ticket options in parallel, then batch update
        const eventsWithAdvancedFeatures = data.filter((event: Event) => 
          event.enableAdvancedTicketing || event.enableSubEvents
        );
        
        if (eventsWithAdvancedFeatures.length > 0) {
          console.log(`🎫 Fetching ticket options for ${eventsWithAdvancedFeatures.length} events...`);
          
          // Fetch all ticket options in parallel
          const ticketOptionsPromises = eventsWithAdvancedFeatures.map(async (event: Event) => {
            try {
              let url = `/api/events/${event.id}/ticket-options`;
              if (user?.email) {
                url += `?user_email=${encodeURIComponent(user.email)}`;
              }
              
              const response = await fetch(url);
              if (response.ok) {
                const data = await response.json();
                if (data.success) {
                  return {
                    eventId: event.id,
                    ticketTiers: data.ticketTiers,
                    subEvents: data.subEvents
                  };
                }
              }
              return null;
            } catch (error) {
              console.error(`Error fetching ticket options for event ${event.id}:`, error);
              return null;
            }
          });
          
          // Wait for all ticket options to be fetched
          const ticketOptionsResults = await Promise.all(ticketOptionsPromises);
          
          // Batch update all events with their ticket options
          setEvents(prevEvents => {
            const eventsMap = new Map(prevEvents.map(event => [event.id, event]));
            
            ticketOptionsResults.forEach(result => {
              if (result && eventsMap.has(result.eventId)) {
                const event = eventsMap.get(result.eventId)!;
                eventsMap.set(result.eventId, {
                  ...event,
                  ticketTiers: result.ticketTiers,
                  subEvents: result.subEvents
                });
              }
            });
            
            return Array.from(eventsMap.values());
          });
          
          console.log('✅ All ticket options fetched and updated');
        }
      } else {
        console.error('❌ Failed to fetch events:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching events:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      console.log('✅ fetchEvents completed');
    }
  };

  const fetchUserCredits = async () => {
    if (!user?.id) {
      console.log('❌ fetchUserCredits: No user ID available');
      return;
    }
    
    try {
      console.log('🔍 Fetching user credits for user ID:', user.id);
      const url = `/api/users/credits?userId=${user.id}`;
      console.log('🌐 Credit API URL:', url);
      
      const response = await fetch(url);
      console.log('💳 Credits API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('💳 Credits API response data:', data);
        if (data.success) {
          const credits = data.credits?.currentCredits || 0;
          console.log('💰 Setting user credits to:', credits);
          setUserCredits(credits);
        } else {
          console.error('❌ Credits API returned success: false', data);
          // Set to 0 as fallback
          setUserCredits(0);
        }
      } else {
        const errorData = await response.text();
        console.error('❌ Credits API failed:', response.status, errorData);
        // Set to 0 as fallback
        setUserCredits(0);
      }
    } catch (error) {
      console.error('❌ Error fetching user credits:', error);
      // Set to 0 as fallback
      setUserCredits(0);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (keyword && !ev.name.toLowerCase().includes(keyword.toLowerCase()))
        return false;
      if (category !== 'all' && ev.type !== category) return false;
      return true;
    });
  }, [events, keyword, category]);

  const liveEvents = filteredEvents.filter((e) => !e.isArchived);
  const archivedEvents = filteredEvents.filter((e) => e.isArchived);

  // Debug logging
  console.log('🔍 Events filtering debug:', {
    totalEvents: events.length,
    filteredEvents: filteredEvents.length,
    liveEvents: liveEvents.length,
    archivedEvents: archivedEvents.length,
    keyword,
    category,
    user: user ? { id: user.id, email: user.email } : null,
    userCredits: userCredits,
    eventsDetail: events.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      isArchived: e.isArchived,
      date: e.date
    }))
  });

  const handleRegister = (eventId: number) => {
    if (!user) {
      alert('Please log in to register for events');
      return;
    }

    // Build payment URL with credit usage information
    let paymentUrl = `/payment?eventId=${eventId}&userId=${user.id}`;
    
    // Add credit usage parameters if credits are being used
    if (useCredits[eventId] && creditsToUse[eventId] > 0) {
      paymentUrl += `&useCredits=true&creditsAmount=${creditsToUse[eventId]}`;
    }

    // Redirect to payment page
    window.location.href = paymentUrl;
  };

  const handleFreeEventRegistration = async (eventId: number) => {
    if (!user) {
      showToast('Authentication Required', 'Please log in to register for events', 'warning');
      return;
    }

    setRegistering(eventId);
    
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(
          'Registration Successful!', 
          `Successfully registered for ${data.registration?.eventName || 'the event'}! No payment required.`, 
          'success'
        );
        // Refresh events to update registration status
        fetchEvents();
      } else {
        const errorData = await response.json();
        showToast(
          'Registration Failed', 
          errorData.error || 'Failed to register for the event', 
          'error'
        );
      }
    } catch (error) {
      console.error('Free registration error:', error);
      showToast(
        'Error', 
        'An error occurred while registering', 
        'error'
      );
    } finally {
      setRegistering(null);
    }
  };

  const handleCancelRegistration = (eventId: number, eventName: string) => {
    if (!user) {
      showToast('Authentication Required', 'Please log in to cancel registration', 'warning');
      return;
    }

    // Find the event to check if it's paid
    const event = events.find(e => e.id === eventId);
    
    if (event) {
      // Find the user's registration to get the actual paid amount (finalPrice)
      const userRegistration = event.registeredUsers?.find((regUser: any) => regUser.id === user.id) ||
                               event.registrations?.find((reg: any) => reg.userId === user.id);
      
      // Use finalPrice if available, otherwise fall back to event fee
      const actualPaidAmount = userRegistration?.finalPrice ?? event.fee;
      
      if (actualPaidAmount > 0) {
        // Paid event - show refund request modal with actual paid amount
        setRefundModal({
          isOpen: true,
          eventId,
          eventName,
          amount: actualPaidAmount
        });
      } else {
        // Free event - show simple confirmation
        setConfirmModal({
          isOpen: true,
          eventId,
          eventName
        });
      }
    }
  };

  const confirmCancelRegistration = async () => {
    const { eventId, eventName } = confirmModal;
    
    setRegistering(eventId);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      const response = await fetch(`/api/events/${eventId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user!.id,
          email: user!.email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(
          'Registration Cancelled', 
          `Successfully cancelled registration for "${eventName}"`, 
          'success'
        );
        // Refresh events to update registration status
        fetchEvents();
      } else {
        const errorData = await response.json();
        showToast(
          'Cancellation Failed', 
          errorData.error || 'Failed to cancel registration', 
          'error'
        );
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      showToast(
        'Error', 
        'An error occurred while cancelling registration', 
        'error'
      );
    } finally {
      setRegistering(null);
    }
  };

  const handleRefundRequest = async (reason: string) => {
    const { eventId, eventName, amount } = refundModal;
    
    setRegistering(eventId);
    setRefundModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      const response = await fetch(`/api/events/${eventId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user!.id,
          email: user!.email,
          reason: reason,
          paymentAmount: amount
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(
          'Refund Request Submitted', 
          `Your refund request for "${eventName}" ($${amount}) has been submitted for admin review.`, 
          'success'
        );
        // Refresh events to update registration status
        fetchEvents();
      } else {
        const errorData = await response.json();
        showToast(
          'Refund Request Failed', 
          errorData.error || 'Failed to submit refund request', 
          'error'
        );
      }
    } catch (error) {
      console.error('Refund request error:', error);
      showToast(
        'Error', 
        'An error occurred while submitting refund request', 
        'error'
      );
    } finally {
      setRegistering(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Member Events</h1>

      <div className="mb-10 flex justify-center gap-2">
        <label htmlFor="filter" className="sr-only">
          Search events
        </label>
        <input
          id="filter"
          type="text"
          placeholder="Search by keyword"
          className="w-full max-w-sm rounded-md border border-gray-300 bg-transparent px-3 py-2 focus:border-[#1c2a52] focus:outline-none"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      <div className="mb-10 flex justify-center gap-4">
        {(['all', 'career', 'social'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-4 py-2 text-sm border transition ${
              category === c
                ? 'bg-[#1c2a52] text-white border-[#1c2a52]'
                : 'border-gray-400 hover:bg-gray-100 dark:hover:bg-[#171717]'
            }`}
          >
            {c === 'all'
              ? 'All'
              : c === 'career'
              ? 'Career'
              : 'Social'}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        {liveEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 10V11m6 0v6m-6-4h6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {keyword || category !== 'all' 
                ? 'Try adjusting your search filters.'
                : 'Check back soon for upcoming events!'
              }
            </p>
          </div>
        )}
        {liveEvents.map((event) => (
          <EventCard 
            key={event.id} 
            event={event} 
            user={user}
            onRegister={handleRegister}
            onFreeRegister={handleFreeEventRegistration}
            onCancel={handleCancelRegistration}
            registering={registering === event.id}
            userCredits={userCredits}
            useCredits={useCredits[event.id] || false}
            creditsToUse={creditsToUse[event.id] || 0}
            onToggleCredits={(eventId, enabled) => setUseCredits(prev => ({...prev, [eventId]: enabled}))}
            onCreditsChange={(eventId, amount) => setCreditsToUse(prev => ({...prev, [eventId]: amount}))}
          />
        ))}
      </div>

      <div className="mt-16 text-center">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-gray-400 px-4 py-2 text-sm transition hover:bg-gray-100 dark:hover:bg-[#171717]"
          onClick={() => setShowArchived((prev) => !prev)}
        >
          {showArchived ? (
            <>
              Hide archived <ChevronUp size={18} />
            </>
          ) : (
            <>
              View archived events <ChevronDown size={18} />
            </>
          )}
        </button>
      </div>

      {showArchived && (
        <div className="mt-10 space-y-8">
          <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-gray-300 mb-6">
            Archived Events
          </h2>
          {archivedEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No archived events found.</p>
            </div>
          ) : (
            archivedEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                archived 
                user={user}
                onRegister={handleRegister}
                onFreeRegister={handleFreeEventRegistration}
                onCancel={handleCancelRegistration}
                registering={false}
              />
            ))
                   )}
       </div>
           )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmCancelRegistration}
        title="Cancel Registration"
        message={`Are you sure you want to cancel your registration for "${confirmModal.eventName}"? This action cannot be undone.`}
        confirmText="Yes, Cancel Registration"
        cancelText="Keep Registration"
        type="danger"
        loading={registering === confirmModal.eventId}
      />

      {/* Refund Request Modal */}
      <RefundRequestModal
        isOpen={refundModal.isOpen}
        onClose={() => setRefundModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleRefundRequest}
        eventName={refundModal.eventName}
        amount={refundModal.amount}
        loading={registering === refundModal.eventId}
      />

      {/* Toast Notification */}
      <Toast
        isOpen={toast.isOpen}
        onClose={closeToast}
        title={toast.title}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

function EventCard({
  event,
  archived = false,
  user,
  onRegister,
  onFreeRegister,
  onCancel,
  registering,
  userCredits = 0,
  useCredits = false,
  creditsToUse = 0,
  onToggleCredits,
  onCreditsChange
}: {
  event: Event;
  archived?: boolean;
  user: any;
  onRegister: (eventId: number) => void;
  onFreeRegister?: (eventId: number) => Promise<void>;
  onCancel?: (eventId: number, eventName: string) => void;
  registering: boolean;
  userCredits?: number;
  useCredits?: boolean;
  creditsToUse?: number;
  onToggleCredits?: (eventId: number, enabled: boolean) => void;
  onCreditsChange?: (eventId: number, amount: number) => void;
}) {
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [selectedSubEventIds, setSelectedSubEventIds] = useState<number[]>([]);
  const [showTicketOptions, setShowTicketOptions] = useState(false);
  
  const date = new Date(event.date);
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
  
  const isUserRegistered = user && (event.registeredUsers || event.registrations || []).some(
    (registration: any) => {
      const registeredUser = registration.user || registration;
      return registeredUser.id === user.id;
    }
  );
  
  // Use useState to ensure consistent rendering between server and client
  const [effectiveCapacity, setEffectiveCapacity] = useState(event.capacity);
  const [effectiveRemainingSeats, setEffectiveRemainingSeats] = useState(event.remainingSeats);
  const [effectivePrice, setEffectivePrice] = useState<number | string>(event.fee);
  
  const isFull = effectiveRemainingSeats <= 0;
  
  // Helper function to check if refund is still allowed
  const isRefundAllowed = () => {
    const now = new Date();
    const refundDeadline = event.refundDeadline ? new Date(event.refundDeadline) : new Date(event.date);
    return now <= refundDeadline;
  };

  // Get available ticket tiers (for automatic progression)
  const availableTiers = event.ticketTiers?.filter(tier => tier.isAvailable) || [];
  const currentTier = availableTiers.length > 0 ? availableTiers[0] : null; // First available tier

  // Get available sub-events
  const availableSubEvents = event.subEvents?.filter(subEvent => subEvent.isAvailable) || [];

  // Calculate effective values on client side only (after currentTier is defined)
  useEffect(() => {
    // Calculate effective capacity
    let capacity = event.capacity;
    if (event.enableAdvancedTicketing && event.ticketTiers && event.ticketTiers.length > 0) {
      capacity = event.ticketTiers.reduce((total, tier) => total + tier.capacity, 0);
    } else if (event.enableSubEvents && event.subEvents && event.subEvents.length > 0) {
      capacity = event.subEvents.reduce((total, subEvent) => total + subEvent.capacity, 0);
    }
    setEffectiveCapacity(capacity);

    // Calculate effective remaining seats
    let remaining = event.remainingSeats;
    if (event.enableAdvancedTicketing && event.ticketTiers && event.ticketTiers.length > 0) {
      remaining = event.ticketTiers.reduce((total, tier) => total + (tier.remaining_capacity || 0), 0);
    } else if (event.enableSubEvents && event.subEvents && event.subEvents.length > 0) {
      remaining = event.subEvents.reduce((total, subEvent) => total + (subEvent.remaining_capacity || 0), 0);
    }
    setEffectiveRemainingSeats(remaining);

    // Calculate effective price
    let price: number | string = event.fee;
    if (event.enableAdvancedTicketing && currentTier) {
      price = currentTier.price;
    } else if (event.enableSubEvents && event.subEvents && event.subEvents.length > 0) {
      const prices = event.subEvents.map(se => se.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      price = minPrice === maxPrice ? minPrice : `${minPrice}-${maxPrice}`;
    }
    setEffectivePrice(price);
  }, [event, currentTier]);

  // Calculate current price based on selections
  const getCurrentPrice = () => {
    if (event.enableAdvancedTicketing) {
      // If no tiers are configured, use basic event fee
      if (!event.ticketTiers || event.ticketTiers.length === 0) {
        return event.fee;
      }
      // If tiers are configured, use current tier price
      if (currentTier) {
        return currentTier.price;
      }
    }
    if (event.enableSubEvents && selectedSubEventIds.length > 0) {
      return selectedSubEventIds.reduce((total, subEventId) => {
        const subEvent = event.subEvents?.find(se => se.id === subEventId);
        return total + (subEvent?.price || 0);
      }, 0);
    }
    return event.fee;
  };

  // Check if user can register
  const canRegister = () => {
    if (!user || isUserRegistered || archived) return false;
    
    if (event.enableAdvancedTicketing) {
      // If advanced ticketing is enabled but no tiers are configured, fall back to basic registration
      if (!event.ticketTiers || event.ticketTiers.length === 0) {
        return effectiveRemainingSeats > 0;
      }
      return currentTier && currentTier.isAvailable;
    }
    
    if (event.enableSubEvents) {
      return selectedSubEventIds.length > 0 && selectedSubEventIds.every(id => 
        event.subEvents?.find(se => se.id === id)?.isAvailable
      );
    }
    
    return effectiveRemainingSeats > 0;
  };

  const handleSubEventSelection = (subEventId: number, checked: boolean) => {
    const subEvent = event.subEvents?.find(se => se.id === subEventId);
    if (!subEvent) return;

    if (checked) {
      if (subEvent.isComboOption) {
        // If this is a combo option, it might replace other selections
        setSelectedSubEventIds([subEventId]);
      } else {
        setSelectedSubEventIds(prev => [...prev, subEventId]);
      }
    } else {
      setSelectedSubEventIds(prev => prev.filter(id => id !== subEventId));
    }
  };

  return (
    <article className={`flex flex-col rounded-lg border p-4 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center md:gap-4 ${
      archived 
        ? 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600' 
        : 'border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700'
    }`}>
      <div className="flex w-full items-center justify-between md:w-[120px] md:flex-col md:justify-center">
        <span className="text-2xl font-bold md:text-3xl text-[#1c2a52] dark:text-blue-400">
          {dateLabel}
        </span>
        <div className="text-center">
          <span className="text-sm text-gray-500 block">
            Seats {effectiveCapacity - effectiveRemainingSeats}/{effectiveCapacity}
          </span>
          {!archived && (
            <div className={`mt-1 w-full bg-gray-200 rounded-full h-2 ${
              isFull ? 'bg-red-200' : effectiveRemainingSeats <= 5 ? 'bg-yellow-200' : 'bg-green-200'
            }`}>
              <div 
                className={`h-2 rounded-full ${
                  isFull ? 'bg-red-500' : effectiveRemainingSeats <= 5 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${((effectiveCapacity - effectiveRemainingSeats) / effectiveCapacity) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grow md:mt-0">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{event.name}</h2>
          <span
            className={`ml-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              event.type === 'career'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            }`}
          >
            {event.type === 'career' ? '💼 Career' : '🎉 Social'}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {event.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
            For: {event.targetYear}
          </span>
          {(typeof effectivePrice === 'number' ? effectivePrice > 0 : true) && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
              </svg>
              Fee: ${effectivePrice}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            {date.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-col items-end gap-2 md:mt-0 md:w-[200px]">
        {archived ? (
          <div className="w-full text-center">
            <span className="inline-block rounded-full bg-gray-500 px-3 py-1 text-xs text-white mb-2">
              Archived
            </span>
            <Link
              href="#"
              className="w-full block rounded-md border border-gray-400 py-2 text-center text-sm transition hover:bg-gray-100 dark:hover:bg-[#171717]"
            >
              View Report
            </Link>
          </div>
        ) : isUserRegistered ? (
          <div className="w-full space-y-2">
            <div className="w-full rounded-md border border-green-600 bg-green-50 py-2 text-center text-sm text-green-700 flex items-center justify-center gap-1">
              <CheckCircle size={16} />
              Registered
            </div>
            {!archived && onCancel && isRefundAllowed() && (
              <button
                onClick={() => onCancel(event.id, event.name)}
                disabled={registering}
                className="w-full rounded-md border border-red-400 py-1 text-center text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {registering ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X size={12} />
                    Cancel Registration
                  </>
                )}
              </button>
            )}
            {!archived && onCancel && !isRefundAllowed() && (
              <div className="w-full rounded-md border border-gray-400 bg-gray-50 py-1 text-center text-xs text-gray-600">
                Refund period expired
              </div>
            )}
          </div>
        ) : !canRegister() ? (
          <div className="w-full space-y-2">
            {/* Only show "no tickets" if we're NOT falling back to basic registration */}
            {event.enableAdvancedTicketing && !currentTier && event.ticketTiers && event.ticketTiers.length > 0 && (
              <div className="w-full rounded-md border border-orange-400 bg-orange-50 py-2 text-center text-sm text-orange-700">
                No tickets available
              </div>
            )}
            {!event.enableAdvancedTicketing && !event.enableSubEvents && isFull && (
              <div className="w-full rounded-md border border-red-400 bg-red-50 py-2 text-center text-sm text-red-700">
                Event Full
              </div>
            )}
            {event.enableSubEvents && availableSubEvents.length === 0 && (
              <div className="w-full rounded-md border border-orange-400 bg-orange-50 py-2 text-center text-sm text-orange-700">
                No sub-events available
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-2">
            {/* Ticket Tier Display */}
            {event.enableAdvancedTicketing && currentTier && (
              <div className="w-full border border-blue-200 bg-blue-50 rounded-md p-3 text-sm">
                <div className="font-medium text-blue-900 mb-1">{currentTier.name}</div>
                <div className="text-blue-700">${currentTier.price}</div>
                <div className="text-xs text-blue-600">
                  {currentTier.remaining_capacity} seats left
                  {currentTier.targetYear !== 'All years' && (
                    <span className="ml-2">• For {currentTier.targetYear}</span>
                  )}
                </div>
                {currentTier.availabilityReason && (
                  <div className="text-xs text-orange-600 mt-1">
                    {currentTier.availabilityReason}
                  </div>
                )}
                
                {/* Show tier progression info */}
                {event.ticketTiers && event.ticketTiers.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">Tier Progression:</div>
                    <div className="flex flex-wrap gap-1">
                      {event.ticketTiers.map((tier: any, index: number) => (
                        <span 
                          key={tier.id} 
                          className={`text-xs px-2 py-1 rounded ${
                            tier.id === currentTier.id 
                              ? 'bg-blue-200 text-blue-800 font-medium' 
                              : tier.isAvailable
                              ? 'bg-green-100 text-green-600'
                              : tier.remaining_capacity === 0
                              ? 'bg-red-100 text-red-600 line-through'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {tier.name}: ${tier.price}
                          {tier.id === currentTier.id && ' (Current)'}
                          {tier.remaining_capacity === 0 && ' (Sold out)'}
                          {!tier.isAvailable && tier.remaining_capacity > 0 && ' (Upcoming)'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sub-Events Selection */}
            {event.enableSubEvents && availableSubEvents.length > 0 && (
              <div className="w-full border border-gray-200 rounded-md p-3 text-sm">
                <div className="font-medium text-gray-900 mb-2">Choose Events:</div>
                <div className="space-y-2">
                  {availableSubEvents.map(subEvent => (
                    <label key={subEvent.id} className="flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={selectedSubEventIds.includes(subEvent.id)}
                        onChange={(e) => handleSubEventSelection(subEvent.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{subEvent.name}</div>
                        <div className="text-green-600">${subEvent.price}</div>
                        <div className="text-gray-500">{subEvent.remaining_capacity} left</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Credit Usage Section */}
            {user && userCredits > 0 && getCurrentPrice() > 0 && (
              <div className="w-full bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Available Credits: ${userCredits}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useCredits}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        onToggleCredits?.(event.id, enabled);
                        if (!enabled) {
                          onCreditsChange?.(event.id, 0);
                        } else {
                          // Default to 0 (None) - user must manually enter amount
                          onCreditsChange?.(event.id, 0);
                        }
                      }}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-green-800">Use credits for this event</span>
                  </label>
                  
                  {useCredits && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-800">Amount:</span>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(userCredits, getCurrentPrice())}
                        step="0.5"
                        value={creditsToUse || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '') {
                            onCreditsChange?.(event.id, 0);
                            return;
                          }
                          
                          const amount = Math.min(
                            parseFloat(inputValue) || 0,
                            Math.min(userCredits, getCurrentPrice())
                          );
                          onCreditsChange?.(event.id, amount);
                        }}
                        className="w-20 px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm text-green-800">credits (${creditsToUse})</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Price Display */}
            <div className="w-full bg-gray-100 border border-gray-300 rounded-md p-2 text-center">
              <div className="text-sm font-medium text-gray-900">
                {useCredits && creditsToUse > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Subtotal: ${getCurrentPrice()}</div>
                    <div className="text-xs text-green-600">Credits: -${creditsToUse}</div>
                    <div className="border-t border-gray-300 pt-1">
                      Total: ${Math.max(0, getCurrentPrice() - creditsToUse)}
                    </div>
                  </div>
                ) : (
                  <>Total: ${getCurrentPrice()}</>
                )}
              </div>
            </div>

            {/* Registration Button */}
            {getCurrentPrice() === 0 ? (
              <button
                onClick={() => onFreeRegister?.(event.id)}
                disabled={registering || !user || !canRegister()}
                className="w-full rounded-md border border-green-600 py-2 text-center text-sm text-green-600 transition hover:bg-green-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              >
                {registering ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Register FREE
                  </>
                )}
              </button>
            ) : (
              <Link
                href={`/payment?eventId=${event.id}&userId=${user?.id}&tierId=${currentTier?.id || ''}&subEventIds=${selectedSubEventIds.join(',')}&price=${getCurrentPrice()}${useCredits && creditsToUse > 0 ? `&useCredits=true&creditsAmount=${creditsToUse}` : ''}`}
                className={`w-full rounded-md border py-2 text-center text-sm transition flex items-center justify-center gap-1 ${
                  canRegister()
                    ? 'border-[#1c2a52] text-[#1c2a52] hover:bg-[#1c2a52] hover:text-white'
                    : 'border-gray-400 text-gray-400 cursor-not-allowed'
                }`}
              >
                <CreditCard size={16} />
                {useCredits && creditsToUse > 0 ? (
                  <>Pay & Register (${Math.max(0, getCurrentPrice() - creditsToUse)})</>
                ) : (
                  <>Pay & Register (${getCurrentPrice()})</>
                )}
              </Link>
            )}
            
            {/* Feedback Form Button - show for registered users or archived events */}
            {(isUserRegistered || archived) && (
              <Link
                href={`/events/${event.id}/form`}
                className="w-full rounded-md border border-purple-600 bg-purple-50 py-2 text-center text-sm text-purple-600 transition hover:bg-purple-600 hover:text-white flex items-center justify-center gap-1 mt-2"
              >
                📝 Fill Feedback Form
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
