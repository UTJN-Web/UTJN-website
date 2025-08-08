'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';
import SquarePaymentForm from '@/app/components/SquarePaymentForm';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState<'success' | 'failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const eventId = searchParams.get('eventId');
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
        
        // Redirect free events to direct registration
        if (data.fee === 0) {
          setErrorMessage('This is a free event. Redirecting to direct registration...');
          setTimeout(() => {
            router.push(`/events#event-${eventId}`);
          }, 2000);
          return;
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
      // Process the actual registration
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: parseInt(userId || '0') }),
      });

      if (response.ok) {
        setPaymentResult('success');
        // Redirect to events page after 3 seconds
        setTimeout(() => {
          router.push('/events');
        }, 3000);
      } else {
        setPaymentResult('failed');
        setErrorMessage('Registration failed after payment');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setPaymentResult('failed');
      setErrorMessage('Registration failed after payment');
    }
  };

  const handlePaymentError = (error: string) => {
    setPaymentResult('failed');
    setErrorMessage(error);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading payment page...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {errorMessage || 'Event Not Found'}
          </h1>
          <Link href="/events" className="text-blue-600 hover:text-blue-700">
            Return to Events
          </Link>
        </div>
      </div>
    );
  }

  if (paymentResult === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully registered for <strong>{eventData.name}</strong>
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-700">
              <strong>Amount Paid:</strong> ${eventData.fee.toFixed(2)}
            </p>
            <p className="text-sm text-green-700">
              <strong>Transaction ID:</strong> TXN-{Date.now()}
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Redirecting to events page in 3 seconds...
          </p>
          <Link 
            href="/events"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
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
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link 
              href="/events"
              className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">${eventData.fee.toFixed(2)}</span>
                </div>
                {eventData.fee === 0 && (
                  <p className="text-sm text-green-600 mt-1">This is a free event!</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <SquarePaymentForm
            eventData={eventData}
            userId={userId!}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </div>
      </div>
    </div>
  );
} 