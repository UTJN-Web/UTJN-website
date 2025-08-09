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
  const [ticketTierData, setTicketTierData] = useState<any>(null);
  const [subEventData, setSubEventData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState<'success' | 'failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Coupon state
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string>('');
  const [finalPrice, setFinalPrice] = useState<number>(0);

  const eventId = searchParams.get('eventId');
  const userId = searchParams.get('userId');
  const tierId = searchParams.get('tierId');
  const subEventIds = searchParams.get('subEventIds');
  const price = searchParams.get('price');

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const validateCoupon = async () => {
    if (!couponCode.trim() || !eventId || !userId) return;
    
    setCouponValidating(true);
    setCouponError('');
    
    try {
      const response = await fetch('/api/forms/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          couponCode: couponCode.trim(),
          userId: parseInt(userId),
          eventId: parseInt(eventId)
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponError('');
        
        // Calculate discount
        const originalPrice = price ? parseFloat(price) : eventData?.fee || 0;
        let discountAmount = 0;
        
        if (data.coupon.discountType === 'percentage') {
          discountAmount = originalPrice * (data.coupon.discountValue / 100);
        } else {
          discountAmount = data.coupon.discountValue;
        }
        
        // Apply minimum amount check
        if (data.coupon.minAmount && originalPrice < data.coupon.minAmount) {
          setCouponError(`Minimum order amount is $${data.coupon.minAmount}`);
          setAppliedCoupon(null);
          return;
        }
        
        const newPrice = Math.max(0, originalPrice - discountAmount);
        setFinalPrice(newPrice);
      } else {
        setCouponError(data.message || 'Invalid coupon code');
        setAppliedCoupon(null);
        setFinalPrice(price ? parseFloat(price) : eventData?.fee || 0);
      }
    } catch (error) {
      console.error('Error validating coupon:', error);
      setCouponError('Error validating coupon. Please try again.');
      setAppliedCoupon(null);
    } finally {
      setCouponValidating(false);
    }
  };
  
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setFinalPrice(price ? parseFloat(price) : eventData?.fee || 0);
  };

  const fetchEventData = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventData(data);
        
        // Get the actual price from URL params or calculate effective price
        const effectivePrice = price ? parseFloat(price) : data.fee;
        setFinalPrice(effectivePrice);
        
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
      // Get payment ID from window if available
      const paymentId = (window as any).lastPaymentId;
      console.log('Processing registration with payment ID:', paymentId);
      
      // Process the actual registration
      const response = await fetch(`/api/events/${eventId}/register/paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: parseInt(userId || '0'),
          paymentId: paymentId,
          tierId: tierId ? parseInt(tierId) : null,
          subEventIds: subEventIds ? subEventIds.split(',').map(id => parseInt(id)) : []
        }),
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
              
              {/* Coupon Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">🎟️ Discount Coupon</h4>
                {!appliedCoupon ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={couponValidating}
                      />
                      <button
                        onClick={validateCoupon}
                        disabled={!couponCode.trim() || couponValidating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {couponValidating ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-sm text-red-600">{couponError}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-900">{appliedCoupon.name}</p>
                        <p className="text-sm text-green-700">
                          Code: {appliedCoupon.code} • 
                          {appliedCoupon.discountType === 'percentage' 
                            ? ` ${appliedCoupon.discountValue}% off`
                            : ` $${appliedCoupon.discountValue} off`}
                        </p>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="p-1 text-green-600 hover:text-green-800"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4">
                {appliedCoupon && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>${price ? parseFloat(price).toFixed(2) : eventData.fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedCoupon.code}):</span>
                      <span>-${((price ? parseFloat(price) : eventData.fee) - finalPrice).toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${finalPrice.toFixed(2)}
                  </span>
                </div>
                {finalPrice === 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {appliedCoupon ? 'Free with coupon!' : 'This is a free event!'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          {finalPrice > 0 ? (
            <SquarePaymentForm
              eventData={{
                ...eventData,
                fee: finalPrice
              }}
              userId={userId!}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Free Registration</h2>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Required</h3>
                <p className="text-gray-600 mb-6">
                  {appliedCoupon ? 'Your coupon covers the full amount!' : 'This is a free event.'}
                </p>
                <button
                  onClick={() => {
                    // Direct registration for free events
                    handlePaymentSuccess();
                  }}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Complete Free Registration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 