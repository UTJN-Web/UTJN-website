// app/events/page.tsx
'use client';

import { useState, useMemo, useEffect, useContext } from 'react';
import { ChevronDown, ChevronUp, CreditCard, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import { UserContext } from '../contexts/UserContext';
import ConfirmationModal from '../components/ConfirmationModal';
import RefundRequestModal from '../components/RefundRequestModal';
import Toast from '../components/Toast';

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
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<'all' | 'career' | 'social'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [registering, setRegistering] = useState<number | null>(null);

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

  const [toast, setToast] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', type: 'success' });
  const userContext = useContext(UserContext);
  const user = userContext?.user;

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
    fetchEvents();
    
    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      if (!registering) {
        fetchEvents();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [registering]);

  const fetchEvents = async () => {
    try {
      console.log('🔍 Fetching events...');
      
      // Build URL with user email if available
      let url = '/api/events';
      if (user?.email) {
        url += `?user_email=${encodeURIComponent(user.email)}`;
        console.log('🎓 Fetching events for user:', user.email);
      }
      
      const response = await fetch(url);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📅 Received events:', data);
        setEvents(data);
      } else {
        console.error('❌ Failed to fetch events:', response.status);
      }
    } catch (error) {
      console.error('💥 Error fetching events:', error);
    } finally {
      setLoading(false);
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

    // Redirect to payment page
    window.location.href = `/payment?eventId=${eventId}&userId=${user.id}`;
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
    
    if (event && event.fee > 0) {
      // Paid event - show refund request modal
      setRefundModal({
        isOpen: true,
        eventId,
        eventName,
        amount: event.fee
      });
    } else {
      // Free event - show simple confirmation
      setConfirmModal({
        isOpen: true,
        eventId,
        eventName
      });
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
  registering
}: {
  event: Event;
  archived?: boolean;
  user: any;
  onRegister: (eventId: number) => void;
  onFreeRegister?: (eventId: number) => Promise<void>;
  onCancel?: (eventId: number, eventName: string) => void;
  registering: boolean;
}) {
  const date = new Date(event.date);
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
  
  const isUserRegistered = user && (event.registeredUsers || event.registrations || []).some(
    (registration: any) => {
      const registeredUser = registration.user || registration;
      return registeredUser.id === user.id;
    }
  );
  
  const isFull = event.remainingSeats <= 0;

  // Helper function to check if refund is still allowed
  const isRefundAllowed = () => {
    const now = new Date();
    const refundDeadline = event.refundDeadline ? new Date(event.refundDeadline) : new Date(event.date);
    return now <= refundDeadline;
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
            Seats {event.capacity - event.remainingSeats}/{event.capacity}
          </span>
          {!archived && (
            <div className={`mt-1 w-full bg-gray-200 rounded-full h-2 ${
              isFull ? 'bg-red-200' : event.remainingSeats <= 5 ? 'bg-yellow-200' : 'bg-green-200'
            }`}>
              <div 
                className={`h-2 rounded-full ${
                  isFull ? 'bg-red-500' : event.remainingSeats <= 5 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${((event.capacity - event.remainingSeats) / event.capacity) * 100}%` }}
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
          {event.fee > 0 && (
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clipRule="evenodd" />
              </svg>
              Fee: ${event.fee}
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

      <div className="mt-4 flex shrink-0 flex-col items-end gap-2 md:mt-0 md:w-[150px]">
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
        ) : isFull ? (
          <div className="w-full rounded-md border border-red-400 bg-red-50 py-2 text-center text-sm text-red-700">
            Event Full
          </div>
        ) : event.fee === 0 ? (
          <button
            onClick={() => onFreeRegister?.(event.id)}
            disabled={registering || !user}
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
            href={`/payment?eventId=${event.id}&userId=${user?.id}`}
            className="w-full rounded-md border border-[#1c2a52] py-2 text-center text-sm text-[#1c2a52] transition hover:bg-[#1c2a52] hover:text-white flex items-center justify-center gap-1"
          >
            <CreditCard size={16} />
            Pay & Register (${event.fee})
          </Link>
        )}
      </div>
    </article>
  );
}
