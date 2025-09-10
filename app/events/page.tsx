// app/events/page.tsx
'use client';

import { useState, useMemo, useEffect, useContext, useRef } from 'react';
import { ChevronDown, ChevronUp, CreditCard, CheckCircle, X, Coins } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { UserContext } from '../contexts/UserContext';
import ConfirmationModal from '../components/ConfirmationModal';
import RefundRequestModal from '../components/RefundRequestModal';
import Toast from '../components/Toast';
import { ImageIcon } from 'lucide-react';

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
  subEventPrices?: number[];
  subEventCapacities?: number[];
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
  const [showDiscountInfo, setShowDiscountInfo] = useState(false);

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

  const fetchEvents = async () => {
    console.log('🎯 fetchEvents called');
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
        console.log('🌐 Fetching events with user email:', user.email);
      } else {
        console.log('🌐 Fetching events without user email');
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 Fetched events:', data.length);
        console.log('🎯 Raw events data:', data);
        console.log('🎯 Events data type:', typeof data);
        console.log('🎯 Events data is array:', Array.isArray(data));
        
        // Set initial events data
        setEvents(data);
        console.log('🎯 Events state set with length:', data.length);
        
        // Debug: Log detailed event data for Matrix Pricing
        data.forEach((event: any) => {
          if (event.enableAdvancedTicketing && event.enableSubEvents) {
            console.log(`🔍 Matrix Pricing Debug for Event "${event.name}":`, {
              eventId: event.id,
              ticketTiers: event.ticketTiers,
              subEvents: event.subEvents,
              tierCount: event.ticketTiers?.length || 0,
              subEventCount: event.subEvents?.length || 0
            });
          }
        });
        
        console.log('✅ Events data set directly from get_all_events');
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
        }
      } else {
        console.error('❌ Failed to fetch user credits:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching user credits:', error);
    }
  };

  // Initial load - fetch events immediately
  useEffect(() => {
    console.log('🔄 Initial load useEffect triggered');
    fetchEvents();
  }, []);

  // User changes - fetch events with user context and credits
  useEffect(() => {
    console.log('🔄 User useEffect triggered, user:', user);
    if (user) {
      console.log('🔄 User available, fetching events with user context');
      fetchEvents();
      if (user.id) {
        console.log('👤 User ID exists, fetching credits for user:', user.id);
        fetchUserCredits();
      }
    }
  }, [user]);

  // Debug: Monitor events state changes
  useEffect(() => {
    console.log('🔄 Events state changed:', {
      eventsLength: events.length,
      events: events.map(e => ({
        id: e.id,
        name: e.name,
        enableAdvancedTicketing: e.enableAdvancedTicketing,
        enableSubEvents: e.enableSubEvents
      }))
    });
  }, [events]);

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
      enableAdvancedTicketing: e.enableAdvancedTicketing,
      enableSubEvents: e.enableSubEvents,
      ticketTiersCount: e.ticketTiers?.length || 0,
      subEventsCount: e.subEvents?.length || 0,
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
    // TODO: Fix credit usage logic
    // if (useCredits[eventId] && creditsToUse[eventId] > 0) {
    //   paymentUrl += `&useCredits=true&creditsAmount=${creditsToUse[eventId]}`;
    // }

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
      // Get the current tier ID for Advanced Ticketing events
      const event = events.find(e => e.id === eventId);
      const currentTier = event?.ticketTiers?.find(tier => tier.isAvailable);
      
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          tierId: currentTier?.id || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        showToast(
          'Registration Successful!', 
          `Successfully registered for ${data.registration?.eventName || 'the event'}! No payment required.`, 
          'success'
        );

        // Send confirmation email (reuse receipt email as confirmation)
        try {
          const ev = events.find(e => e.id === eventId);
          const eventName = data.registration?.eventName || ev?.name || 'Event';
          const eventDate = ev?.date ? new Date(ev.date) : undefined;
          const dateForEmail = eventDate
            ? eventDate.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
            : new Date().toISOString().slice(0, 10);
          await fetch('/api/receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              event_name: eventName,
              date: dateForEmail
            })
          });
        } catch (emailErr) {
          console.error('Free registration email send failed:', emailErr);
        }

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
      <div
        className="relative min-h-screen w-full flex items-center justify-center"
        style={{
          backgroundImage: "url('/UofT.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark faded overlay */}
        <div className="absolute inset-0 bg-black opacity-20 z-0" />

        {/* Loading content */}
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Events</h2>
          <p className="text-gray-600">Please wait while we fetch the latest events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* ───────── Hero banner with trinity_college.jpg ───────── */}
      <section className="relative h-[36vh] w-full fade-in-up visible">
        <Image
          src="/trinity_college.jpg"
          alt="Member Events"
          fill
          priority
          quality={100}
          sizes="100vw"
          className="object-cover"
        />
        {/* readability overlay */}
        <div className="absolute inset-0 bg-white/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="mx-4 rounded-xl bg-white/40 p-6 text-center backdrop-blur-md shadow-lg md:p-10 max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1c2a52] md:text-4xl">
              Member Events
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 md:text-base">
              トロントでの学生生活をより楽しく、より充実したものに
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Main content ───────── */}
      <section className="w-full px-4 pb-20 pt-10">

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

      <div className="mb-6 flex justify-center">
        <button
          onClick={() => setShowDiscountInfo(true)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-400 px-4 py-2 text-sm transition hover:bg-gray-100 dark:hover:bg-[#171717]"
        >
          割引特典について
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
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
          <div key={event.id}>
            <EventCard
              event={event}
              user={user}
              onRegister={handleRegister}
              onFreeRegister={handleFreeEventRegistration}
              onCancel={handleCancelRegistration}
              registering={registering === event.id}
              userCredits={userCredits}
              useCredits={useCredits[event.id] || false}
              creditsToUse={creditsToUse[event.id] || 0}
              onToggleCredits={(eventId, enabled) =>
                setUseCredits((prev) => ({ ...prev, [eventId]: enabled }))
              }
              onCreditsChange={(eventId, amount) =>
                setCreditsToUse((prev) => ({ ...prev, [eventId]: amount }))
              }
            />
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-gray-300 mb-6 w-full">
            Archived Events
          </h2>
          {archivedEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No archived events found.</p>
            </div>
          ) : (
            archivedEvents.map((event) => (
              <div key={event.id}>
                <EventCard 
                  event={event} 
                  archived 
                  user={user}
                  onRegister={handleRegister}
                  onFreeRegister={handleFreeEventRegistration}
                  onCancel={handleCancelRegistration}
                  registering={false}
                />
              </div>
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

      {/* Discount Info Modal */}
      {showDiscountInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-[#1c2a52] dark:text-blue-300 mb-3">割引特典について</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                Coming Soon...
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDiscountInfo(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-[#171717]"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

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
      </section>
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
  
  // Function to display remaining seats strategically for marketing
  const getRemainingSeatsDisplay = (remaining: number) => {
    if (remaining <= 0) {
      return { text: 'Out of Stock', color: 'text-white', bgColor: 'bg-[#1c2a52]' };
    } else if (remaining < 10) {
      return { text: `Only ${remaining} remaining`, color: 'text-white', bgColor: 'bg-[#1c2a52]' };
    } else {
      return { text: 'In Stock', color: 'text-white', bgColor: 'bg-[#1c2a52]' };
    }
  };
  
  const seatsDisplay = getRemainingSeatsDisplay(effectiveRemainingSeats);
  
  // Helper function to check if refund is still allowed
  const isRefundAllowed = () => {
    const now = new Date();
    const refundDeadline = event.refundDeadline ? new Date(event.refundDeadline) : new Date(event.date);
    return now <= refundDeadline;
  };

  // Get available ticket tiers (for automatic progression)
  const availableTiers = event.ticketTiers?.filter(tier => {
    console.log(`🔍 Tier ${tier.name} (ID: ${tier.id}): isAvailable=${tier.isAvailable}, type=${typeof tier.isAvailable}`);
    return tier.isAvailable;
  }) || [];
  const currentTier = availableTiers.length > 0 ? availableTiers[0] : null; // First available tier

  // Debug: Log ticket tiers availability
  console.log('🎫 Ticket tiers debug for event:', event.name, {
    allTiers: event.ticketTiers?.map(t => ({
      id: t.id,
      name: t.name,
      isAvailable: t.isAvailable,
      remaining_capacity: t.remaining_capacity,
      capacity: t.capacity
    })),
    availableTiers: availableTiers.length,
    currentTier: currentTier?.name || 'null'
  });

  // Get available sub-events
  const availableSubEvents: any[] = [];

  // Debug: Log sub-events availability
  // Sub-events disabled

  

  // Calculate effective values on client side only (after currentTier is defined)
  useEffect(() => {
    // Debug: Log the event data to see what we're working with
    console.log('Event data for price calculation:', {
      eventId: event.id,
      enableAdvancedTicketing: event.enableAdvancedTicketing,
      enableSubEvents: event.enableSubEvents,
      currentTier: currentTier,
      ticketTiers: event.ticketTiers,
      subEvents: event.subEvents
    });

    // Calculate effective capacity and remaining seats using total across all tiers
    let capacity = event.capacity;
    let remaining = event.remainingSeats; // This now comes from backend with correct calculation
    let price: number | string = event.fee;

    if (event.enableAdvancedTicketing && event.ticketTiers && event.ticketTiers.length > 0) {
      // Calculate total capacity from tiers
      const totalCapacity = event.ticketTiers.reduce((total, tier) => total + tier.capacity, 0);
      
      // Use the backend's calculated remaining seats as the source of truth
      // The backend already calculates this correctly using tier.registered_count
      const actualRemaining = event.remainingSeats;
      
      // For debugging, let's see what the backend calculated
      const backendRegistrations = event.ticketTiers.reduce((total, tier) => total + (tier.registered_count || 0), 0);
      const backendRemaining = totalCapacity - backendRegistrations;
      const frontendRegistrations = event.registeredUsers ? event.registeredUsers.length : 0;
      
      // Debug logging for stock calculation
      console.log('🔍 Stock calculation debug for event:', event.name, {
        eventId: event.id,
        tiers: event.ticketTiers.map(t => ({
          name: t.name,
          capacity: t.capacity,
          registered_count: t.registered_count,
          remaining_capacity: t.remaining_capacity
        })),
        totalCapacity,
        eventRemainingSeats: event.remainingSeats,
        backendRegistrations,
        backendRemaining,
        frontendRegistrations,
        eventRemainingSeats: event.remainingSeats,
        actualRemaining,
        registeredUsers: event.registeredUsers?.map((u: any) => ({ id: u.id, email: u.email })) || 'No registeredUsers',
        registeredUsersLength: event.registeredUsers?.length || 0,
        finalRemaining: actualRemaining,
        willShowOutOfStock: actualRemaining <= 0,
        discrepancy: frontendRegistrations !== backendRegistrations ? `FRONTEND: ${frontendRegistrations} vs BACKEND: ${backendRegistrations}` : 'MATCH'
      });
      
      capacity = totalCapacity;
      remaining = actualRemaining; // Use backend's calculated remaining seats
      
      if (currentTier) {
        // For price display, use current tier price
        price = currentTier.price;
      } else {
        // Fallback to regular tier price
        const regularTier = event.ticketTiers.find(t => t.name === 'Regular');
        price = regularTier ? regularTier.price : event.fee;
      }
    }

    setEffectiveCapacity(capacity);
    setEffectiveRemainingSeats(remaining);
    setEffectivePrice(price);
  }, [event, currentTier]);

  // Calculate current price based on selections
  const getCurrentPrice = () => {
    if (event.enableAdvancedTicketing) {
      if (!event.ticketTiers || event.ticketTiers.length === 0) {
        return event.fee;
      }
      if (currentTier) {
        return currentTier.price;
      }
      return event.fee;
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

  const handleSubEventSelection = (_subEventId: number, _checked: boolean) => {
    // Sub-events disabled: no-op
    return;
  };

  return (
    <article className={`w-full flex flex-col md:flex-row rounded-lg border p-4 shadow-sm transition-all hover:shadow-md md:items-center md:gap-4 ${
      archived 
        ? 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600' 
        : 'border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-700'
    }`}>
    
      {/* === LEFT: Image === */}
      <div className="w-full md:w-1/2 min-h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
        {event.image ? (
          <img
            src={event.image}
            alt={event.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <ImageIcon size={48} className="text-gray-400" />
        )}
      </div>

      {/* === RIGHT: Text & Content === */}
      <div className="w-full md:w-1/2 mt-4 md:mt-0 md:pl-6 flex flex-col">
        <div className="flex w-full items-center justify-between md:w-[120px] md:flex-col md:justify-center">
          <span className="text-2xl font-bold md:text-3xl text-[#1c2a52] dark:text-blue-400">
            {dateLabel}
          </span>
          <div className="text-center">
            <span className={`text-sm font-medium block px-2 py-1 rounded ${seatsDisplay.color} ${seatsDisplay.bgColor}`}>
              {seatsDisplay.text}
            </span>
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
              {event.type === 'career' ? 'Career' : 'Social'}
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
                {event.enableAdvancedTicketing && currentTier && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded ml-1">
                    {currentTier.name}
                  </span>
                )}
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

        <div className="mt-4 flex shrink-0 flex-col gap-3 md:mt-0 w-full">
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
              <div className="w-full rounded-md border border-[#1c2a52] bg-[#1c2a52] py-2 text-center text-sm text-white flex items-center justify-center gap-1">
                <CheckCircle size={16} />
                Registered
              </div>
              {!archived && onCancel && isRefundAllowed() && (
                <button
                  onClick={() => onCancel(event.id, event.name)}
                  disabled={registering}
                  className="w-full rounded-md border border-[#1c2a52] py-1 text-center text-xs text-[#1c2a52] transition hover:bg-[#1c2a52] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
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
                <div className="w-full rounded-md border border-[#1c2a52] bg-[#1c2a52] py-1 text-center text-xs text-white">
                  Refund period expired
                </div>
              )}
            </div>
          ) : !canRegister() ? (
            <div className="w-full space-y-2">
              {/* Only show "no tickets" if we're NOT falling back to basic registration */}
              {event.enableAdvancedTicketing && !currentTier && event.ticketTiers && event.ticketTiers.length > 0 && (
                <div className="w-full rounded-md border border-[#1c2a52] bg-[#1c2a52] py-2 text-center text-sm text-white">
                  No tickets available
                </div>
              )}
              {!event.enableAdvancedTicketing && !event.enableSubEvents && isFull && (
                <div className="w-full rounded-md border border-[#1c2a52] bg-[#1c2a52] py-2 text-center text-sm text-white">
                  Event Full
                </div>
              )}
              
            </div>
          ) : (
            <div className="w-full space-y-2">
              {/* Ticket Tier Display */}
              {event.enableAdvancedTicketing && currentTier && (
                <div className="w-full border border-blue-200 bg-blue-50 rounded-md p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-blue-900">{currentTier.name}</div>
                    <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      Current Tier
                    </div>
                  </div>
                  <div className="text-blue-700 font-semibold text-lg">
                    ${(() => {
                      // If this tier has subEventPrices and the event has sub-events, show price range
                      if (currentTier.subEventPrices && event.enableSubEvents && event.subEvents && event.subEvents.length > 0) {
                        const prices = currentTier.subEventPrices.filter((p: number) => p > 0);
                        if (prices.length > 0) {
                          const minPrice = Math.min(...prices);
                          const maxPrice = Math.max(...prices);
                          return minPrice === maxPrice ? minPrice : `${minPrice}-${maxPrice}`;
                        }
                      }
                      // Otherwise show the tier's base price
                      return Number(currentTier.price).toFixed(2).replace(/\.00$/, '');
                    })()}
                  </div>
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
                            {tier.name}: ${(() => {
                              // If this tier has subEventPrices and the event has sub-events, show price range
                              if (tier.subEventPrices && event.enableSubEvents && event.subEvents && event.subEvents.length > 0) {
                                const prices = tier.subEventPrices.filter((p: number) => p > 0);
                                if (prices.length > 0) {
                                  const minPrice = Math.min(...prices);
                                  const maxPrice = Math.max(...prices);
                                  return minPrice === maxPrice ? minPrice : `${minPrice}-${maxPrice}`;
                                }
                              }
                              return Number(tier.price).toFixed(2).replace(/\.00$/, '');
                            })()}
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
                  Total: ${(() => {
                    const basePrice = getCurrentPrice();
                    if (useCredits && creditsToUse > 0) {
                      const finalPrice = Math.max(0, basePrice - creditsToUse);
                      return finalPrice.toFixed(2).replace(/\.00$/, '');
                    }
                    return basePrice;
                  })()}
                  {useCredits && creditsToUse > 0 && (
                    <span className="text-sm text-green-600 ml-2">
                      (${getCurrentPrice()} - ${creditsToUse} credits)
                    </span>
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
                  href={`/payment?eventId=${event.id}&userId=${user?.id}&tierId=${currentTier?.id || ''}&price=${getCurrentPrice()}&useCredits=${useCredits}&creditsAmount=${creditsToUse}`}
                  className={`w-full rounded-md border py-2 text-center text-sm transition flex items-center justify-center gap-1 ${
                    canRegister()
                      ? 'border-[#1c2a52] text-[#1c2a52] hover:bg-[#1c2a52] hover:text-white'
                      : 'border-gray-400 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CreditCard size={16} />
                  <>Pay & Register (${(() => {
                    const basePrice = getCurrentPrice();
                    if (useCredits && creditsToUse > 0) {
                      const finalPrice = Math.max(0, basePrice - creditsToUse);
                      return finalPrice.toFixed(2).replace(/\.00$/, '');
                    }
                    return basePrice;
                  })()})</>
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
      </div>
    </article>
  );
}