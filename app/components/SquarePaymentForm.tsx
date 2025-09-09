'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, CreditCard } from 'lucide-react';

// Square Web Payments SDK types
declare global {
  interface Window {
    Square: any;
  }
}

interface SquarePaymentFormProps {
  eventData: any;
  userId: string;
  userEmail: string; // Add user email prop
  onPaymentSuccess: () => void; // Remove email parameter
  onPaymentError: (error: string) => void;
}

export default function SquarePaymentForm({ 
  eventData, 
  userId, 
  userEmail,
  onPaymentSuccess, 
  onPaymentError 
}: SquarePaymentFormProps) {
  const [processing, setProcessing] = useState(false);
  const [payments, setPayments] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [initialized, setInitialized] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized) {
      console.log('Square payment form already initialized, skipping...');
      return;
    }
    setInitialized(true);

    // First, let's verify environment variables are loaded
    const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
    const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
    const isSandbox = applicationId?.startsWith('sandbox-');
    
    console.log('Environment check:', {
      applicationId: applicationId,
      locationId: locationId,
      nodeEnv: process.env.NODE_ENV,
      isSandbox: isSandbox
    });

    const initializeSquare = async () => {
      if (!applicationId || !locationId) {
        console.error('Missing Square environment variables');
        onPaymentError('Square configuration is missing. Please check environment variables.');
        return;
      }
      
      // Validate application ID format
      if (!isSandbox && !applicationId.startsWith('sq0idp-')) {
        console.error('Invalid production application ID format');
        onPaymentError('Invalid Square application ID format for production environment.');
        return;
      }
      
      if (isSandbox && !applicationId.startsWith('sandbox-sq0idb-')) {
        console.error('Invalid sandbox application ID format');
        onPaymentError('Invalid Square application ID format for sandbox environment.');
        return;
      }

      if (!window.Square) {
        console.log('Loading Square SDK...');
        
        // Determine SDK URL based on application ID
        const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
        const isSandbox = applicationId?.startsWith('sandbox-');
        
        const sdkUrl = isSandbox 
          ? 'https://sandbox.web.squarecdn.com/v1/square.js'
          : 'https://web.squarecdn.com/v1/square.js';
        
        console.log(`Loading Square SDK from: ${sdkUrl} (${isSandbox ? 'Sandbox' : 'Production'})`);
        
        const script = document.createElement('script');
        script.src = sdkUrl;
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = () => {
          console.log('Square SDK loaded successfully');
          initPayments();
        };
        
        script.onerror = () => {
          console.error('Failed to load Square SDK');
          onPaymentError('Failed to load Square payment system');
        };
      } else {
        console.log('Square SDK already loaded');
        initPayments();
      }
    };

    const initPayments = async () => {
      try {
        console.log('Initializing Square payments with:', {
          applicationId: applicationId,
          locationId: locationId,
          isSandbox: isSandbox
        });

        if (!window.Square) {
          throw new Error('Square SDK not loaded');
        }

        const paymentsInstance = window.Square.payments(
          applicationId,
          locationId
        );
        
        // Log environment configuration
        console.log(`Configuring Square for ${isSandbox ? 'sandbox' : 'production'} environment`);
        setPayments(paymentsInstance);
        console.log('Square payments instance created');

        const cardInstance = await paymentsInstance.card({
          style: {
            input: {
              fontSize: '16px',
              fontFamily: 'Arial, sans-serif',
            },
          },
          // Enable Canadian postal codes
          includeInputLabels: true,
        });
        console.log('Square card instance created');
        
        if (!cardContainerRef.current) {
          throw new Error('Card container ref is null');
        }
        
        // Clear container first to avoid duplicates
        if (cardContainerRef.current) {
          cardContainerRef.current.innerHTML = '';
        }
        
        await cardInstance.attach(cardContainerRef.current);
        setCard(cardInstance);
        console.log('Square payment form initialized successfully');
      } catch (error: any) {
        console.error('Failed to initialize Square payments:', error);
        onPaymentError(`Failed to initialize payment form: ${error?.message || 'Unknown error'}`);
      }
    };

    initializeSquare();

    return () => {
      if (card) {
        console.log('Destroying Square card instance');
        try {
          card.destroy();
        } catch (error) {
          console.error('Error destroying card instance:', error);
        }
      }
      // Clear the container
      if (cardContainerRef.current) {
        cardContainerRef.current.innerHTML = '';
      }
    };
  }, []); // Run only once on mount

  // Helper function to clean up reservation
  const cleanupReservation = async (reason: string) => {
    const reservationId = (window as any).currentReservationId;
    if (reservationId) {
      console.log(`Cleaning up reservation ${reservationId} due to ${reason}`);
      try {
        const response = await fetch(`/api/events/${eventData.id}/reserve/${reservationId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId
          })
        });
        
        if (response.ok) {
          console.log(`✅ Reservation ${reservationId} cleaned up successfully`);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`⚠️ Reservation cleanup failed: ${errorData.error}`);
        }
      } catch (cleanupError) {
        console.error(`❌ Failed to clean up reservation ${reservationId}:`, cleanupError);
      }
    }
  };

  const handlePaymentSubmission = async () => {
    if (!card) {
      onPaymentError('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    console.log('Starting payment submission...');

    try {
      // Create reservation BEFORE processing payment to prevent race conditions
      console.log('Creating reservation before payment...');
      const reservationResponse = await fetch(`/api/events/${eventData.id}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          tierId: null, // Could be enhanced to support tier selection
          subEventIds: [],
          finalPrice: eventData.fee,
          paymentEmail: userEmail
        })
      });

      if (!reservationResponse.ok) {
        const errorData = await reservationResponse.json().catch(() => ({ error: 'Unknown error' }));
        setProcessing(false);
        onPaymentError(errorData.error || 'Failed to reserve spot. Event may be full.');
        return;
      }

      const reservationData = await reservationResponse.json();
      console.log(`Reservation created: ${reservationData.reservationId}`);
      
      // Store reservation ID for later use
      (window as any).currentReservationId = reservationData.reservationId;

      // Tokenize the card
      console.log('Tokenizing card...');
      const result = await card.tokenize();
      console.log('Tokenization result:', result);
      
      if (result.status === 'OK') {
        console.log('Card tokenized successfully, processing payment...');
        
        // Process the payment with our API
        const paymentData = {
          sourceId: result.token,
          amount: eventData.fee,
          eventId: eventData.id,
          userId: userId,
          email: userEmail, // Use user's account email
        };
        console.log('Sending payment data:', paymentData);

        const response = await fetch('/api/create-square-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });

        console.log('Payment API response status:', response.status);
        const data = await response.json();
        console.log('Payment API response data:', data);

        if (response.ok && data.success) {
          console.log('Payment successful!', data);
          // Pass payment ID to success handler if available
          if (data.paymentId) {
            console.log('Payment ID received:', data.paymentId);
            // Store payment ID for registration
            (window as any).lastPaymentId = data.paymentId;
          }
          // Keep showing Processing overlay until parent completes registration & shows success
          onPaymentSuccess();
        } else {
          console.error('Payment failed:', data.error);
          setProcessing(false);
          
          // Clean up reservation on payment failure
          await cleanupReservation('payment failure');
          
          onPaymentError(data.error || 'Payment processing failed');
        }
      } else {
        console.error('Card tokenization failed:', result);
        setProcessing(false);
        
        // Clean up reservation on tokenization failure
        await cleanupReservation('tokenization failure');
        
        onPaymentError(result.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setProcessing(false);
      
      // Clean up reservation on general error
      await cleanupReservation('general error');
      
      onPaymentError('Payment processing failed');
    }
  };

  return (
    <>
      {/* Full-screen loading overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{
               backgroundImage: "url('/UofT.jpg')",
               backgroundSize: "cover",
               backgroundPosition: "center",
               backgroundRepeat: "no-repeat",
             }}>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black opacity-40" />
          
          {/* Loading content */}
          <div className="relative z-10 w-full max-w-md bg-white bg-opacity-95 p-8 rounded-lg shadow-xl backdrop-blur-sm text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#1c2a52] border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-[#1c2a52] mb-2">Processing Payment</h2>
            <p className="text-gray-600">Please wait while we process your payment securely...</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center mb-6">
          <Lock className="w-5 h-5 text-green-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Payment Information</h2>
        </div>
      
      <div className="space-y-6">
        {/* User email display (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address (for receipt)
          </label>
          <input
            type="email"
            value={userEmail}
            readOnly
            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
          <p className="text-sm text-gray-500 mt-1">
            Receipt will be sent to your account email address
          </p>
        </div>

        {/* Square Card Container */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="w-4 h-4 inline mr-1" />
            Card Information *
          </label>
          <div 
            ref={cardContainerRef}
            className="w-full p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
            style={{ minHeight: '100px' }}
          />
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePaymentSubmission}
          disabled={processing || !card}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            processing || !card
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-4 border-white border-t-transparent mr-2"></div>
              Processing Payment...
            </div>
          ) : (
            `Pay $${eventData.fee.toFixed(2)}`
          )}
        </button>

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <Lock className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Secure Payment</p>
              <p className="text-sm text-green-600 mt-1">
                Your payment information is processed securely by Square. We never store your payment details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
} 