'use client';

import { useState, useEffect, Suspense, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { UserContext } from '@/app/contexts/UserContext';
import { ArrowLeft, CheckCircle, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import SquarePaymentForm from '@/app/components/SquarePaymentForm';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function PaymentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userContext = useContext(UserContext);
  const user = userContext?.user;
  
  const [eventData, setEventData] = useState<any>(null);
  const [ticketTierData, setTicketTierData] = useState<any>(null);
  const [subEventData, setSubEventData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState<'success' | 'failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Removed coupon functionality - credits are now the primary discount method
  const [finalPrice, setFinalPrice] = useState<number>(0);
  
  // Credit usage state
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [creditsLoading, setCreditsLoading] = useState<boolean>(false);

  const eventId = searchParams.get('eventId');
  const userIdFromUrl = searchParams.get('userId');
  const tierId = searchParams.get('tierId');
  const subEventIds = searchParams.get('subEventIds');
  const price = searchParams.get('price');
  const useCreditsParam = searchParams.get('useCredits');
  const creditsAmountParam = searchParams.get('creditsAmount');

  // Enhanced userId validation function
  const getUserId = (): string => {
    const urlUserId = userIdFromUrl && userIdFromUrl !== 'undefined' ? userIdFromUrl : null;
    const contextUserId = user?.id?.toString();
    
    console.log('User ID validation:', {
      urlUserId,
      contextUserId,
      userExists: !!user,
      userContextLoading: userContext?.isLoading
    });
    
    if (!urlUserId && !contextUserId) {
      throw new Error('User ID is required for payment. Please ensure you are logged in.');
    }
    
    return urlUserId || contextUserId || '';
  };

  // Get validated userId
  const userId = getUserId();

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
    if (userId || user?.id) {
      fetchUserCredits();
    }
  }, [eventId, userId, user?.id]);

  // Enhanced session validation
  const validateUserSession = async (): Promise<boolean> => {
    try {
      // Check if user context is still loading
      if (userContext.isLoading) {
        console.log('User context is still loading...');
        return false;
      }

      // Check if user exists in context
      if (!user) {
        console.log('No user found in context');
        return false;
      }

      // Validate user ID
      if (!user.id) {
        console.log('User ID is missing');
        return false;
      }

      // Optional: Verify session with backend
      try {
        const response = await fetch(`/api/users/profile?email=${encodeURIComponent(user.email)}`);
        if (!response.ok) {
          console.log('Session validation failed with backend');
          return false;
        }
        const data = await response.json();
        if (!data.success || !data.user) {
          console.log('Invalid user profile from backend');
          return false;
        }
      } catch (error) {
        console.log('Backend session validation error:', error);
        // Don't fail if backend validation fails, just log it
      }

      console.log('Session validation successful');
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  };

  // Validate that user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (!userContext.isLoading) {
        const isValid = await validateUserSession();
        if (!isValid) {
          setErrorMessage('Your session has expired. Please log in again to make a payment.');
          setPaymentResult('failed');
        }
      }
    };

    checkAuth();
  }, [user, userContext.isLoading]);

  const fetchUserCredits = async () => {
    const userIdToUse = userId || user?.id?.toString();
    if (!userIdToUse) return;
    
    setCreditsLoading(true);
    try {
      const response = await fetch(`/api/users/credits?userId=${userIdToUse}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.credits) {
          setAvailableCredits(data.credits.credits || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user credits:', error);
    } finally {
      setCreditsLoading(false);
    }
  };

  // Coupon functionality removed - using credits instead

  const applyCredits = (creditsToApply: number) => {
    const maxCreditsAllowed = Math.min(availableCredits, originalPrice);
    const actualCreditsToApply = Math.min(creditsToApply, maxCreditsAllowed);
    
    setCreditsUsed(actualCreditsToApply);
    
    // Recalculate final price with credits
    const newFinalPrice = Math.max(0, originalPrice - actualCreditsToApply);
    setFinalPrice(newFinalPrice);
  };

  const removeCredits = () => {
    setCreditsUsed(0);
    
    // Recalculate price without credits
    setFinalPrice(originalPrice);
  };

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
        
        // Get the actual price from URL params or calculate effective price
        const effectivePrice = price ? parseFloat(price) : data.fee;
        setOriginalPrice(effectivePrice);
        
        // Handle credit usage if specified
        if (useCreditsParam === 'true' && creditsAmountParam) {
          const creditsAmount = parseFloat(creditsAmountParam);
          setCreditsUsed(creditsAmount);
          setFinalPrice(Math.max(0, effectivePrice - creditsAmount));
        } else {
          setFinalPrice(effectivePrice);
        }
        
        // Redirect free events to direct registration (only if no price override)
        if (effectivePrice === 0) {
          setErrorMessage('This is a free event. Redirecting to direct registration...');
          setTimeout(() => {
            router.push(`/events#event-${eventId}`);
          }, 2000);
          return;
        }

        // Fetch tier data if tierId is provided
        if (tierId && tierId !== '') {
          try {
            const tierResponse = await fetch(`/api/events/${eventId}/ticket-options`);
            if (tierResponse.ok) {
              const tierData = await tierResponse.json();
              const selectedTier = tierData.ticketTiers?.find((tier: any) => tier.id.toString() === tierId);
              setTicketTierData(selectedTier);
            }
          } catch (error) {
            console.error('Failed to fetch tier data:', error);
          }
        }

        // Fetch sub-event data if subEventIds are provided
        if (subEventIds && subEventIds !== '') {
          try {
            const subEventResponse = await fetch(`/api/events/${eventId}/ticket-options`);
            if (subEventResponse.ok) {
              const subEventData = await subEventResponse.json();
              const selectedSubEventIds = subEventIds.split(',').map(id => parseInt(id));
              const selectedSubEvents = subEventData.subEvents?.filter((se: any) => 
                selectedSubEventIds.includes(se.id)
              ) || [];
              setSubEventData(selectedSubEvents);
            }
          } catch (error) {
            console.error('Failed to fetch sub-event data:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch event data:', error);
      setErrorMessage('Failed to load event information');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Validate session before processing registration
      const isSessionValid = await validateUserSession();
      if (!isSessionValid) {
        setPaymentResult('failed');
        setErrorMessage('Your session has expired. Please log in again to complete registration.');
        return;
      }

      // Get payment ID from window if available
      const paymentId = (window as any).lastPaymentId;
      console.log('Processing registration with payment ID:', paymentId);
      
      if (!paymentId) {
        setPaymentResult('failed');
        setErrorMessage('Payment ID not found. Please contact support if payment was processed.');
        return;
      }

      // Get validated userId
      let userIdToUse: string;
      try {
        userIdToUse = getUserId();
      } catch (error) {
        setPaymentResult('failed');
        setErrorMessage(error instanceof Error ? error.message : 'User ID validation failed');
        return;
      }
      
      // Spend credits first if they were used
      if (creditsUsed > 0 && userIdToUse) {
        try {
          const creditResponse = await fetch('/api/users/credits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: parseInt(userIdToUse),
              amount: creditsUsed,
              description: `Event registration: ${eventData?.name}`,
              eventId: parseInt(eventId || '0')
            }),
          });
          
          if (!creditResponse.ok) {
            const errorData = await creditResponse.text();
            console.error('Failed to spend credits:', errorData);
            setPaymentResult('failed');
            setErrorMessage('Failed to apply credit discount');
            return;
          }
          
          console.log(`✅ Successfully spent ${creditsUsed} credits for user ${userIdToUse}`);
        } catch (creditError) {
          console.error('Error spending credits:', creditError);
          setPaymentResult('failed');
          setErrorMessage('Failed to process credit discount');
          return;
        }
      }
      
      // Process the actual registration (credits already deducted above)
      console.log('Sending registration request:', {
        userId: parseInt(userIdToUse),
        paymentId,
        eventId,
        tierId: tierId ? parseInt(tierId) : null,
        subEventIds: subEventIds ? subEventIds.split(',').map(id => parseInt(id)) : [],
        creditsUsed,
        finalPrice,
        paymentEmail: user?.email
      });

      // Check if we have a reservation to convert
      const reservationId = (window as any).currentReservationId;
      
      const response = await fetch(`/api/events/${eventId}/register/paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: parseInt(userIdToUse),
          paymentId: paymentId,
          tierId: tierId ? parseInt(tierId) : null,
          subEventIds: subEventIds ? subEventIds.split(',').map((id: string) => parseInt(id)) : [],
          creditsUsed: creditsUsed, // For logging purposes only
          finalPrice: finalPrice,
          paymentEmail: user?.email, // Use user's account email
          reservationId: reservationId // Include reservation ID for conversion
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Registration failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        // Note: Automatic refund is handled by backend to prevent double refunds

        // Enhanced error handling based on specific error types
        if (response.status === 400) {
          if (errorData.error?.includes('User ID is required')) {
            setErrorMessage('User session expired. Please log in again to complete registration. An automatic refund has been processed.');
          } else if (errorData.error?.includes('Event not found')) {
            setErrorMessage('Event not found. Please contact support. An automatic refund has been processed.');
          } else if (errorData.error?.includes('no longer available')) {
            setErrorMessage('Event or ticket tier is no longer available. An automatic refund has been processed.');
          } else {
            setErrorMessage(`Registration failed: ${errorData.error || 'Invalid request'}. An automatic refund has been processed.`);
          }
        } else if (response.status === 500) {
          setErrorMessage('Server error during registration. An automatic refund has been processed. You will receive a refund confirmation email shortly.');
        } else {
          setErrorMessage(`Registration failed (${response.status}). An automatic refund has been processed. You will receive a refund confirmation email shortly.`);
        }
        
        setPaymentResult('failed');
        return;
      }

      // Try to send receipt, but don't fail the entire transaction if it fails
      let receiptSent = false;
      let receiptError = null;
      
      try {
        // Use the user's account email
        const buyerEmail = user?.email;
        if (!buyerEmail) {
          throw new Error('Unable to determine buyer email for receipt.');
        }
  
        // Format date you want to show on the receipt (or pass server-side)
        const iso = new Date(eventData.date);
        const receiptDate = iso.toLocaleString('en-CA', { year:'numeric', month:'2-digit', day:'2-digit' });
  
        const receiptRes = await fetch('/api/receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: buyerEmail,
            event_name: eventData.name,
            date: receiptDate
          })
        });
  
        if (receiptRes.ok) {
          receiptSent = true;
        } else {
          const err = await receiptRes.json().catch(() => ({}));
          receiptError = err?.detail || 'Failed to send receipt';
          console.error('Receipt sending failed:', receiptError);
        }
      } catch (receiptErr: any) {
        console.error('Receipt error:', receiptErr);
        receiptError = receiptErr.message || 'Failed to send receipt';
      }
      
      // Store receipt status for display
      (window as any).receiptSent = receiptSent;
      (window as any).receiptError = receiptError;

    setPaymentResult('success');
    // Do not auto-redirect; show success until user navigates away manually

    } catch (error) {
      console.error('Registration error:', error);
      
      // Note: Automatic refund is handled by backend to prevent double refunds
      
      setPaymentResult('failed');
      
      // Enhanced error message based on error type
      if (error instanceof Error) {
        if (error.message.includes('User ID is required')) {
          setErrorMessage('User session expired. Please log in again to complete registration. An automatic refund has been processed.');
        } else if (error.message.includes('session')) {
          setErrorMessage('Your session has expired. Please log in again to complete registration. An automatic refund has been processed.');
        } else {
          setErrorMessage(`Registration failed: ${error.message}. An automatic refund has been processed.`);
        }
      } else {
        setErrorMessage('An unexpected error occurred during registration. An automatic refund has been processed.');
      }
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentResult('failed');
    setErrorMessage(error);
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
          <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Loading Payment</h2>
          <p className="text-gray-600">Please wait while we prepare your payment page...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
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

        {/* Error content */}
        <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded shadow-lg backdrop-blur-sm text-center">
          <h1 className="text-2xl font-bold text-[#1c2a52] mb-4">
            {errorMessage || 'Event Not Found'}
          </h1>
          <Link href="/events" className="text-[#1c2a52] hover:text-[#1c2a52]/80 font-medium">
            Return to Events
          </Link>
        </div>
      </div>
    );
  }

  if (paymentResult === 'success') {
    const receiptSent = (window as any).receiptSent;
    const receiptError = (window as any).receiptError;
    
    // Check if event has external URL and open it
    useEffect(() => {
      if (eventData?.url) {
        // Open external URL in new window
        window.open(eventData.url, '_blank', 'noopener,noreferrer');
      }
    }, [eventData?.url]);
    
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

        {/* Success content */}
        <div className="relative z-10 max-w-md w-full bg-white bg-opacity-95 rounded-xl shadow-lg backdrop-blur-sm p-8 text-center mx-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1c2a52] mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully registered for <strong>{eventData.name}</strong>
          </p>
          {eventData?.url && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700">
                <strong>External Registration:</strong> A new window has opened for additional registration with the event organizer.
              </p>
            </div>
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-700">
              <strong>Amount Paid:</strong> ${price ? parseFloat(price).toFixed(2) : eventData.fee.toFixed(2)}
            </p>
            <p className="text-sm text-green-700">
              <strong>Transaction ID:</strong> TXN-{Date.now()}
            </p>
            {ticketTierData && (
              <p className="text-sm text-green-700">
                <strong>Ticket Tier:</strong> {ticketTierData.name}
              </p>
            )}
          </div>
          
          {/* Receipt Status */}
          {receiptSent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <p className="text-sm text-green-700">Receipt sent successfully</p>
              </div>
            </div>
          ) : receiptError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Receipt could not be sent, but your registration is complete
                </p>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Error: {receiptError}
              </p>
            </div>
          )}
          
          {/* No auto-redirect; keep user here until they choose to leave */}
          <Link 
            href="/events"
            className="inline-flex items-center px-4 py-2 bg-[#1c2a52] text-white rounded-lg hover:bg-[#1c2a52]/90 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (paymentResult === 'failed') {
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

        {/* Failed content */}
        <div className="relative z-10 max-w-md w-full bg-white bg-opacity-95 rounded-xl shadow-lg backdrop-blur-sm p-8 text-center mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1c2a52] mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-4">
            {errorMessage || 'Unfortunately, your payment could not be processed. Please try again.'}
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => {
                setPaymentResult(null);
                setErrorMessage('');
                window.location.reload();
              }}
              className="w-full px-4 py-2 bg-[#1c2a52] text-white rounded-lg hover:bg-[#1c2a52]/90 transition-colors"
            >
              Try Again
            </button>
            <Link 
              href="/events"
              className="block w-full px-4 py-2 border border-[#1c2a52] text-[#1c2a52] rounded-lg hover:bg-[#1c2a52]/10 transition-colors"
            >
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const eventDate = new Date(eventData.date);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/events"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Events
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="text-gray-600 mt-2">Secure payment powered by Square</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Summary</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900">{eventData.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{eventData.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{eventDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <p className="font-medium">{eventDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</p>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>
                  <p className="font-medium capitalize">{eventData.type}</p>
                </div>
                <div>
                  <span className="text-gray-500">Target:</span>
                  <p className="font-medium">{eventData.targetYear}</p>
                </div>
              </div>
              
              {/* Ticket Details */}
              {ticketTierData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">🎫 Ticket Tier</h4>
                  <div className="text-sm text-blue-800">
                    <p><strong>{ticketTierData.name}</strong></p>
                    <p>Price: ${ticketTierData.price}</p>
                    {ticketTierData.targetYear !== 'All years' && (
                      <p>Target: {ticketTierData.targetYear}</p>
                    )}
                  </div>
                </div>
              )}

              {subEventData.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">🎊 Sub-Events</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    {subEventData.map((subEvent, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{subEvent.name}</span>
                        <span>${subEvent.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Coupon section removed - using credits instead */}
              
              {/* Credits selection UI removed - credits are pre-applied from member event page */}
              
              <div className="border-t pt-4">
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>${originalPrice.toFixed(2)}</span>
                  </div>
                  {creditsUsed > 0 && (
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Credits Applied:</span>
                      <span>-${creditsUsed.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${finalPrice.toFixed(2)}
                  </span>
                </div>
                {finalPrice === 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {creditsUsed > 0 ? 'Free with credits!' : 'This is a free event!'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          {finalPrice > 0 ? (
            userId ? (
              <SquarePaymentForm
                eventData={{
                  ...eventData,
                  fee: finalPrice
                }}
                userId={userId}
                userEmail={user?.email || ''}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
                  <p className="text-gray-600 mb-6">
                    Unable to identify your user account. Please refresh the page and try again.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Free Registration</h2>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Required</h3>
                <p className="text-gray-600 mb-6">
                  {creditsUsed > 0 ? 'Your credits cover the full amount!' : 'This is a free event.'}
                </p>
                <button
                  onClick={() => {
                    // Direct registration for free events (with credits if used)
                    handlePaymentSuccess();
                  }}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {creditsUsed > 0 ? 'Complete Registration with Credits' : 'Complete Free Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentForm />
    </Suspense>
  );
} 