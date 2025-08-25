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
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

export default function SquarePaymentForm({ 
  eventData, 
  userId, 
  onPaymentSuccess, 
  onPaymentError 
}: SquarePaymentFormProps) {
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState('');
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
    console.log('Environment check:', {
      applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
      locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
      nodeEnv: process.env.NODE_ENV
    });

    const initializeSquare = async () => {
      if (!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || !process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID) {
        console.error('Missing Square environment variables');
        onPaymentError('Square configuration is missing. Please check environment variables.');
        return;
      }

      if (!window.Square) {
        console.log('Loading Square SDK...');
        // Load Square Web Payments SDK for Sandbox
        const script = document.createElement('script');
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use sandbox URL
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
          applicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
          locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID,
        });

        if (!window.Square) {
          throw new Error('Square SDK not loaded');
        }

        const paymentsInstance = window.Square.payments(
          process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID!,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
        );
        
        // Configure for sandbox environment
        if (process.env.NODE_ENV === 'development') {
          console.log('Configuring Square for sandbox environment');
        }
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

  const handlePaymentSubmission = async () => {
    if (!card || !email.trim()) {
      onPaymentError('Please fill in all required fields');
      return;
    }

    setProcessing(true);
    console.log('Starting payment submission...');

    try {
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
          email: email.trim(),
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
          onPaymentSuccess();
        } else {
          console.error('Payment failed:', data.error);
          onPaymentError(data.error || 'Payment processing failed');
        }
      } else {
        console.error('Card tokenization failed:', result);
        onPaymentError(result.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      onPaymentError('Payment processing failed');
    } finally {
      setProcessing(false);
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
        {/* Email for receipt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address (for receipt) *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
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
          disabled={processing || !card || !email.trim()}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
            processing || !card || !email.trim()
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